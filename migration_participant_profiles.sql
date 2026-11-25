-- Run after migration_session_participants.sql.
begin;

create schema if not exists juleol_private;
revoke all on schema juleol_private from public;
grant usage on schema juleol_private to authenticated;

create table juleol_private.participant_profiles (
  session_id uuid not null,
  user_id uuid not null,
  answers text[] not null default array['', '', '', '']::text[],
  boundaries text not null default '',
  followups jsonb not null default '[]'::jsonb,
  ready boolean not null default false,
  pending_token uuid,
  pending_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id),
  foreign key (session_id, user_id) references public.session_participants(session_id, user_id) on delete cascade,
  check (cardinality(answers) = 4),
  check (jsonb_typeof(followups) = 'array' and jsonb_array_length(followups) <= 2),
  check ((pending_token is null) = (pending_at is null))
);

create index participant_profiles_ready_by_user on juleol_private.participant_profiles(user_id) where ready;
alter table juleol_private.participant_profiles enable row level security;
create policy profile_owner_access on juleol_private.participant_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on juleol_private.participant_profiles from public, anon, authenticated;
grant select, insert, update on juleol_private.participant_profiles to authenticated;

create function public.get_participant_profile(target uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.session_participants where session_id = target and user_id = auth.uid()
  ) then
    raise exception 'Ingen tilgang til profil' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'profile', (
      select jsonb_build_object('answers', p.answers, 'boundaries', p.boundaries,
        'followups', p.followups, 'ready', p.ready)
      from juleol_private.participant_profiles p where p.session_id = target and p.user_id = auth.uid()
    ),
    'previousAvailable', exists (
      select 1 from juleol_private.participant_profiles p join public.sessions s on s.id = p.session_id
      where p.user_id = auth.uid() and p.ready and s.created_at <
        (select created_at from public.sessions where id = target)
    )
  );
end;
$$;

create function public.save_participant_profile(
  target uuid, new_answers text[], new_boundaries text,
  new_followup_answers text[], new_ready boolean
) returns void language plpgsql security invoker set search_path = '' as $$
declare current_profile juleol_private.participant_profiles; revised_followups jsonb; item integer;
begin
  if auth.uid() is null or not exists (select 1 from public.session_participants where session_id = target and user_id = auth.uid()) then
    raise exception 'Ingen tilgang til profil' using errcode = '42501';
  end if;
  if new_answers is null or cardinality(new_answers) <> 4 or
     exists (select 1 from unnest(new_answers) answer where answer is null or length(answer) > 500) or
     new_boundaries is null or length(new_boundaries) > 1000 or
     new_followup_answers is null or
     exists (select 1 from unnest(new_followup_answers) answer where answer is null or length(answer) > 500) or
     new_ready is null then
    raise exception 'Ugyldig profil' using errcode = '22023';
  end if;
  if cardinality(new_followup_answers) = 0 then
    insert into juleol_private.participant_profiles(session_id, user_id)
      values (target, auth.uid()) on conflict do nothing;
  end if;
  select * into current_profile from juleol_private.participant_profiles
    where session_id = target and user_id = auth.uid() for update;
  if found then
    if current_profile.pending_at > now() - interval '90 seconds' then
      raise exception 'Vent til oppfølgingsspørsmålet er klart' using errcode = 'P0010';
    end if;
    if cardinality(new_followup_answers) <> jsonb_array_length(current_profile.followups) then
      raise exception 'Profilen har fått et nytt spørsmål. Last siden på nytt før du fortsetter.' using errcode = 'P0010';
    end if;
    revised_followups := current_profile.followups;
    for item in 1..cardinality(new_followup_answers) loop
      revised_followups := jsonb_set(revised_followups, array[(item - 1)::text, 'answer'], to_jsonb(new_followup_answers[item]));
    end loop;
    update juleol_private.participant_profiles set answers = new_answers, boundaries = new_boundaries,
      followups = revised_followups, ready = new_ready, updated_at = now()
      where session_id = target and user_id = auth.uid();
  else
    raise exception 'Ingen oppfølginger å besvare' using errcode = 'P0010';
  end if;
end;
$$;

create function public.reuse_participant_profile(target uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.session_participants where session_id = target and user_id = auth.uid()) then
    raise exception 'Ingen tilgang til profil' using errcode = '42501';
  end if;
  if exists (select 1 from juleol_private.participant_profiles where session_id = target and user_id = auth.uid()) then
    raise exception 'Profil finnes allerede' using errcode = 'P0010';
  end if;
  insert into juleol_private.participant_profiles(session_id, user_id, answers, boundaries, followups)
    select target, auth.uid(), p.answers, p.boundaries, p.followups
    from juleol_private.participant_profiles p join public.sessions e on e.id = p.session_id
    where p.user_id = auth.uid() and p.ready and e.created_at <
      (select current_session.created_at from public.sessions current_session where current_session.id = target)
    order by e.created_at desc, e.id desc limit 1;
  if not found then raise exception 'Ingen tidligere profil' using errcode = 'P0010'; end if;
end;
$$;

create function public.begin_profile_followup(target uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare profile juleol_private.participant_profiles; reservation uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.session_participants where session_id = target and user_id = auth.uid()) then
    raise exception 'Ingen tilgang til profil' using errcode = '42501';
  end if;
  select * into profile from juleol_private.participant_profiles
    where session_id = target and user_id = auth.uid() for update;
  if not found or jsonb_array_length(profile.followups) >= 2 or
     not exists (select 1 from unnest(profile.answers) answer where length(trim(answer)) > 0) or
     (profile.pending_at is not null and profile.pending_at > now() - interval '90 seconds') then
    raise exception 'Ingen oppfølging tilgjengelig' using errcode = 'P0010';
  end if;
  reservation := gen_random_uuid();
  update juleol_private.participant_profiles set pending_token = reservation, pending_at = now()
    where session_id = target and user_id = auth.uid();
  return jsonb_build_object('token', reservation, 'answers', profile.answers, 'followups', profile.followups);
end;
$$;

create function public.finish_profile_followup(target uuid, reservation uuid, question text) returns void
language plpgsql security invoker set search_path = '' as $$
declare profile juleol_private.participant_profiles;
begin
  select * into profile from juleol_private.participant_profiles
    where session_id = target and user_id = auth.uid() for update;
  if not found or profile.pending_token is null or profile.pending_token is distinct from reservation or
     profile.pending_at <= now() - interval '90 seconds' or
     not exists (select 1 from public.session_participants where session_id = target and user_id = auth.uid()) or
     jsonb_array_length(profile.followups) >= 2 then
    raise exception 'Oppfølgingen er endret' using errcode = 'P0010';
  end if;
  if question is null or length(trim(question)) not between 1 and 200 then
    raise exception 'Ugyldig spørsmål' using errcode = '22023';
  end if;
  update juleol_private.participant_profiles set
    followups = profile.followups || jsonb_build_array(jsonb_build_object('question', trim(question), 'answer', '')),
    pending_token = null, pending_at = null, ready = false, updated_at = now()
    where session_id = target and user_id = auth.uid();
end;
$$;

create function public.cancel_profile_followup(target uuid, reservation uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update juleol_private.participant_profiles set pending_token = null, pending_at = null
    where session_id = target and user_id = auth.uid() and pending_token = reservation;
end;
$$;

revoke all on function public.get_participant_profile(uuid),
  public.save_participant_profile(uuid, text[], text, text[], boolean),
  public.reuse_participant_profile(uuid), public.begin_profile_followup(uuid),
  public.finish_profile_followup(uuid, uuid, text), public.cancel_profile_followup(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_participant_profile(uuid),
  public.save_participant_profile(uuid, text[], text, text[], boolean),
  public.reuse_participant_profile(uuid), public.begin_profile_followup(uuid),
  public.finish_profile_followup(uuid, uuid, text), public.cancel_profile_followup(uuid, uuid) to authenticated;

commit;

-- Add session_participants table to track which users have joined which sessions
create table session_participants (
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (session_id, user_id)
);

-- Enable RLS
alter table session_participants enable row level security;

-- RLS Policies
create policy "Session participants are viewable by everyone."
  on session_participants for select
  using ( true );

create policy "Users can join sessions."
  on session_participants for insert
  with check ( auth.uid() = user_id );

create policy "Hosts can remove participants."
  on session_participants for delete
  using ( exists ( select 1 from sessions where id = session_participants.session_id and host_id = auth.uid() ) );

-- Automatically add host as participant when session is created
create or replace function add_host_as_participant()
returns trigger as $$
begin
  insert into session_participants (session_id, user_id)
  values (new.id, new.host_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_session_created
  after insert on sessions
  for each row execute procedure add_host_as_participant();

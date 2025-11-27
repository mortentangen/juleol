-- Combined migration: Allow participants to add beers and track who added them

-- 1. Add added_by column to session_beers
alter table session_beers 
add column if not exists added_by uuid references profiles(id);

-- 2. Drop existing restrictive policies
drop policy if exists "Hosts can manage session beers." on session_beers;
drop policy if exists "Hosts can manage session beers" on session_beers;
drop policy if exists "Participants can add session beers" on session_beers;

-- 3. Create a policy for hosts (full access)
create policy "Hosts can manage session beers"
  on session_beers
  for all
  using ( exists ( select 1 from sessions where id = session_beers.session_id and host_id = auth.uid() ) );

-- 4. Create a policy for participants (insert only)
create policy "Participants can add session beers"
  on session_beers
  for insert
  with check (
    exists (
      select 1 from session_participants
      where session_id = session_beers.session_id
      and user_id = auth.uid()
    )
    -- Ensure users can only claim they added it themselves
    and (added_by is null or added_by = auth.uid())
  );

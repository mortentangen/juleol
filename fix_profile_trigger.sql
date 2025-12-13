-- Replace the handle_new_user function with a more robust version
-- Run this in the Supabase SQL Editor

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_full_name text;
  user_avatar_url text;
begin
  -- Try to find the name in different metadata fields
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.email
  );

  -- Try to find the avatar in different metadata fields
  user_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, user_full_name, user_avatar_url)
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;
  
  return new;
end;
$$ language plpgsql security definer;

-- Ensure the trigger exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

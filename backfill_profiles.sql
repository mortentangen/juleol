-- Run this in the Supabase SQL Editor to fix existing users who are missing profiles

insert into public.profiles (id, full_name, avatar_url)
select 
  id, 
  coalesce(
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'name', 
    email
  ) as full_name,
  coalesce(
    raw_user_meta_data->>'avatar_url', 
    raw_user_meta_data->>'picture'
  ) as avatar_url
from auth.users
where id not in (select id from public.profiles);

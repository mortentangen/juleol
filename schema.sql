-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(full_name) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Beers Table
create table beers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  brewery text,
  style text,
  abv numeric,
  description text,
  image_url text,
  external_id text
);

alter table beers enable row level security;

create policy "Beers are viewable by everyone."
  on beers for select
  using ( true );

create policy "Authenticated users can insert beers."
  on beers for insert
  with check ( auth.role() = 'authenticated' );

-- Sessions Table
create table sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  date date default current_date,
  host_id uuid references profiles(id) not null,
  is_active boolean default true,
  join_code text unique
);

alter table sessions enable row level security;

create policy "Sessions are viewable by everyone."
  on sessions for select
  using ( true );

create policy "Authenticated users can create sessions."
  on sessions for insert
  with check ( auth.role() = 'authenticated' );

create policy "Hosts can update their sessions."
  on sessions for update
  using ( auth.uid() = host_id );

-- Session Beers (Many-to-Many)
create table session_beers (
  session_id uuid references sessions(id) on delete cascade not null,
  beer_id uuid references beers(id) on delete cascade not null,
  sorting_order int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (session_id, beer_id)
);

alter table session_beers enable row level security;

create policy "Session beers are viewable by everyone."
  on session_beers for select
  using ( true );

create policy "Hosts can manage session beers."
  on session_beers for all
  using ( exists ( select 1 from sessions where id = session_beers.session_id and host_id = auth.uid() ) );

-- Ratings Table
create table ratings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references profiles(id) not null,
  beer_id uuid references beers(id) not null,
  session_id uuid references sessions(id) not null,
  appearance int check (appearance between 0 and 5),
  aroma int check (aroma between 0 and 5),
  taste int check (taste between 0 and 10),
  mouthfeel int check (mouthfeel between 0 and 5),
  overall int check (overall between 0 and 10),
  comment text,
  
  unique(user_id, beer_id, session_id)
);

alter table ratings enable row level security;

create policy "Ratings are viewable by everyone."
  on ratings for select
  using ( true );

create policy "Users can insert their own ratings."
  on ratings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own ratings."
  on ratings for update
  using ( auth.uid() = user_id );

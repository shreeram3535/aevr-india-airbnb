-- Supabase schema for the Aevr marketplace MVP.
-- Run this in the Supabase SQL editor or through a migration.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    avatar_url text,
    role text not null default 'guest' check (role in ('guest', 'host', 'admin')),
    host_approval_status text not null default 'pending' check (host_approval_status in ('pending', 'approved', 'rejected')),
    host_reviewed_at timestamptz,
    host_reviewed_by uuid references public.profiles (id),
    host_review_note text,
    bio text,
    phone text,
    is_superhost boolean not null default false,
    is_verified_guest boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    label text not null,
    icon_name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.amenities (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    label text not null,
    icon_name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listings (
    id uuid primary key default gen_random_uuid(),
    host_id uuid not null references public.profiles (id) on delete cascade,
    category_id uuid not null references public.categories (id),
    host_name text,
    title text not null,
    description text not null,
    price_per_night numeric(12, 2) not null,
    currency text not null default 'INR',
    rating numeric(3, 2) not null default 0,
    review_count integer not null default 0,
    is_guest_favorite boolean not null default false,
    availability_summary text,
    room_types jsonb not null default '[]'::jsonb,
    map_link text,
    city text not null,
    country text not null,
    lat numeric(9, 6) not null,
    lng numeric(9, 6) not null,
    guest_count_max integer not null default 1,
    bedrooms integer not null default 1,
    beds integer not null default 1,
    baths numeric(3, 1) not null default 1,
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

-- Backfill columns for environments where listings existed before these fields were introduced.
alter table public.listings add column if not exists map_link text;
alter table public.listings add column if not exists room_types jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists host_name text;
alter table public.profiles add column if not exists host_approval_status text not null default 'pending' check (host_approval_status in ('pending', 'approved', 'rejected'));
alter table public.profiles add column if not exists host_reviewed_at timestamptz;
alter table public.profiles add column if not exists host_reviewed_by uuid references public.profiles (id);
alter table public.profiles add column if not exists host_review_note text;
alter table public.profiles add column if not exists is_verified_guest boolean not null default false;

update public.profiles
set host_approval_status = 'approved'
where role in ('admin', 'guest')
  and host_approval_status <> 'approved';

update public.profiles
set host_approval_status = 'approved'
where role = 'host'
  and host_approval_status is null;

create table if not exists public.listing_images (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    image_url text not null,
    media_kind text not null default 'image' check (media_kind in ('image', 'video')),
    source_type text not null default 'upload' check (source_type in ('upload', 'external')),
    provider text,
    embed_url text,
    thumbnail_url text,
    sort_order integer not null default 0,
    alt_text text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.listing_images add column if not exists media_kind text not null default 'image';
alter table public.listing_images add column if not exists source_type text not null default 'upload';
alter table public.listing_images add column if not exists provider text;
alter table public.listing_images add column if not exists embed_url text;
alter table public.listing_images add column if not exists thumbnail_url text;

create table if not exists public.listing_amenities (
    listing_id uuid not null references public.listings (id) on delete cascade,
    amenity_id uuid not null references public.amenities (id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    primary key (listing_id, amenity_id)
);

create table if not exists public.availability_blocks (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    start_date date not null,
    end_date date not null,
    reason text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint availability_blocks_valid_range check (start_date < end_date)
);

create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    guest_id uuid not null references public.profiles (id) on delete cascade,
    check_in date not null,
    check_out date not null,
    guest_count integer not null check (guest_count > 0),
    room_type_name text,
    room_type_price numeric(12, 2),
    room_count integer not null default 1 check (room_count > 0),
    subtotal numeric(12, 2) not null,
    fees numeric(12, 2) not null default 0,
    taxes numeric(12, 2) not null default 0,
    total numeric(12, 2) not null,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint bookings_valid_range check (check_in < check_out)
);

alter table public.bookings add column if not exists room_type_name text;
alter table public.bookings add column if not exists room_type_price numeric(12, 2);
alter table public.bookings add column if not exists room_count integer not null default 1;

create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    booking_id uuid not null unique references public.bookings (id) on delete cascade,
    guest_id uuid not null references public.profiles (id) on delete cascade,
    rating integer not null check (rating between 1 and 5),
    comment text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.favorites (
    user_id uuid not null references public.profiles (id) on delete cascade,
    listing_id uuid not null references public.listings (id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    primary key (user_id, listing_id)
);

create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    guest_id uuid not null references public.profiles (id) on delete cascade,
    host_id uuid not null references public.profiles (id) on delete cascade,
    last_message_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint conversations_unique_thread unique (listing_id, guest_id)
);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references public.conversations (id) on delete cascade,
    sender_id uuid not null references public.profiles (id) on delete cascade,
    body text not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payout_accounts (
    id uuid primary key default gen_random_uuid(),
    host_id uuid not null references public.profiles (id) on delete cascade,
    provider text not null,
    external_account_id text not null,
    status text not null default 'inactive' check (status in ('inactive', 'active', 'restricted')),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint payout_accounts_unique_provider unique (host_id, provider)
);

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update
set public = excluded.public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, avatar_url, role, host_approval_status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
        new.raw_user_meta_data ->> 'avatar_url',
        case
            when (new.raw_user_meta_data ->> 'role') in ('guest', 'host', 'admin') then (new.raw_user_meta_data ->> 'role')
            else 'guest'
        end,
        case
            when (new.raw_user_meta_data ->> 'role') = 'host' then 'pending'
            else 'approved'
        end
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create or replace function public.prevent_guest_verification_self_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.is_verified_guest is distinct from old.is_verified_guest then
        if not exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
        ) then
            raise exception 'Only admins can update guest verification';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_guest_verification_guard on public.profiles;
create trigger profiles_guest_verification_guard
before update of is_verified_guest on public.profiles
for each row execute procedure public.prevent_guest_verification_self_grant();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

drop trigger if exists amenities_updated_at on public.amenities;
create trigger amenities_updated_at
before update on public.amenities
for each row execute procedure public.set_updated_at();

drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at
before update on public.listings
for each row execute procedure public.set_updated_at();

drop trigger if exists listing_images_updated_at on public.listing_images;
create trigger listing_images_updated_at
before update on public.listing_images
for each row execute procedure public.set_updated_at();

drop trigger if exists availability_blocks_updated_at on public.availability_blocks;
create trigger availability_blocks_updated_at
before update on public.availability_blocks
for each row execute procedure public.set_updated_at();

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at
before update on public.bookings
for each row execute procedure public.set_updated_at();

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
before update on public.reviews
for each row execute procedure public.set_updated_at();

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
before update on public.conversations
for each row execute procedure public.set_updated_at();

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at
before update on public.messages
for each row execute procedure public.set_updated_at();

drop trigger if exists payout_accounts_updated_at on public.payout_accounts;
create trigger payout_accounts_updated_at
before update on public.payout_accounts
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.amenities enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.payout_accounts enable row level security;

drop policy if exists "Public read active profiles" on public.profiles;
create policy "Public read active profiles"
on public.profiles
for select
using (true);

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles
for update
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Public read active categories" on public.categories;
create policy "Public read active categories"
on public.categories
for select
using (is_active = true);

drop policy if exists "Public read active amenities" on public.amenities;
create policy "Public read active amenities"
on public.amenities
for select
using (is_active = true);

drop policy if exists "Public read active listings" on public.listings;
create policy "Public read active listings"
on public.listings
for select
using (is_active = true);

drop policy if exists "Hosts insert own listings" on public.listings;
create policy "Hosts insert own listings"
on public.listings
for insert
with check (
    auth.uid() = host_id
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'host'
          and p.host_approval_status = 'approved'
    )
);

drop policy if exists "Hosts update own listings" on public.listings;
create policy "Hosts update own listings"
on public.listings
for update
using (
    auth.uid() = host_id
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'host'
          and p.host_approval_status = 'approved'
    )
)
with check (
    auth.uid() = host_id
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'host'
          and p.host_approval_status = 'approved'
    )
);

drop policy if exists "Admins read all listings" on public.listings;
create policy "Admins read all listings"
on public.listings
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Admins insert listings" on public.listings;
create policy "Admins insert listings"
on public.listings
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Admins update listings" on public.listings;
create policy "Admins update listings"
on public.listings
for update
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Hosts delete own listings" on public.listings;
create policy "Hosts delete own listings"
on public.listings
for delete
using (
    auth.uid() = host_id
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'host'
          and p.host_approval_status = 'approved'
    )
);

drop policy if exists "Public read listing images for active listings" on public.listing_images;
create policy "Public read listing images for active listings"
on public.listing_images
for select
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Hosts manage own listing images" on public.listing_images;
create policy "Hosts manage own listing images"
on public.listing_images
for all
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
);

drop policy if exists "Admins manage listing images" on public.listing_images;
create policy "Admins manage listing images"
on public.listing_images
for all
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Public read listing amenities for active listings" on public.listing_amenities;
create policy "Public read listing amenities for active listings"
on public.listing_amenities
for select
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Hosts manage own listing amenities" on public.listing_amenities;
create policy "Hosts manage own listing amenities"
on public.listing_amenities
for all
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
);

drop policy if exists "Admins manage listing amenities" on public.listing_amenities;
create policy "Admins manage listing amenities"
on public.listing_amenities
for all
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Public read availability blocks for active listings" on public.availability_blocks;
create policy "Public read availability blocks for active listings"
on public.availability_blocks
for select
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Hosts manage own availability blocks" on public.availability_blocks;
create policy "Hosts manage own availability blocks"
on public.availability_blocks
for all
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
);

drop policy if exists "Admins manage availability blocks" on public.availability_blocks;
create policy "Admins manage availability blocks"
on public.availability_blocks
for all
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Guests read own bookings and hosts read related bookings" on public.bookings;
create policy "Guests read own bookings and hosts read related bookings"
on public.bookings
for select
using (
    auth.uid() = guest_id
    or exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.host_id = auth.uid()
    )
);

drop policy if exists "Guests create own bookings" on public.bookings;
create policy "Guests create own bookings"
on public.bookings
for insert
with check (auth.uid() = guest_id);

drop policy if exists "Booking owners update own bookings" on public.bookings;
create policy "Booking owners update own bookings"
on public.bookings
for update
using (auth.uid() = guest_id)
with check (auth.uid() = guest_id);

drop policy if exists "Public read reviews for active listings" on public.reviews;
create policy "Public read reviews for active listings"
on public.reviews
for select
using (
    exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Guests write own reviews" on public.reviews;
create policy "Guests write own reviews"
on public.reviews
for insert
with check (auth.uid() = guest_id);

drop policy if exists "Guests manage own reviews" on public.reviews;
create policy "Guests manage own reviews"
on public.reviews
for update
using (auth.uid() = guest_id)
with check (auth.uid() = guest_id);

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
on public.favorites
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Conversation participants read conversations" on public.conversations;
create policy "Conversation participants read conversations"
on public.conversations
for select
using (auth.uid() = guest_id or auth.uid() = host_id);

drop policy if exists "Conversation participants manage conversations" on public.conversations;
create policy "Conversation participants manage conversations"
on public.conversations
for all
using (auth.uid() = guest_id or auth.uid() = host_id)
with check (auth.uid() = guest_id or auth.uid() = host_id);

drop policy if exists "Message participants read messages" on public.messages;
create policy "Message participants read messages"
on public.messages
for select
using (
    exists (
        select 1
        from public.conversations c
        where c.id = thread_id
          and (c.guest_id = auth.uid() or c.host_id = auth.uid())
    )
);

drop policy if exists "Message participants write messages" on public.messages;
create policy "Message participants write messages"
on public.messages
for insert
with check (
    exists (
        select 1
        from public.conversations c
        where c.id = thread_id
          and (c.guest_id = auth.uid() or c.host_id = auth.uid())
    )
    and auth.uid() = sender_id
);

drop policy if exists "Hosts manage payout accounts" on public.payout_accounts;
create policy "Hosts manage payout accounts"
on public.payout_accounts
for all
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists "Public read listing images" on storage.objects;
create policy "Public read listing images"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "Authenticated upload listing images" on storage.objects;
create policy "Authenticated upload listing images"
on storage.objects
for insert
with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated update listing images" on storage.objects;
create policy "Authenticated update listing images"
on storage.objects
for update
using (bucket_id = 'listing-images' and auth.role() = 'authenticated')
with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated delete listing images" on storage.objects;
create policy "Authenticated delete listing images"
on storage.objects
for delete
using (bucket_id = 'listing-images' and auth.role() = 'authenticated');

create index if not exists listings_host_id_idx on public.listings (host_id);
create index if not exists listings_category_id_idx on public.listings (category_id);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listing_images_listing_id_idx on public.listing_images (listing_id, sort_order);
create index if not exists availability_blocks_listing_id_idx on public.availability_blocks (listing_id, start_date, end_date);
create index if not exists bookings_listing_id_idx on public.bookings (listing_id, check_in, check_out);
create index if not exists bookings_guest_id_idx on public.bookings (guest_id);
create index if not exists reviews_listing_id_idx on public.reviews (listing_id);
create index if not exists favorites_user_id_idx on public.favorites (user_id);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'bookings_no_overlap'
          and conrelid = 'public.bookings'::regclass
    ) then
        alter table public.bookings
            add constraint bookings_no_overlap
            exclude using gist (
                listing_id with =,
                daterange(check_in, check_out, '[)') with &&
            )
            where (status in ('pending', 'confirmed'));
    end if;
end
$$;

create table if not exists public.flash_sale_drops (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings (id) on delete cascade,
    sale_type text not null check (sale_type in ('percent', 'manual_price')),
    sale_value numeric(12, 2) not null check (sale_value > 0),
    start_at timestamptz not null,
    end_at timestamptz not null,
    is_active boolean not null default true,
    created_by uuid not null references public.profiles (id),
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint flash_sale_valid_window check (end_at > start_at)
);



drop trigger if exists flash_sale_drops_updated_at on public.flash_sale_drops;
create trigger flash_sale_drops_updated_at
before update on public.flash_sale_drops
for each row execute procedure public.set_updated_at();

alter table public.flash_sale_drops enable row level security;

create unique index if not exists flash_sale_single_active_idx
on public.flash_sale_drops ((is_active))
where is_active = true;

create index if not exists flash_sale_active_window_idx
on public.flash_sale_drops (is_active, start_at, end_at);

create index if not exists flash_sale_listing_id_idx
on public.flash_sale_drops (listing_id);

drop policy if exists "Public read active flash sale" on public.flash_sale_drops;
create policy "Public read active flash sale"
on public.flash_sale_drops
for select
using (
    is_active = true
    and start_at <= timezone('utc', now())
    and end_at > timezone('utc', now())
    and exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Admins read all flash sales" on public.flash_sale_drops;
create policy "Admins read all flash sales"
on public.flash_sale_drops
for select
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

drop policy if exists "Admins insert flash sale" on public.flash_sale_drops;
create policy "Admins insert flash sale"
on public.flash_sale_drops
for insert
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
    and exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
    and created_by = auth.uid()
);

drop policy if exists "Admins update flash sale" on public.flash_sale_drops;
create policy "Admins update flash sale"
on public.flash_sale_drops
for update
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
    and exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.is_active = true
    )
);

drop policy if exists "Admins delete flash sale" on public.flash_sale_drops;
create policy "Admins delete flash sale"
on public.flash_sale_drops
for delete
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);

-- Sample public data for local/dev Supabase projects.
-- Run schema.sql first, then create at least one Supabase auth user.
-- This script uses the first auth.users row as the sample approved host.

insert into public.categories (slug, label, icon_name, sort_order, is_active)
values
    ('icons', 'Icons', 'star', 10, true),
    ('rooms', 'Rooms', 'bed-double', 20, true),
    ('amazing-pools', 'Amazing pools', 'waves', 30, true),
    ('amazing-views', 'Amazing views', 'mountain', 40, true),
    ('farms', 'Farms', 'tractor', 50, true),
    ('cabins', 'Cabins', 'home', 60, true)
on conflict (slug) do update
set label = excluded.label,
    icon_name = excluded.icon_name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = timezone('utc', now());

insert into public.amenities (slug, label, icon_name, sort_order, is_active)
values
    ('wifi', 'Wifi', 'wifi', 10, true),
    ('pool', 'Pool', 'waves', 20, true),
    ('kitchen', 'Kitchen', 'chef-hat', 30, true),
    ('parking', 'Parking', 'car', 40, true),
    ('lake-view', 'Lake view', 'mountain', 50, true),
    ('breakfast', 'Breakfast', 'coffee', 60, true)
on conflict (slug) do update
set label = excluded.label,
    icon_name = excluded.icon_name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = timezone('utc', now());

do $$
declare
    sample_host uuid;
    pool_listing uuid;
    farm_listing uuid;
    cabin_listing uuid;
begin
    select id
    into sample_host
    from auth.users
    order by created_at
    limit 1;

    if sample_host is null then
        raise notice 'No auth user found. Create a Supabase auth user, then rerun supabase/seed_sample_listings.sql.';
        return;
    end if;

    insert into public.profiles (id, full_name, role, host_approval_status, bio, phone, is_superhost, is_verified_guest)
    values (
        sample_host,
        'AEVR Sample Host',
        'host',
        'approved',
        'Curated stays host for AEVR India demo listings.',
        '+91 90000 00000',
        true,
        true
    )
    on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name),
        role = 'host',
        host_approval_status = 'approved',
        bio = coalesce(public.profiles.bio, excluded.bio),
        phone = coalesce(public.profiles.phone, excluded.phone),
        is_superhost = true,
        is_verified_guest = true,
        updated_at = timezone('utc', now());

    insert into public.listings (
        host_id,
        category_id,
        host_name,
        title,
        description,
        price_per_night,
        currency,
        rating,
        review_count,
        is_guest_favorite,
        availability_summary,
        room_types,
        city,
        country,
        lat,
        lng,
        guest_count_max,
        bedrooms,
        beds,
        baths,
        is_active
    )
    select
        sample_host,
        (select id from public.categories where slug = 'amazing-pools'),
        'AEVR Sample Host',
        'Pool villa near Alibaug beach',
        'A bright private villa with a pool, garden seating, and quick access to the coast.',
        14800,
        'INR',
        4.91,
        86,
        true,
        'Available this weekend',
        '[{"id":"pool-suite","name":"Pool suite","pricePerNight":14800,"totalCount":2,"maxGuests":4,"beds":2,"description":"Private suite with pool access."}]'::jsonb,
        'Alibaug',
        'India',
        18.6414,
        72.8722,
        6,
        3,
        4,
        3,
        true
    where not exists (
        select 1 from public.listings where title = 'Pool villa near Alibaug beach'
    )
    returning id into pool_listing;

    if pool_listing is null then
        select id into pool_listing from public.listings where title = 'Pool villa near Alibaug beach' limit 1;
    end if;

    insert into public.listings (
        host_id,
        category_id,
        host_name,
        title,
        description,
        price_per_night,
        currency,
        rating,
        review_count,
        is_guest_favorite,
        availability_summary,
        room_types,
        city,
        country,
        lat,
        lng,
        guest_count_max,
        bedrooms,
        beds,
        baths,
        is_active
    )
    select
        sample_host,
        (select id from public.categories where slug = 'farms'),
        'AEVR Sample Host',
        'Organic farm stay outside Pune',
        'A calm farm stay with open lawns, fresh breakfast, and space for families.',
        7200,
        'INR',
        4.82,
        54,
        false,
        'Flexible dates',
        '[{"id":"farm-cottage","name":"Farm cottage","pricePerNight":7200,"totalCount":4,"maxGuests":3,"beds":2,"description":"Cottage room with garden access."}]'::jsonb,
        'Pune',
        'India',
        18.5204,
        73.8567,
        8,
        4,
        6,
        3,
        true
    where not exists (
        select 1 from public.listings where title = 'Organic farm stay outside Pune'
    )
    returning id into farm_listing;

    if farm_listing is null then
        select id into farm_listing from public.listings where title = 'Organic farm stay outside Pune' limit 1;
    end if;

    insert into public.listings (
        host_id,
        category_id,
        host_name,
        title,
        description,
        price_per_night,
        currency,
        rating,
        review_count,
        is_guest_favorite,
        availability_summary,
        room_types,
        city,
        country,
        lat,
        lng,
        guest_count_max,
        bedrooms,
        beds,
        baths,
        is_active
    )
    select
        sample_host,
        (select id from public.categories where slug = 'cabins'),
        'AEVR Sample Host',
        'Lakeview cabin in Lonavala',
        'A compact cabin with wide lake views, a small deck, and a quiet work corner.',
        9800,
        'INR',
        4.88,
        71,
        true,
        'Rare find',
        '[{"id":"lake-cabin","name":"Lake cabin","pricePerNight":9800,"totalCount":3,"maxGuests":2,"beds":1,"description":"Cabin room with lake-facing deck."}]'::jsonb,
        'Lonavala',
        'India',
        18.7546,
        73.4062,
        4,
        2,
        2,
        2,
        true
    where not exists (
        select 1 from public.listings where title = 'Lakeview cabin in Lonavala'
    )
    returning id into cabin_listing;

    if cabin_listing is null then
        select id into cabin_listing from public.listings where title = 'Lakeview cabin in Lonavala' limit 1;
    end if;

    insert into public.listing_images (listing_id, image_url, source_type, sort_order, alt_text)
    select image_seed.listing_id, image_seed.image_url, image_seed.source_type, image_seed.sort_order, image_seed.alt_text
    from (
        values
            (pool_listing, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80', 'external', 1, 'Pool villa exterior'),
            (farm_listing, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', 'external', 1, 'Green farm landscape'),
            (cabin_listing, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80', 'external', 1, 'Cabin beside a lake')
    ) as image_seed(listing_id, image_url, source_type, sort_order, alt_text)
    where not exists (
        select 1
        from public.listing_images existing
        where existing.listing_id = image_seed.listing_id
          and existing.image_url = image_seed.image_url
    );

    insert into public.listing_amenities (listing_id, amenity_id)
    select pool_listing, id from public.amenities where slug in ('wifi', 'pool', 'kitchen', 'parking')
    on conflict do nothing;

    insert into public.listing_amenities (listing_id, amenity_id)
    select farm_listing, id from public.amenities where slug in ('wifi', 'breakfast', 'parking')
    on conflict do nothing;

    insert into public.listing_amenities (listing_id, amenity_id)
    select cabin_listing, id from public.amenities where slug in ('wifi', 'lake-view', 'kitchen')
    on conflict do nothing;
end $$;

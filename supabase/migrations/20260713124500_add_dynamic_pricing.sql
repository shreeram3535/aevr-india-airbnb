alter table public.listings add column if not exists original_price numeric;
alter table public.listings add column if not exists discounted_price numeric;

update public.listings 
set 
    original_price = price_per_night,
    discounted_price = price_per_night
where original_price is null and discounted_price is null;

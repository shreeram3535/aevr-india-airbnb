# Flash Sale Guide

This guide explains how to set up and run a flash sale in Aevr.

## 1. Prerequisites

1. Supabase project is connected to this app.
2. You have run the latest `supabase/schema.sql` (includes `flash_sale_drops` table and RLS policies).
3. Your user has `admin` role in `public.profiles`.

## 2. What a flash sale does

- A single featured property is promoted at the top of Home.
- It shows:
  - `Verified by AevrLux` badge
  - Live countdown
  - Original price + sale price
- Each sale window runs for exactly **72 hours** from `start_at`.
- The sale auto-hides after expiry.

## 3. Open the flash sale admin screen

1. Sign in with an admin account.
2. Go to:
   - `Switch to hosting` area
   - then `/host/flash-sales`

If you are not admin, this page is blocked.

## 4. Create or update a flash sale

From the Flash Sale Control page:

1. Select a property.
2. Choose sale type:
   - `percent` (discount %)
   - `manual_price` (exact sale price)
3. Enter sale value.
4. Choose `Start at` datetime.
5. Click `Save & Activate`.

The app computes `end_at = start_at + 72 hours` automatically.

## 5. Deactivate a flash sale

- On the same admin page, click `Deactivate`.
- This marks `is_active = false`.

## 6. DB behavior and constraints

- Table: `public.flash_sale_drops`
- Trigger: `ensure_flash_sale_window()` enforces 72-hour window.
- Only one active drop at a time:
  - unique partial index on `is_active = true`
- Policies:
  - Public can read only currently active + in-window drops.
  - Admin can read/manage all drops.

## 7. Useful SQL checks (Supabase SQL editor)

### See current drop state

```sql
select id, listing_id, sale_type, sale_value, start_at, end_at, is_active, created_by
from public.flash_sale_drops
order by updated_at desc;
```

### See only currently visible drop

```sql
select id, listing_id, sale_type, sale_value, start_at, end_at
from public.flash_sale_drops
where is_active = true
  and start_at <= timezone('utc', now())
  and end_at > timezone('utc', now());
```

### Manually deactivate all active drops (admin maintenance)

```sql
update public.flash_sale_drops
set is_active = false
where is_active = true;
```

## 8. Troubleshooting

- "Only super admins can manage flash sales"
  - Your `profiles.role` is not `admin`.
- Save fails due to policy/permission
  - Confirm you are signed in and `profiles.id = auth.uid()` row has role `admin`.
- Sale not showing on Home
  - Check `start_at` is in the past, `end_at` is future, `is_active = true`, and listing is `is_active = true`.

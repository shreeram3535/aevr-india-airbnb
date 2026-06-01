# Roles and Admin Access Guide

This guide explains available roles and how to enable admin-only features.

## 1. Roles in this project

Roles are stored in `public.profiles.role` with allowed values:

- `guest`
- `host`
- `admin`

Defined in schema (check constraint on `profiles.role`).

For host anti-spam moderation, this project also uses:

- `public.profiles.host_approval_status`: `pending | approved | rejected`

## 2. What each role can do

### guest

- Browse listings and public data.
- Book stays and manage own bookings/favorites.

### host

- Can sign in to host mode.
- Can create/manage listings only when `host_approval_status = 'approved'`.
- Manage own listing images/amenities/availability.

### admin

- Has all regular signed-in access.
- Can access flash sale admin controls (`/host/flash-sales`).
- Can access host approval queue (`/host/host-approvals`).
- Can read/manage `public.flash_sale_drops` under RLS policies.
- Can approve/reject host onboarding applications.

## 3. View current users and roles

Run in Supabase SQL editor:

```sql
select id, full_name, role, created_at
from public.profiles
order by created_at desc;
```

## 4. Set a user as admin

Use one of the following approaches.

### Option A: By email (recommended)

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'you@example.com';
```

### Option B: By known profile id

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-USER-UUID-HERE';
```

## 5. Revert admin back to host/guest

```sql
update public.profiles
set role = 'host'
where id = 'YOUR-USER-UUID-HERE';
```

or

```sql
update public.profiles
set role = 'guest'
where id = 'YOUR-USER-UUID-HERE';
```

## 6. Verify admin access is working

1. Sign out and sign in again (refresh session).
2. Open `/host/flash-sales`.
3. You should see the Flash Sale Control page.

If blocked, verify role again:

```sql
select id, role
from public.profiles
where id = auth.uid();
```

## 7. Important notes

- `auth.users` and `public.profiles` are linked by the same user UUID.
- Role checks for flash sales are enforced in both UI and RLS policies.
- If you changed role directly in DB while logged in, re-login to avoid stale session behavior.

## 8. Host approval moderation SQL

### List pending host applications

```sql
select id, full_name, role, host_approval_status, created_at
from public.profiles
where role = 'host'
  and host_approval_status = 'pending'
order by created_at asc;
```

### Approve a host

```sql
update public.profiles
set host_approval_status = 'approved',
    host_reviewed_at = timezone('utc', now()),
    host_review_note = 'Approved by admin'
where id = 'HOST-USER-UUID-HERE'
  and role = 'host';
```

### Reject a host

```sql
update public.profiles
set host_approval_status = 'rejected',
    host_reviewed_at = timezone('utc', now()),
    host_review_note = 'Rejected by admin'
where id = 'HOST-USER-UUID-HERE'
  and role = 'host';
```

### Reset rejected host back to pending

```sql
update public.profiles
set host_approval_status = 'pending',
    host_reviewed_at = null,
    host_review_note = null
where id = 'HOST-USER-UUID-HERE'
  and role = 'host';
```

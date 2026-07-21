-- Migration to add discount_end_time column to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS discount_end_time TIMESTAMPTZ;

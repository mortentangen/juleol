-- Remove appearance and aroma columns from ratings table
ALTER TABLE ratings DROP COLUMN IF EXISTS appearance;
ALTER TABLE ratings DROP COLUMN IF EXISTS aroma;

-- Ratings now only have:
-- - taste (0-10)
-- - mouthfeel (0-5)
-- - overall (0-10)
-- - comment (text)

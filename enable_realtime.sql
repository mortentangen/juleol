-- Simplified Realtime Setup for ratings table
-- This only adds the table to the realtime publication

-- Add ratings table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;

-- Note: If you get an error that the table is already in the publication, that's fine - it means it's already configured!

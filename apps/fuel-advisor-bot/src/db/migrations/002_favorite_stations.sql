-- Add favorite_stations column to user_preferences
ALTER TABLE user_preferences ADD COLUMN favorite_stations TEXT DEFAULT '[]';

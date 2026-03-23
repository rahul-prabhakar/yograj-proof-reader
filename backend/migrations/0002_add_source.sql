-- Track whether a word came from the initial seed or was added/edited by the user.
-- 'seed'  = inserted during the automatic first-run seed
-- 'user'  = added or last modified by the user (these are exported)
ALTER TABLE words_to_replace ADD COLUMN source TEXT NOT NULL DEFAULT 'user';

-- Mark all existing rows (inserted before this migration) as seed words.
UPDATE words_to_replace SET source = 'seed';


-- Auto-correct dictionary: wrong_word → correct_word
CREATE TABLE IF NOT EXISTS words_to_replace (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    word                TEXT NOT NULL UNIQUE,
    to_be_replaced_with TEXT NOT NULL
);

-- Hindi word dictionary (used for spell-checking)
CREATE TABLE IF NOT EXISTS wardha (
    word  TEXT PRIMARY KEY,
    waise TEXT DEFAULT 'a'
);

-- Punctuation spacing rules
CREATE TABLE IF NOT EXISTS punctuation (
    word             TEXT PRIMARY KEY,
    space_before     INTEGER NOT NULL DEFAULT 0,
    space_after      INTEGER NOT NULL DEFAULT 0,
    clubbed_together INTEGER NOT NULL DEFAULT 0
);

-- Seed default punctuation rules
INSERT OR IGNORE INTO punctuation (word, space_before, space_after, clubbed_together) VALUES
    (',',  0, 1, 0),
    ('।',  0, 1, 1),   -- Hindi danda
    ('?',  0, 1, 1),
    ('!',  0, 1, 1),
    (''',  1, 0, 0),   -- left single quote
    (''',  0, 1, 0),   -- right single quote
    ('"',  1, 0, 0),   -- left double quote
    ('"',  0, 1, 0),   -- right double quote
    ('/',  0, 0, 0),
    ('-',  0, 0, 1),
    ('#',  1, 0, 0),
    ('(',  1, 0, 0),
    (')',  0, 1, 0);

-- Saved proofread sessions/reports
CREATE TABLE IF NOT EXISTS request (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    init_text  TEXT,
    final_text TEXT
);

-- App settings (key/value store)
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);


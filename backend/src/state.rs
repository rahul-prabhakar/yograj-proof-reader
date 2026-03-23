use anyhow::Result;
use dashmap::DashMap;
use sqlx::SqlitePool;
use std::sync::RwLock;

use crate::models::{Punctuation, Wardha, WordsToReplace};

pub struct SessionState {
    pub session_at_start: String,
    pub current_session: String,
}

pub struct AppState {
    pub pool: SqlitePool,
    /// word → replacement (for auto-correct)
    pub words_cache: DashMap<String, String>,
    /// Hindi dictionary words (for spell-check lookup)
    pub dictionary: DashMap<String, ()>,
    /// Punctuation rules cached at startup
    pub punctuation: RwLock<Vec<Punctuation>>,
    pub session: RwLock<SessionState>,
}

impl AppState {
    pub async fn new(pool: SqlitePool) -> Result<Self> {
        let words_cache: DashMap<String, String> = DashMap::new();
        let dictionary: DashMap<String, ()> = DashMap::new();

        // Load auto-correct word map
        let words = sqlx::query_as::<_, WordsToReplace>(
            "SELECT id, word, to_be_replaced_with FROM words_to_replace",
        )
        .fetch_all(&pool)
        .await?;
        for row in words {
            words_cache.insert(row.word, row.to_be_replaced_with);
        }

        // Load Hindi dictionary
        let dict_words = sqlx::query_as::<_, Wardha>("SELECT word FROM wardha")
            .fetch_all(&pool)
            .await?;
        for row in dict_words {
            dictionary.insert(row.word, ());
        }

        // Load punctuation rules
        let punct_rows =
            sqlx::query_as::<_, Punctuation>(
                "SELECT word, space_before, space_after, clubbed_together FROM punctuation",
            )
            .fetch_all(&pool)
            .await?;

        Ok(Self {
            pool,
            words_cache,
            dictionary,
            punctuation: RwLock::new(punct_rows),
            session: RwLock::new(SessionState {
                session_at_start: String::new(),
                current_session: String::new(),
            }),
        })
    }
}


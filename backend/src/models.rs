use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct WordsToReplace {
    pub id: i64,
    pub word: String,
    pub to_be_replaced_with: String,
}

#[derive(Debug, Deserialize)]
pub struct WordRequest {
    pub id: Option<i64>,
    pub word: String,
    #[serde(rename = "wordToBeReplacedWith")]
    pub word_to_be_replaced_with: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct Punctuation {
    pub word: String,
    pub space_before: i64,
    pub space_after: i64,
    pub clubbed_together: i64,
}

/// Hindi dictionary word (used for spell checking)
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Wardha {
    pub word: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct KalashRequest {
    pub id: i64,
    pub init_text: String,
    pub final_text: String,
}


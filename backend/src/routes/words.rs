use axum::{
    extract::{Multipart, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{error::AppResult, models::WordsToReplace, state::AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/getAllWords", get(get_all_words))
        .route("/addWord", get(add_word).post(add_word))
        .route("/deleteWord", get(delete_word))
        .route("/uploadCsv", post(upload_csv))
}

async fn get_all_words(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Vec<WordsToReplace>>> {
    let mut rows = sqlx::query_as::<_, WordsToReplace>(
        "SELECT id, word, to_be_replaced_with FROM words_to_replace ORDER BY to_be_replaced_with",
    )
    .fetch_all(&state.pool)
    .await?;

    rows.sort_by(|a, b| a.to_be_replaced_with.cmp(&b.to_be_replaced_with));
    Ok(Json(rows))
}

#[derive(Deserialize)]
struct WordQuery {
    id: Option<i64>,
    word: Option<String>,
    #[serde(rename = "wordToBeReplacedWith")]
    word_to_be_replaced_with: Option<String>,
}

async fn add_word(
    State(state): State<Arc<AppState>>,
    Query(params): Query<WordQuery>,
) -> AppResult<(StatusCode, Json<i64>)> {
    let word = params.word.unwrap_or_default();
    let replacement = params.word_to_be_replaced_with.unwrap_or_default();
    let id = params.id.unwrap_or(-1);

    let new_id: i64 = if id <= 0 {
        // Insert — always mark as 'user' source
        sqlx::query_scalar(
            "INSERT INTO words_to_replace (word, to_be_replaced_with, source) VALUES (?, ?, 'user')
             ON CONFLICT(word) DO UPDATE SET to_be_replaced_with = excluded.to_be_replaced_with, source = 'user'
             RETURNING id",
        )
        .bind(&word)
        .bind(&replacement)
        .fetch_one(&state.pool)
        .await?
    } else {
        // Update — mark as 'user' even if it was originally seeded
        sqlx::query_scalar(
            "UPDATE words_to_replace SET word=?, to_be_replaced_with=?, source='user' WHERE id=? RETURNING id",
        )
        .bind(&word)
        .bind(&replacement)
        .bind(id)
        .fetch_one(&state.pool)
        .await?
    };

    state.words_cache.insert(word, replacement);
    Ok((StatusCode::OK, Json(new_id)))
}

#[derive(Deserialize)]
struct IdQuery {
    id: i64,
}

async fn delete_word(
    State(state): State<Arc<AppState>>,
    Query(params): Query<IdQuery>,
) -> AppResult<StatusCode> {
    let word: Option<String> = sqlx::query_scalar(
        "DELETE FROM words_to_replace WHERE id=? RETURNING word",
    )
    .bind(params.id)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(w) = word {
        state.words_cache.remove(&w);
    }

    Ok(StatusCode::OK)
}

/// Upload a CSV file with two columns: word,replacement
async fn upload_csv(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> AppResult<Json<Vec<WordsToReplace>>> {
    let mut added: Vec<WordsToReplace> = Vec::new();

    while let Some(field) = multipart.next_field().await? {
        let data = field.bytes().await?;
        let content = String::from_utf8_lossy(&data);

        for line in content.lines() {
            let parts: Vec<&str> = line.splitn(2, ',').collect();
            if parts.len() < 2 { continue; }
            let word = parts[0].trim();
            let replacement = parts[1].trim();
            if word.is_empty() { continue; }

            let row: Option<WordsToReplace> = sqlx::query_as(
                "INSERT INTO words_to_replace (word, to_be_replaced_with) VALUES (?, ?)
                 ON CONFLICT(word) DO NOTHING
                 RETURNING id, word, to_be_replaced_with",
            )
            .bind(word)
            .bind(replacement)
            .fetch_optional(&state.pool)
            .await?;

            if let Some(r) = row {
                state.words_cache.insert(r.word.clone(), r.to_be_replaced_with.clone());
                added.push(r);
            }
        }
    }

    Ok(Json(added))
}


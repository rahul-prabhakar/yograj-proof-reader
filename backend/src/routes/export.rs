use axum::{extract::State, routing::get, Json, Router};
use std::sync::Arc;

use crate::{error::AppResult, models::WordsToReplace, state::AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/exportWords", get(export_words))
}

/// Returns all words that were added or edited by the user (source = 'user').
/// Seeded words that have never been touched are excluded.
async fn export_words(
    State(state): State<Arc<AppState>>,
) -> AppResult<Json<Vec<WordsToReplace>>> {
    let rows = sqlx::query_as::<_, WordsToReplace>(
        "SELECT id, word, to_be_replaced_with FROM words_to_replace
         WHERE source = 'user'
         ORDER BY to_be_replaced_with",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(rows))
}


use axum::{
    extract::{Query, State},
    routing::get,
    Router,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{error::AppResult, state::AppState};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/getSavedSession", get(get_saved_session))
        .route("/startSession", get(start_session))
        .route("/endSession", get(end_session))
}

async fn get_saved_session(State(state): State<Arc<AppState>>) -> String {
    state
        .session
        .read()
        .unwrap()
        .current_session
        .clone()
}

#[derive(Deserialize)]
struct WordsQuery {
    words: Option<String>,
}

async fn start_session(
    State(state): State<Arc<AppState>>,
    Query(params): Query<WordsQuery>,
) -> AppResult<String> {
    let words = params.words.unwrap_or_default();
    // Basic sanitisation: strip the &quot; escape that the Java code handled
    let cleaned = words.replace("&quot;", "'");

    let mut session = state.session.write().unwrap();
    session.session_at_start = cleaned.clone();
    session.current_session = cleaned.clone();

    Ok(cleaned)
}

async fn end_session(State(state): State<Arc<AppState>>) {
    let mut session = state.session.write().unwrap();
    session.session_at_start.clear();
    session.current_session.clear();
}


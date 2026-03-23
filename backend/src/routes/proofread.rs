use axum::{
    extract::State,
    routing::post,
    Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::{
    error::AppResult,
    html_utils::{markers_to_spans, rewrite_text_nodes},
    services,
    state::AppState,
};

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/punctuate", post(punctuate))
        .route("/autoCorrect", post(auto_correct))
        .route("/spellChecker", post(spell_check))
}

#[derive(Deserialize)]
struct WordsBody {
    words: Option<String>,
}

async fn punctuate(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WordsBody>,
) -> AppResult<String> {
    let html = body.words.unwrap_or_default();
    let html = strip_replaced_spans(&html);

    let rules = state.punctuation.read().unwrap().clone();

    let processed = rewrite_text_nodes(&html, move |text| {
        services::punctuator::process(text, &rules)
    })?;

    Ok(markers_to_spans(&processed))
}

async fn auto_correct(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WordsBody>,
) -> AppResult<String> {
    let html = body.words.unwrap_or_default();
    let html = strip_replaced_spans(&html);

    // Clone the cache snapshot for the closure
    let cache: dashmap::DashMap<String, String> = state
        .words_cache
        .iter()
        .map(|e| (e.key().clone(), e.value().clone()))
        .collect();

    let processed = rewrite_text_nodes(&html, move |text| {
        services::autocorrect::process(text, &cache)
    })?;

    Ok(markers_to_spans(&processed))
}

async fn spell_check(
    State(state): State<Arc<AppState>>,
    Json(body): Json<WordsBody>,
) -> AppResult<String> {
    let html = body.words.unwrap_or_default();
    let html = strip_replaced_spans(&html);

    let dict: dashmap::DashMap<String, ()> = state
        .dictionary
        .iter()
        .map(|e| (e.key().clone(), ()))
        .collect();

    let processed = rewrite_text_nodes(&html, move |text| {
        services::spellcheck::process(text, &dict)
    })?;

    Ok(markers_to_spans(&processed))
}

/// Remove previously highlighted spans (class="replaced") before re-processing,
/// keeping their inner text content so the word itself is preserved.
/// Uses a single regex that matches the full `<span … class="replaced" …>…</span>`
/// and replaces it with just the captured inner text — avoids stripping unrelated </span> tags.
fn strip_replaced_spans(html: &str) -> String {
    let re = regex::Regex::new(
        r#"(?s)<span\b[^>]*\bclass=['"]replaced['"][^>]*>(.*?)</span>"#,
    )
    .unwrap();
    re.replace_all(html, "$1").into_owned()
}


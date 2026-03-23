pub mod error;
pub mod html_utils;
pub mod models;
pub mod routes;
pub mod services;
pub mod state;

use std::sync::Arc;
use tower_http::cors::CorsLayer;

/// Seed the `words_to_replace` table from a remote JSON endpoint.
///
/// Only runs when the table is **empty** and the `SEED_URL` environment
/// variable is set. The endpoint must return a JSON array of objects with
/// `"word"` and `"toBeReplacedWith"` fields.
async fn seed_words_if_empty(pool: &sqlx::SqlitePool) -> anyhow::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM words_to_replace")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        tracing::info!("Skipping seed: words_to_replace already has {count} rows.");
        return Ok(());
    }

    let seed_url = match std::env::var("SEED_URL") {
        Ok(u) if !u.is_empty() => u,
        _ => {
            tracing::info!("SEED_URL not set — skipping initial word seed.");
            return Ok(());
        }
    };

    tracing::info!("Seeding words_to_replace from {seed_url} …");

    #[derive(serde::Deserialize)]
    struct SeedWord {
        word: String,
        #[serde(rename = "toBeReplacedWith")]
        to_be_replaced_with: String,
    }

    let words: Vec<SeedWord> = reqwest::get(&seed_url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to fetch seed URL: {e}"))?
        .json()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to parse seed JSON: {e}"))?;

    let total = words.len();
    tracing::info!("Fetched {total} words — inserting …");

    let mut tx = pool.begin().await?;
    for w in &words {
        sqlx::query(
            "INSERT OR IGNORE INTO words_to_replace (word, to_be_replaced_with, source) VALUES (?, ?, 'seed')",
        )
        .bind(&w.word)
        .bind(&w.to_be_replaced_with)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    tracing::info!("Seed complete: {total} words inserted into words_to_replace.");
    Ok(())
}

/// Starts the Axum server. Call this from main or from the Tauri setup hook.
pub async fn run_server() -> anyhow::Result<()> {
    // Default to a SQLite file called kalash.db in the current directory.
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:kalash.db".to_string());

    // Ensure the SQLite file is created if it does not yet exist.
    let opts = database_url
        .parse::<sqlx::sqlite::SqliteConnectOptions>()?
        .create_if_missing(true);

    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;

    // Run SQL migrations on startup
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Seed from remote URL on first run (no-op if table already has rows)
    if let Err(e) = seed_words_if_empty(&pool).await {
        tracing::warn!("Word seed failed (continuing anyway): {e}");
    }

    let app_state = Arc::new(state::AppState::new(pool).await?);

    let app = axum::Router::new()
        .merge(routes::session::router())
        .merge(routes::proofread::router())
        .merge(routes::words::router())
        .merge(routes::export::router())
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!("Kalash backend listening on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}


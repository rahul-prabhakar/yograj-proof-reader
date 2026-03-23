use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::new(
                std::env::var("RUST_LOG")
                    .unwrap_or_else(|_| "kalash_backend=debug,tower_http=info".into()),
            ),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    kalash_backend::run_server().await
}

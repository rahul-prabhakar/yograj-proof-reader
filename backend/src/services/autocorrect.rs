use dashmap::DashMap;
use regex::Regex;

/// Replace known mis-spellings with their corrections.
/// Matched words are wrapped in `{{correction}}` so the UI can highlight them.
///
/// `words_cache`: word → replacement mapping loaded from the database.
pub fn process(text: &str, words_cache: &DashMap<String, String>) -> String {
    let mut result = text.to_string();

    for entry in words_cache.iter() {
        let word = entry.key();
        let replacement = entry.value();

        if !result.contains(word.as_str()) {
            continue;
        }

        // Build a Unicode-aware word-boundary regex.
        // \b in Rust's regex crate respects Unicode when unicode feature is on (default).
        let escaped = regex::escape(word);
        if let Ok(re) = Regex::new(&format!(r"(?u)\b{escaped}\b")) {
            let highlighted = format!("{{{{{}}}}}", replacement);
            result = re.replace_all(&result, highlighted.as_str()).into_owned();
        }
    }

    result
}


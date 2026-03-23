use dashmap::DashMap;
use regex::Regex;

/// Check every word in `text` against the dictionary.
/// Words not found in the dictionary are wrapped in `[[word]]` so the UI can highlight them.
///
/// `dictionary`: set of valid Hindi words (word → ()).
pub fn process(text: &str, dictionary: &DashMap<String, ()>) -> String {
    let mut result = text.to_string();

    // Split on whitespace and hyphens, mirroring the Java implementation
    let words: Vec<&str> = text.split(|c: char| c.is_whitespace() || c == '-').collect();

    for word in words {
        // Skip pure numbers
        if word.chars().all(|c| c.is_ascii_digit()) || word.is_empty() {
            continue;
        }

        if !dictionary.contains_key(word) {
            let escaped = regex::escape(word);
            if let Ok(re) = Regex::new(&format!(r"(?u)\b{escaped}\b")) {
                let highlighted = format!("[[{word}]]");
                result = re.replace_all(&result, highlighted.as_str()).into_owned();
            }
        }
    }

    result
}


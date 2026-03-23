use crate::models::Punctuation;

/// Applies punctuation fixes to a plain-text string extracted from an HTML text node.
/// Rules are loaded from the Punctuation table at startup and passed in as a slice.
pub fn process(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();

    s = fix_dandis(s);
    s = adjust_quotes(s);
    s = add_spaces_after(&s, rules);
    s = add_spaces_before(&s, rules);
    s = remove_spaces_before(&s, rules);
    s = remove_spaces_after(&s, rules);
    s = adjust_clubbed_together(&s, rules);
    s = remove_multiple_spaces(s);

    s
}

/// Replace ASCII `I` and `l` (Hindi danda placeholders used on legacy keyboards) with ।
fn fix_dandis(mut s: String) -> String {
    for placeholder in &["I", "l"] {
        s = s.replace(placeholder, "\u{0964}");
    }
    s
}

/// Convert straight quotes to Unicode curly quotes, tracking open/close state.
/// Also enforces correct spacing:
///   - no space immediately after an opening quote  (" word  →  "word)
///   - no space immediately before a closing quote  (word "  →  word")
fn adjust_quotes(text: String) -> String {
    let mut s = text
        .replace('\u{2018}', "'")
        .replace('\u{2019}', "'")
        .replace("''", "\"")
        .replace('\u{201C}', "\"")
        .replace('\u{201D}', "\"");

    // Process double-quotes
    s = toggle_quotes(s, '"', '\u{201C}', '\u{201D}');
    // Process single-quotes
    s = toggle_quotes(s, '\'', '\u{2018}', '\u{2019}');

    // Fix spacing: strip space after opening quote and before closing quote
    s = s.replace("\u{201C} ", "\u{201C}"); // " word  →  "word
    s = s.replace(" \u{201D}", "\u{201D}"); // word "  →  word"
    s = s.replace("\u{2018} ", "\u{2018}"); // ' word  →  'word
    s = s.replace(" \u{2019}", "\u{2019}"); // word '  →  word'

    s
}

fn toggle_quotes(text: String, plain: char, open: char, close: char) -> String {
    let mut result = String::with_capacity(text.len());
    let mut opened = false;
    for ch in text.chars() {
        if ch == plain {
            result.push(if !opened { open } else { close });
            opened = !opened;
        } else {
            result.push(ch);
        }
    }
    result
}

fn add_spaces_after(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();
    for r in rules.iter().filter(|r| r.space_after == 1) {
        s = s.replace(&r.word, &format!("{} ", r.word));
    }
    s
}

fn add_spaces_before(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();
    for r in rules.iter().filter(|r| r.space_before == 1) {
        s = s.replace(&r.word, &format!(" {}", r.word));
    }
    s
}

fn remove_spaces_before(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();
    for r in rules.iter().filter(|r| r.space_before == 0) {
        s = s.replace(&format!(" {}", r.word), &r.word);
    }
    s
}

fn remove_spaces_after(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();
    for r in rules.iter().filter(|r| r.space_after == 0) {
        s = s.replace(&format!("{} ", r.word), &r.word);
    }
    s
}

fn adjust_clubbed_together(text: &str, rules: &[Punctuation]) -> String {
    let mut s = text.to_string();
    for r in rules.iter().filter(|r| r.clubbed_together == 1) {
        let spaced = format!("{} {}", r.word, r.word);
        let together = format!("{}{}", r.word, r.word);
        s = s.replace(&spaced, &together);
    }
    s
}

fn remove_multiple_spaces(mut s: String) -> String {
    s = s.replace('\u{00A0}', " "); // nbsp → space
    // Collapse runs of spaces
    while s.contains("  ") {
        s = s.replace("  ", " ");
    }
    s
}


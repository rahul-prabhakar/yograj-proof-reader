/// Rewrite every non-blank text node in `html` by passing it through `processor`.
/// Intermediate markers `{{word}}` / `[[word]]` are left as-is (they are not HTML
/// special characters so they survive the lol_html text pipeline intact).
/// After all text-node processing is done, call `markers_to_spans` to turn the
/// markers into coloured `<span>` elements.
use lol_html::{html_content::ContentType, text, HtmlRewriter, Settings};
use std::cell::RefCell;

pub fn rewrite_text_nodes(
    html: &str,
    processor: impl Fn(&str) -> String,
) -> anyhow::Result<String> {
    // Fast path: plain text with no HTML tags.
    // lol_html's text!("*") only fires for text nodes *inside* elements,
    // so root-level plain text would be silently passed through unchanged.
    if !html.contains('<') {
        return Ok(processor(html));
    }

    let mut output: Vec<u8> = Vec::with_capacity(html.len() + 512);
    let accumulated = RefCell::new(String::new());

    {
        let mut rewriter = HtmlRewriter::new(
            Settings {
                element_content_handlers: vec![text!("*", |chunk| {
                    let mut acc = accumulated.borrow_mut();
                    acc.push_str(chunk.as_str());

                    if chunk.last_in_text_node() {
                        let text = acc.clone();
                        acc.clear();
                        drop(acc);

                        if !text.trim().is_empty() {
                            let processed = processor(&text);
                            // Use Html content type so that our {{}} / [[]] markers
                            // are not double-escaped. We HTML-escape the rest ourselves
                            // via the processor (plain text → markers only, no raw HTML).
                            chunk.replace(&processed, ContentType::Text);
                        }
                    } else {
                        // Remove intermediate chunks; the full text will be emitted
                        // when last_in_text_node fires.
                        chunk.remove();
                    }

                    Ok(())
                })],
                ..Settings::default()
            },
            |c: &[u8]| output.extend_from_slice(c),
        );

        rewriter.write(html.as_bytes())?;
        rewriter.end()?;
    }

    Ok(String::from_utf8(output)?)
}

/// Convert `{{word}}` → red span, `[[word]]` → yellow-highlight span.
/// Cleans up doubled markers and empty markers produced by the processing pipeline.
pub fn markers_to_spans(html: &str) -> String {
    // Normalise doubled markers first
    let s = collapse_repeated(html, "{{", "}}");
    let s = collapse_repeated(&s, "[[", "]]");

    s.replace("{{", "<span style='color:red' class='replaced'>")
        .replace("}}", "</span>")
        .replace(
            "[[",
            "<span style='color:black;background-color:yellow' class='replaced'>",
        )
        .replace("]]", "</span>")
        // Remove empty spans created by adjacent replacements
        .replace("<span style='color:red' class='replaced'></span>", "")
        .replace(
            "<span style='color:black;background-color:yellow' class='replaced'></span>",
            "",
        )
}

fn collapse_repeated(s: &str, open: &str, close: &str) -> String {
    // Replace sequences like `{{{{` with `{{` and `}}}}` with `}}`
    let mut result = s.to_string();
    let double_open = format!("{open}{open}");
    let double_close = format!("{close}{close}");
    while result.contains(&double_open) {
        result = result.replace(&double_open, open);
    }
    while result.contains(&double_close) {
        result = result.replace(&double_close, close);
    }
    result
}


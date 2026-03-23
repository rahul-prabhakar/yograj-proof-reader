const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export const GEMINI_KEY_STORAGE = 'kalash-gemini-key'

export function getStoredApiKey(): string {
  return localStorage.getItem(GEMINI_KEY_STORAGE) ?? ''
}

export function saveApiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim())
}

// ── Token-efficient helpers ───────────────────────────────────────────────────

/**
 * Single shared system instruction sent as a separate field.
 * The Gemini API processes this outside the user-turn token budget,
 * so it is not counted as part of the input text tokens per request.
 */
const SYSTEM_INSTRUCTION =
  'You are a professional Hindi text editor. ' +
  'Return ONLY the processed Hindi text. No explanations, no commentary, no markdown formatting.'

/** Strip HTML tags to get plain text for the prompt. */
function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.innerText.trim()
}

/** Wrap plain-text lines back into <p> tags for the editor. */
function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => `<p>${l}</p>`)
    .join('')
}

/**
 * Low-level Gemini call.
 * @param userMessage  The task directive + text (user-turn only — keep short).
 * @param maxOutputTokens  Hard cap on output length to avoid runaway charges.
 */
async function callGemini(userMessage: string, maxOutputTokens = 2048): Promise<string> {
  const key = getStoredApiKey()
  if (!key) {
    throw new Error('Gemini API key सेट नहीं है। कृपया सेटिंग्स पृष्ठ में API key डालें।')
  }

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // System instruction is a separate field — NOT counted in the user-turn
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg: string = err?.error?.message ?? `HTTP ${res.status}`
    if (res.status === 400) throw new Error(`अमान्य अनुरोध: ${msg}`)
    if (res.status === 403) throw new Error('API key अमान्य है या अनुमति नहीं है।')
    if (res.status === 429) throw new Error('API सीमा समाप्त हो गई। कुछ देर बाद पुनः प्रयास करें।')
    throw new Error(`Gemini त्रुटि: ${msg}`)
  }

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini से कोई उत्तर नहीं मिला।')
  return text
}

// ── Built-in AI actions ───────────────────────────────────────────────────────

export async function grammarCorrect(html: string): Promise<string> {
  const text = htmlToText(html)
  // Output capped to roughly same length as input — grammar fixes don't add bulk
  const result = await callGemini(`व्याकरण, वर्तनी और विराम चिह्न सुधारें, मूल अर्थ और शैली रखें:\n\n${text}`, 2048)
  return textToHtml(result)
}

export async function expandText(html: string): Promise<string> {
  const text = htmlToText(html)
  // Expansion can be up to ~2× the input, cap at 4096
  const result = await callGemini(`पाठ को विस्तृत करें, उचित विवरण और उदाहरण जोड़ें, विषय और शैली समान रखें:\n\n${text}`, 4096)
  return textToHtml(result)
}

export async function formalizeText(html: string): Promise<string> {
  const text = htmlToText(html)
  // Same length as input — just a style rewrite
  const result = await callGemini(`सरकारी/आधिकारिक पत्र शैली में पुनर्लिखें:\n\n${text}`, 2048)
  return textToHtml(result)
}

export async function summarize(html: string): Promise<string> {
  const text = htmlToText(html)
  // Summary is always short — cap at 512
  const result = await callGemini(`2–3 वाक्यों में मुख्य बिंदुओं का सारांश लिखें:\n\n${text}`, 512)
  return textToHtml(result)
}

// ── Custom prompt ─────────────────────────────────────────────────────────────

/**
 * Apply any user-defined instruction to the editor text.
 * The instruction replaces the built-in task directive — the user is fully in control.
 */
export async function customPromptAction(html: string, instruction: string): Promise<string> {
  const text = htmlToText(html)
  const result = await callGemini(`${instruction.trim()}:\n\n${text}`, 4096)
  return textToHtml(result)
}


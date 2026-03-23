import axios from 'axios'

// In Tauri, the webview can't use relative URLs (no Vite proxy).
// We hit the embedded backend directly on localhost:8080.
const BASE = 'http://localhost:8080'

export const api = axios.create({ baseURL: BASE })

export interface Word {
  id: number
  word: string
  to_be_replaced_with: string
}

// ── Proofreading ──────────────────────────────────────────────────────────────

export const punctuate = (html: string) =>
  api.post<string>('/punctuate', { words: html }).then((r) => r.data)

export const autoCorrect = (html: string) =>
  api.post<string>('/autoCorrect', { words: html }).then((r) => r.data)

export const spellCheck = (html: string) =>
  api.post<string>('/spellChecker', { words: html }).then((r) => r.data)

// ── Session ───────────────────────────────────────────────────────────────────

export const getSavedSession = () =>
  api.get<string>('/getSavedSession').then((r) => r.data)

export const startSession = (words: string) =>
  api.get<string>('/startSession', { params: { words } }).then((r) => r.data)

export const endSession = () =>
  api.get('/endSession')

// ── Words CRUD ────────────────────────────────────────────────────────────────

export const getAllWords = () =>
  api.get<Word[]>('/getAllWords').then((r) => r.data)

export const addWord = (word: string, wordToBeReplacedWith: string, id?: number) =>
  api
    .get<number>('/addWord', { params: { word, wordToBeReplacedWith, id } })
    .then((r) => r.data)

export const deleteWord = (id: number) =>
  api.get('/deleteWord', { params: { id } })

export const uploadCsv = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<Word[]>('/uploadCsv', form).then((r) => r.data)
}

// ── Export ────────────────────────────────────────────────────────────────────

export const exportWords = () =>
  api.get<Word[]>('/exportWords').then((r) => r.data)


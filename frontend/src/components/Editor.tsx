import { useEffect, useRef, useState } from 'react'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { dirname } from '@tauri-apps/api/path'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import GavelIcon from '@mui/icons-material/Gavel'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import SpellcheckIcon from '@mui/icons-material/Spellcheck'
import TextIncreaseIcon from '@mui/icons-material/TextIncrease'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import SummarizeIcon from '@mui/icons-material/Summarize'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SendIcon from '@mui/icons-material/Send'
import { punctuate, autoCorrect } from '../api/client'
import { grammarCorrect, expandText, formalizeText, summarize, customPromptAction, getStoredApiKey } from '../api/gemini'

/** Convert the editor's innerHTML into docx Paragraph objects, preserving bold/italic. */
function htmlToParagraphs(html: string): Paragraph[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const result: Paragraph[] = []

  function toRuns(node: Node, bold = false, italics = false): TextRun[] {
    const runs: TextRun[] = []
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? ''
        if (text) runs.push(new TextRun({ text, bold, italics, font: 'Mangal' }))
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        const tag = el.tagName.toLowerCase()
        const isBold = bold || tag === 'b' || tag === 'strong'
        const isItalics = italics || tag === 'i' || tag === 'em'
        runs.push(...toRuns(el, isBold, isItalics))
      }
    }
    return runs
  }

  function processNode(node: Node): void {
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div'].includes(tag)) {
      const runs = toRuns(el)
      result.push(new Paragraph({ children: runs.length ? runs : [new TextRun('')] }))
    } else if (tag === 'br') {
      result.push(new Paragraph({ children: [new TextRun('')] }))
    } else {
      for (const child of Array.from(el.childNodes)) processNode(child)
    }
  }

  for (const child of Array.from(doc.body.childNodes)) processNode(child)
  return result.length ? result : [new Paragraph({ children: [new TextRun('')] })]
}

const EDITOR_STORAGE_KEY = 'kalash-editor-content'

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })
  const [customPrompt, setCustomPrompt] = useState('')
  // Re-read from localStorage every render so it picks up key saved in Settings tab
  const hasGeminiKey = !!getStoredApiKey()

  // Restore saved content on first mount (handles app restarts)
  useEffect(() => {
    const saved = localStorage.getItem(EDITOR_STORAGE_KEY)
    if (saved && editorRef.current) {
      editorRef.current.innerHTML = saved
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  /** Persist content immediately (after programmatic changes). */
  const saveToStorage = (html: string) => {
    localStorage.setItem(EDITOR_STORAGE_KEY, html)
  }

  /** Debounced save — used by the onInput handler while the user types. */
  const debouncedSave = (html: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveToStorage(html), 500)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset the input so the same file can be re-imported later
    e.target.value = ''

    setLoading('आयात')
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      if (editorRef.current) {
        editorRef.current.innerHTML = result.value
        saveToStorage(result.value)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'फ़ाइल आयात विफल रही।')
    } finally {
      setLoading(null)
    }
  }

  const handleExport = async () => {
    const html = editorRef.current?.innerHTML ?? ''
    if (!html.trim()) {
      setSnackbar({ open: true, message: 'संपादक खाली है — निर्यात के लिए कुछ पाठ लिखें।', severity: 'error' })
      return
    }

    // Open native save dialog — returns null if user cancels
    const filePath = await save({
      defaultPath: 'kalash-export.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    if (!filePath) return  // user cancelled

    setLoading('निर्यात')
    try {
      const paragraphs = htmlToParagraphs(html)
      const doc = new Document({ sections: [{ children: paragraphs }] })
      const blob = await Packer.toBlob(doc)
      const buffer = await blob.arrayBuffer()
      await writeFile(filePath, new Uint8Array(buffer))
      // Show success before opening the folder — so a Finder error never hides it
      setSnackbar({ open: true, message: `सहेजा: ${filePath}`, severity: 'success' })
      try { await openPath(await dirname(filePath)) } catch { /* ignore */ }
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'निर्यात विफल रहा।', severity: 'error' })
    } finally {
      setLoading(null)
    }
  }

  const getHtml = () => editorRef.current?.innerHTML ?? ''
  const setHtml = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html
      saveToStorage(html)
    }
  }

  const run = async (label: string, fn: (html: string) => Promise<string>) => {
    setLoading(label)
    setError(null)
    try {
      const result = await fn(getHtml())
      setHtml(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(null)
    }
  }

  const busy = !!loading

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      {/* Hidden file input for .docx import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Rich-text editing area — fixed height with scroll */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          position: 'relative',
          height: '52vh',
          mt: 1.5,
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(57,73,171,0.15)' },
        }}
      >
        {/* Processing overlay */}
        {busy && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backdropFilter: 'blur(2px)',
              backgroundColor: 'rgba(255,255,255,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              borderRadius: 'inherit',
            }}
          >
            <CircularProgress size={48} thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
              {loading}… कृपया प्रतीक्षा करें
            </Typography>
          </Box>
        )}

        {/* Indeterminate progress bar at the top edge */}
        {busy && (
          <LinearProgress
            sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: '8px 8px 0 0', zIndex: 11 }}
          />
        )}

        <Box
          ref={editorRef}
          contentEditable={!busy}
          suppressContentEditableWarning
          dir="auto"
          onInput={() => debouncedSave(editorRef.current?.innerHTML ?? '')}
          sx={{
            flex: 1,
            p: 2,
            overflowY: 'auto',
            fontSize: '1.2rem',
            lineHeight: 2,
            outline: 'none',
            fontFamily: "'Noto Sans Devanagari', 'Mangal', sans-serif",
            color: 'text.primary',
            '&:empty::before': {
              content: '"यहाँ हिंदी पाठ लिखें…"',
              color: 'text.disabled',
            },
            '& .autocorrect': { backgroundColor: '#C8E6C9', borderRadius: '3px', px: '2px' },
          }}
        />
      </Paper>

      {/* Action buttons — below the text box */}
      <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Left: import / export */}
        <Tooltip title=".docx फ़ाइल आयात करें (मौजूदा पाठ बदल जाएगा)">
          <span>
            <Button
              variant="outlined"
              startIcon={busy && loading === 'आयात' ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              .docx आयात
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="पाठ को .docx फ़ाइल में सहेजें">
          <span>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={busy && loading === 'निर्यात' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={busy}
            >
              .docx निर्यात
            </Button>
          </span>
        </Tooltip>

        {/* Right: proofing actions */}
        <ButtonGroup variant="contained" disableElevation disabled={busy} sx={{ ml: 'auto' }}>
          <Tooltip title="विराम चिह्नों को सुधारें">
            <Button
              startIcon={busy && loading === 'विराम चिह्न' ? <CircularProgress size={16} color="inherit" /> : <GavelIcon />}
              onClick={() => run('विराम चिह्न', punctuate)}
              color="primary"
            >
              विराम चिह्न
            </Button>
          </Tooltip>
          <Tooltip title="शब्दों को स्वतः सुधारें">
            <Button
              startIcon={busy && loading === 'स्वतः सुधार' ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
              onClick={() => run('स्वतः सुधार', autoCorrect)}
              color="success"
            >
              स्वतः सुधार
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Paper>

      {/* AI actions row */}
      <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
            <SmartToyIcon fontSize="small" color="secondary" />
            <Typography variant="caption" fontWeight={600} color="secondary">AI</Typography>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          </Box>

          <Tooltip title={hasGeminiKey ? 'AI से व्याकरण और वर्तनी सुधारें' : 'पहले सेटिंग्स में Gemini API key सेट करें'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={busy || !hasGeminiKey}
                startIcon={busy && loading === 'व्याकरण सुधार' ? <CircularProgress size={14} color="inherit" /> : <SpellcheckIcon />}
                onClick={() => run('व्याकरण सुधार', grammarCorrect)}
              >
                व्याकरण सुधार
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={hasGeminiKey ? 'पाठ को विस्तृत करें' : 'पहले सेटिंग्स में Gemini API key सेट करें'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={busy || !hasGeminiKey}
                startIcon={busy && loading === 'पाठ विस्तार' ? <CircularProgress size={14} color="inherit" /> : <TextIncreaseIcon />}
                onClick={() => run('पाठ विस्तार', expandText)}
              >
                पाठ विस्तार
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={hasGeminiKey ? 'पाठ को औपचारिक भाषा में बदलें' : 'पहले सेटिंग्स में Gemini API key सेट करें'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={busy || !hasGeminiKey}
                startIcon={busy && loading === 'औपचारिक' ? <CircularProgress size={14} color="inherit" /> : <WorkspacePremiumIcon />}
                onClick={() => run('औपचारिक', formalizeText)}
              >
                औपचारिक बनाएं
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={hasGeminiKey ? 'पाठ का सारांश बनाएं' : 'पहले सेटिंग्स में Gemini API key सेट करें'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={busy || !hasGeminiKey}
                startIcon={busy && loading === 'सारांश' ? <CircularProgress size={14} color="inherit" /> : <SummarizeIcon />}
                onClick={() => run('सारांश', summarize)}
              >
                सारांश
              </Button>
            </span>
          </Tooltip>

          {!hasGeminiKey && (
            <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', fontStyle: 'italic' }}>
              सेटिंग्स में API key जोड़ें
            </Typography>
          )}

          {/* Custom prompt row */}
          <Divider flexItem sx={{ my: 0.5, width: '100%' }} />
          <Tooltip title={hasGeminiKey ? 'कोई भी निर्देश लिखें और AI से पाठ प्रोसेस करें' : 'पहले सेटिंग्स में Gemini API key सेट करें'}>
            <TextField
              size="small"
              fullWidth
              disabled={busy || !hasGeminiKey}
              placeholder="कस्टम AI निर्देश लिखें… (जैसे: इस पाठ को कविता में बदलें)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                  e.preventDefault()
                  run('कस्टम', (html) => customPromptAction(html, customPrompt.trim()))
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        color="secondary"
                        disabled={busy || !hasGeminiKey || !customPrompt.trim()}
                        onClick={() => run('कस्टम', (html) => customPromptAction(html, customPrompt.trim()))}
                      >
                        {busy && loading === 'कस्टम'
                          ? <CircularProgress size={16} color="inherit" />
                          : <SendIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Tooltip>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}


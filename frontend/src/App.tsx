import { useMemo, useState } from 'react'
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  IconButton,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material'
import EditNoteIcon from '@mui/icons-material/EditNote'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import DownloadIcon from '@mui/icons-material/Download'
import SettingsIcon from '@mui/icons-material/Settings'
import CloseIcon from '@mui/icons-material/Close'
import { getCurrentWindow } from '@tauri-apps/api/window'
import Editor from './components/Editor'
import WordsManager from './components/WordsManager'
import ExportManager from './components/ExportManager'
import Settings from './components/Settings'

export interface ThemePreset {
  key: string
  label: string
  primary: string
  secondary: string
}

export const THEMES: ThemePreset[] = [
  { key: 'indigo',  label: 'इंडिगो',  primary: '#3949AB', secondary: '#FF8F00' },
  { key: 'teal',    label: 'नीलमणि',  primary: '#00897B', secondary: '#FF5722' },
  { key: 'purple',  label: 'जामुनी',  primary: '#7B1FA2', secondary: '#00BCD4' },
  { key: 'blue',    label: 'नीला',    primary: '#1565C0', secondary: '#FF6F00' },
  { key: 'green',   label: 'हरा',     primary: '#2E7D32', secondary: '#FF8F00' },
  { key: 'rose',    label: 'गुलाबी',  primary: '#AD1457', secondary: '#FFC107' },
]

function buildTheme(darkMode: boolean, preset: ThemePreset) {
  return createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: preset.primary },
      secondary: { main: preset.secondary },
      background: darkMode
        ? { default: '#121212', paper: '#1E1E1E' }
        : { default: '#F0F2F8' },
    },
    typography: {
      fontFamily: "'Noto Sans Devanagari', 'Roboto', sans-serif",
      h6: { fontWeight: 700 },
    },
    shape: { borderRadius: 10 },
  })
}

export default function App() {
  const [tab, setTab] = useState(0)

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    localStorage.getItem('kalash-dark-mode') === 'true'
  )

  const [themeKey, setThemeKey] = useState<string>(() =>
    localStorage.getItem('kalash-theme') ?? 'indigo'
  )

  const preset = useMemo(
    () => THEMES.find((t) => t.key === themeKey) ?? THEMES[0],
    [themeKey]
  )

  const theme = useMemo(() => buildTheme(darkMode, preset), [darkMode, preset])

  const handleToggleDarkMode = (value: boolean) => {
    setDarkMode(value)
    localStorage.setItem('kalash-dark-mode', String(value))
  }

  const handleChangeTheme = (key: string) => {
    setThemeKey(key)
    localStorage.setItem('kalash-theme', key)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default', borderRadius: '12px', overflow: 'hidden' }}>
        {/* App Bar — fixed so it stays at top while content scrolls */}
        <AppBar position="fixed" elevation={2}>
          <Toolbar
            data-tauri-drag-region
            sx={{ bgcolor: 'rgba(0,0,0,0.25)', minHeight: '48px !important', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
          >
            <EditNoteIcon sx={{ mr: 1.5, fontSize: 24, pointerEvents: 'none' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 0.5, fontSize: '1rem', pointerEvents: 'none' }}>
              योगराज प्रूफ रीडर
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6, mr: 1, pointerEvents: 'none' }}>
              Kalash v0.1
            </Typography>
            <Tooltip title="बंद करें">
              <IconButton
                size="small"
                onClick={() => getCurrentWindow().close()}
                sx={{ color: 'inherit', opacity: 0.75, '&:hover': { opacity: 1, bgcolor: 'rgba(255,0,0,0.35)' } }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ px: 2 }}
          >
            <Tab icon={<EditNoteIcon />} iconPosition="start" label="संपादक" />
            <Tab icon={<MenuBookIcon />} iconPosition="start" label="शब्द कोश" />
            <Tab icon={<DownloadIcon />} iconPosition="start" label="निर्यात" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="सेटिंग्स" />
          </Tabs>
        </AppBar>

        {/* Spacer — pushes content below the fixed AppBar */}
        <Box sx={{ minHeight: '96px' }} />

        {/* Content — fills remaining height and scrolls */}
        <Container maxWidth="xl" sx={{ flex: 1, py: 3, overflowY: 'auto' }}>
          {/* Editor is always mounted so its DOM (and text) survives tab switches.
              CSS display:none hides it without unmounting. */}
          <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
            <Editor />
          </Box>
          {tab === 1 && <WordsManager />}
          {tab === 2 && <ExportManager />}
          {tab === 3 && (
            <Settings
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              themeKey={themeKey}
              onChangeTheme={handleChangeTheme}
              themes={THEMES}
            />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}


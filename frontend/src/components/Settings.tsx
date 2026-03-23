import { useState } from 'react'
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import SettingsIcon from '@mui/icons-material/Settings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import SaveIcon from '@mui/icons-material/Save'
import InfoIcon from '@mui/icons-material/Info'
import type { ThemePreset } from '../App'
import { getStoredApiKey, saveApiKey } from '../api/gemini'

interface Props {
  darkMode: boolean
  onToggleDarkMode: (value: boolean) => void
  themeKey: string
  onChangeTheme: (key: string) => void
  themes: ThemePreset[]
}

export default function Settings({ darkMode, onToggleDarkMode, themeKey, onChangeTheme, themes }: Props) {
  const [apiKey, setApiKey] = useState<string>(() => getStoredApiKey())
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveKey = () => {
    saveApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <SettingsIcon color="primary" fontSize="large" />
        <Typography variant="h5" fontWeight={700}>सेटिंग्स</Typography>
      </Box>

      {/* Appearance card */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: 'primary.main' }}>
          <Typography variant="subtitle1" fontWeight={700} color="white">दिखावट</Typography>
        </Box>

        {/* Dark mode toggle */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => onToggleDarkMode(e.target.checked)}
                color="secondary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                {darkMode
                  ? <DarkModeIcon fontSize="small" color="secondary" />
                  : <LightModeIcon fontSize="small" color="action" />}
                <Box>
                  <Typography variant="body1" fontWeight={500}>डार्क मोड</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {darkMode ? 'डार्क थीम सक्रिय है' : 'लाइट थीम सक्रिय है'}
                  </Typography>
                </Box>
              </Box>
            }
            labelPlacement="end"
            sx={{ ml: 0, width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse' }}
          />
        </Box>

        <Divider />

        {/* Theme colour picker */}
        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body1" fontWeight={500} mb={0.5}>रंग थीम</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            प्राथमिक रंग चुनें — डार्क और लाइट दोनों मोड पर लागू होगा।
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {themes.map((t) => {
              const selected = t.key === themeKey
              return (
                <Tooltip key={t.key} title={t.label} arrow>
                  <Box
                    onClick={() => onChangeTheme(t.key)}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: t.primary,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: selected ? '3px solid' : '3px solid transparent',
                      borderColor: selected ? 'text.primary' : 'transparent',
                      outline: selected ? '2px solid' : '2px solid transparent',
                      outlineColor: selected ? t.primary : 'transparent',
                      outlineOffset: '2px',
                      transition: 'all 0.15s ease',
                      '&:hover': { transform: 'scale(1.12)' },
                    }}
                  >
                    {selected && <CheckIcon sx={{ color: '#fff', fontSize: 20 }} />}
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            आपकी प्राथमिकता स्वचालित रूप से सहेजी जाती है।
          </Typography>
        </Box>
      </Paper>

      {/* AI / Gemini card */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', mt: 3 }}>
        <Box sx={{ px: 3, py: 2, bgcolor: 'secondary.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon sx={{ color: 'white', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700} color="white">AI सुविधाएँ (Gemini)</Typography>
          </Box>
        </Box>

        <Box sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body1" fontWeight={500} mb={0.5}>Google Gemini API Key</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            AI सुविधाओं (व्याकरण सुधार, पाठ विस्तार आदि) के लिए आवश्यक है।{' '}
            <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">
              Google AI Studio से मुफ़्त key लें
            </Link>
          </Typography>

          <TextField
            fullWidth
            size="small"
            type={showKey ? 'text' : 'password'}
            placeholder="AIza…"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSaved(false) }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowKey((v) => !v)} edge="end">
                    {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
            }}
            sx={{ mb: 1.5 }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={saved ? <CheckIcon /> : <SaveIcon />}
            color={saved ? 'success' : 'secondary'}
            onClick={handleSaveKey}
            disabled={!apiKey.trim()}
          >
            {saved ? 'सहेजा गया ✓' : 'Key सहेजें'}
          </Button>
        </Box>

        <Divider />
        <Box sx={{ px: 3, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            API key केवल आपके डिवाइस पर स्थानीय रूप से सहेजी जाती है। यह कभी सर्वर पर नहीं भेजी जाती।
          </Typography>
        </Box>
      </Paper>

      {/* About card */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', mt: 3 }}>
        <Box sx={{ px: 3, py: 2, bgcolor: 'primary.dark' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon sx={{ color: 'white', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700} color="white">परिचय</Typography>
          </Box>
        </Box>

        <Box sx={{ px: 3, py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="primary">
            योगराज प्रूफ रीडर
          </Typography>
          <Typography variant="body2" color="text.secondary">
            हिंदी प्रूफरीडिंग के लिए एक आधुनिक डेस्कटॉप अनुप्रयोग
          </Typography>

          <Divider flexItem sx={{ my: 0.5 }} />

          <Box>
            <Typography variant="body2" color="text.primary" fontWeight={500}>
              निर्मित: Rahul Prabhakar
            </Typography>
            <Typography variant="caption" color="text.secondary">
              © 2026 · सर्वाधिकार सुरक्षित
            </Typography>
          </Box>

          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.disabled">
              Kalash v0.1 · Tauri v2 · React · Rust
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}


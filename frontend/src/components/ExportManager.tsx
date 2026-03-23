import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'
import { dirname } from '@tauri-apps/api/path'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { exportWords } from '../api/client'

const FILENAME = 'kalash-words.xlsx'

export default function ExportManager() {
  const { data: words = [], isLoading, isError } = useQuery({
    queryKey: ['exportWords'],
    queryFn: exportWords,
  })

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const pagedWords = words.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const handleExport = async () => {
    const filePath = await save({
      defaultPath: FILENAME,
      filters: [{ name: 'Excel Spreadsheet', extensions: ['xlsx'] }],
    })
    if (!filePath) return  // user cancelled

    try {
      const rows = words.map((w) => ({
        'गलत शब्द': w.word,
        'सही शब्द': w.to_be_replaced_with,
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'शब्द')

      ws['!cols'] = [
        { wch: Math.max(12, ...words.map((w) => w.word.length)) },
        { wch: Math.max(12, ...words.map((w) => w.to_be_replaced_with.length)) },
      ]

      const buffer: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      await writeFile(filePath, new Uint8Array(buffer))
      setSnackbar({ open: true, message: `सहेजा: ${filePath}`, severity: 'success' })
      try { await openPath(await dirname(filePath)) } catch { /* ignore */ }
    } catch (err) {
      console.error(err)
      setSnackbar({ open: true, message: 'डाउनलोड विफल रहा।', severity: 'error' })
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" color="primary">निर्यात</Typography>
          <Typography variant="body2" color="text.secondary">
            Seed के बाद जोड़े या बदले गए शब्द — कुल {words.length}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          endIcon={<FolderOpenIcon fontSize="small" />}
          onClick={handleExport}
          disabled={isLoading || words.length === 0}
        >
          Excel डाउनलोड करें
        </Button>
      </Box>

      {isError && (
        <Alert severity="error">शब्द लोड नहीं हो सके।</Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : words.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">
            अभी तक कोई शब्द नहीं जोड़ा या बदला गया है।
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                    गलत शब्द
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
                    सही शब्द
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedWords.map((w) => (
                  <TableRow key={w.id} hover>
                    <TableCell sx={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                      {w.word}
                    </TableCell>
                    <TableCell sx={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                      {w.to_be_replaced_with}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={words.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="प्रति पृष्ठ:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </Paper>
      )}

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


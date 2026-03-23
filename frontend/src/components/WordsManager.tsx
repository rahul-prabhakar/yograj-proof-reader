import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { getAllWords, addWord, deleteWord, uploadCsv } from '../api/client'
import type { Word } from '../api/client'

export default function WordsManager() {
  const qc = useQueryClient()
  const { data: words = [], isLoading } = useQuery({ queryKey: ['words'], queryFn: getAllWords })

  const [form, setForm] = useState({ id: -1, word: '', replacement: '' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const fileRef = useRef<HTMLInputElement>(null)

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['words'] }), [qc])

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return words
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.to_be_replaced_with.toLowerCase().includes(q)
    )
  }, [words, search])

  const pagedWords = useMemo(
    () => filteredWords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredWords, page, rowsPerPage]
  )

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(0) // reset to first page on new search
  }

  const saveMut = useMutation({
    mutationFn: () => addWord(form.word, form.replacement, form.id > 0 ? form.id : undefined),
    onSuccess: () => { setForm({ id: -1, word: '', replacement: '' }); invalidate() },
  })

  const delMut = useMutation({
    mutationFn: (id: number) => deleteWord(id),
    onSuccess: invalidate,
  })

  const uploadMut = useMutation({
    mutationFn: (f: File) => uploadCsv(f),
    onSuccess: () => { if (fileRef.current) fileRef.current.value = ''; invalidate() },
  })

  const edit = (w: Word) => setForm({ id: w.id, word: w.word, replacement: w.to_be_replaced_with })
  const cancelEdit = () => setForm({ id: -1, word: '', replacement: '' })

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%', alignItems: 'flex-start' }}>

      {/* ── Left column: form + CSV upload ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 300, flexShrink: 0 }}>
        <Typography variant="h6" color="primary">शब्द प्रबंधन</Typography>

        {/* Add / Edit form */}
        <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            {form.id > 0 ? 'शब्द अपडेट करें' : 'नया शब्द जोड़ें'}
          </Typography>
          <Stack direction="column" gap={2}
            component="form" onSubmit={(e) => { e.preventDefault(); saveMut.mutate() }}>
            <TextField
              label="गलत शब्द"
              size="small"
              fullWidth
              value={form.word}
              onChange={(e) => setForm({ ...form, word: e.target.value })}
              required
              slotProps={{ input: { style: { fontFamily: "'Noto Sans Devanagari', sans-serif" } } }}
            />
            <TextField
              label="सही शब्द"
              size="small"
              fullWidth
              value={form.replacement}
              onChange={(e) => setForm({ ...form, replacement: e.target.value })}
              required
              slotProps={{ input: { style: { fontFamily: "'Noto Sans Devanagari', sans-serif" } } }}
            />
            <Stack direction="row" gap={1}>
              <Button type="submit" variant="contained" startIcon={<AddCircleIcon />}
                disabled={saveMut.isPending} fullWidth>
                {saveMut.isPending ? <CircularProgress size={18} color="inherit" /> : (form.id > 0 ? 'अपडेट करें' : 'जोड़ें')}
              </Button>
              {form.id > 0 && (
                <Button variant="outlined" color="inherit" startIcon={<CloseIcon />} onClick={cancelEdit}>
                  रद्द
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Divider />

        {/* CSV Upload */}
        <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">CSV आयात</Typography>
          <Stack direction="column" gap={1}>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}
              disabled={uploadMut.isPending} fullWidth>
              CSV चुनें
              <input type="file" accept=".csv" ref={fileRef} hidden
                onChange={() => { if (fileRef.current?.files?.[0]) uploadMut.mutate(fileRef.current.files[0]) }} />
            </Button>
            {uploadMut.isPending && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
            {uploadMut.isSuccess && <Alert severity="success" sx={{ py: 0 }}>अपलोड सफल!</Alert>}
            {uploadMut.isError && <Alert severity="error" sx={{ py: 0 }}>अपलोड विफल</Alert>}
          </Stack>
        </Paper>
      </Box>

      {/* ── Right column: search + table ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>

        {/* Search bar */}
        <TextField
          placeholder="शब्द खोजें…"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          slotProps={{
            input: {
              style: { fontFamily: "'Noto Sans Devanagari', sans-serif" },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleSearchChange('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Words table */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>गलत शब्द</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>सही शब्द</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white', width: 100 }}>क्रिया</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedWords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        {search ? `"${search}" के लिए कोई शब्द नहीं मिला` : 'कोई शब्द नहीं मिला'}
                      </TableCell>
                    </TableRow>
                  ) : pagedWords.map((w) => (
                    <TableRow key={w.id} hover>
                      <TableCell sx={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{w.word}</TableCell>
                      <TableCell sx={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>{w.to_be_replaced_with}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="संपादित करें">
                          <IconButton size="small" color="primary" onClick={() => edit(w)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="हटाएँ">
                          <IconButton size="small" color="error" onClick={() => delMut.mutate(w.id)}
                            disabled={delMut.isPending}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredWords.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="प्रति पृष्ठ:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />
          </Paper>
        )}
      </Box>
    </Box>
  )
}


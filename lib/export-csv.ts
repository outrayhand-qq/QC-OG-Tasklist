type ExportableTask = {
  id: string
  created_at: string
  kategori?: string
  pic_assignment?: string
  priority?: string
  status?: string
  deadline?: string
  detail_task?: string
  feedback?: string
  bukti_url?: string
}

export function exportTasksToCSV(tasks: ExportableTask[], fileNamePrefix = 'Tasklist_Export') {
  if (!tasks || tasks.length === 0) {
    alert('Tidak ada data task untuk diekspor!')
    return
  }

  // Header kolom
  const headers = [
    'No',
    'ID Task',
    'Tanggal Dibuat',
    'Kategori Pilar',
    'PIC Assignment',
    'Prioritas',
    'Status',
    'Deadline (SLA)',
    'Deskripsi Tugas',
    'History Feedback / Tindak Lanjut',
    'Link Referensi',
  ]

  // Bersihkan teks: bungkus quote dan ubah baris baru/enter jadi spasi agar tidak merusak baris sheet
  const escapeCell = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""'
    const str = String(val)
      .replace(/"/g, '""') // escape double quotes
      .replace(/\r?\n|\r/g, ' | ') // ubah enter feedback menjadi pemisah " | "
    return `"${str}"`
  }

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return '-'
    if (dateStr.includes('T')) {
      const parts = dateStr.split('T')
      const datePart = parts[0] || ''
      const timePart = parts[1] || ''
      const [year, month, day] = datePart.split('-')
      return `${day}/${month}/${year} ${timePart}`
    }
    return dateStr
  }

  const formatCreatedAt = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return dateStr
    }
  }

  // Mapping baris
  const rows = tasks.map((t, index) => [
    escapeCell(index + 1),
    escapeCell(t.id),
    escapeCell(formatCreatedAt(t.created_at)),
    escapeCell(t.kategori || 'Daily Task Operasional'),
    escapeCell(t.pic_assignment || '-'),
    escapeCell(t.priority || 'Medium'),
    escapeCell(t.status || 'Open'),
    escapeCell(formatDeadline(t.deadline)),
    escapeCell(t.detail_task || '-'),
    escapeCell(t.feedback || '-'),
    escapeCell(t.bukti_url || '-'),
  ])

  // Gunakan koma (,) standar Google Sheets/Excel + UTF-8 BOM (\uFEFF)
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const now = new Date()
  const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  link.setAttribute('href', url)
  link.setAttribute('download', `${fileNamePrefix}_${dateStamp}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { exportTasksToCSV } from '@/lib/export-csv'

type Task = {
  id: string
  created_at: string
  detail_task: string
  pic_assignment: string
  status: string
  deadline: string
  priority: string
  kategori: string
  feedback?: string
  bukti_url?: string
}

const CATEGORIES = [
  'Daily Task Operasional',
  'Monitoring',
  'Reporting & Administrasi',
  'Eskalasi',
  'Meeting',
] as const

const PICS = ['Manager QC&OG', 'TL QC', 'TL Outgoing']
const ALL_PICS = [
  'Manager QC&OG',
  'TL QC',
  'TL Outgoing',
  'Staff QC',
  'Staff Klaim',
  'Staff CSO',
  'Staff CC',
]
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

export default function TeamLeaderConsole() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [selectedDivisi, setSelectedDivisi] = useState<'All' | 'TL QC' | 'TL OG'>('All')
  const [selectedKategori, setSelectedKategori] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedPriority, setSelectedPriority] = useState<string>('All')
  const [selectedPicFilter, setSelectedPicFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [detailTask, setDetailTask] = useState('')
  const [selectedPics, setSelectedPics] = useState<string[]>([])
  const [kategori, setKategori] = useState<string>(CATEGORIES[0])
  const [priority, setPriority] = useState('Medium')
  const [deadline, setDeadline] = useState('')
  const [feedback, setFeedback] = useState('')
  const [buktiUrl, setBuktiUrl] = useState('')

  const [editDetailTask, setEditDetailTask] = useState('')
  const [editPics, setEditPics] = useState<string[]>([])
  const [editKategori, setEditKategori] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editFeedback, setEditFeedback] = useState('')
  const [editBuktiUrl, setEditBuktiUrl] = useState('')

  const fetchTasks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('db_tasklist')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setTasks(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleAddFeedbackLog = async (taskId: string, newEntry: string) => {
    const cleanEntry = newEntry.trim()
    if (!cleanEntry) return

    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    const timeStamp = `[${day}/${month} ${hours}:${mins}]`

    const targetTask = tasks.find((t) => t.id === taskId)
    const currentFeedback = targetTask?.feedback ? targetTask.feedback.trim() : ''

    const updatedFeedback = currentFeedback
      ? `${currentFeedback}\n${timeStamp} ${cleanEntry}`
      : `${timeStamp} ${cleanEntry}`

    const { error } = await supabase
      .from('db_tasklist')
      .update({
        feedback: updatedFeedback,
        last_updated: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, feedback: updatedFeedback } : t))
      )
      const inputEl = document.getElementById(`new-feedback-${taskId}`) as HTMLInputElement | null
      if (inputEl) inputEl.value = ''
    } else {
      alert('Gagal menambah tindak lanjut: ' + error.message)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailTask || selectedPics.length === 0) {
      alert('Detail task dan minimal 1 PIC wajib diisi!')
      return
    }

    const { error } = await supabase.from('db_tasklist').insert([
      {
        detail_task: detailTask,
        pic_assignment: selectedPics.join(', '),
        kategori: kategori,
        priority: priority,
        deadline: deadline || null,
        feedback: feedback || null,
        bukti_url: buktiUrl || null,
        status: 'Open',
      },
    ])

    if (!error) {
      setDetailTask('')
      setSelectedPics([])
      setDeadline('')
      setFeedback('')
      setBuktiUrl('')
      setIsCreateModalOpen(false)
      fetchTasks()
    } else {
      alert('Gagal menambah task: ' + error.message)
    }
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setEditDetailTask(task.detail_task || '')
    setEditPics(task.pic_assignment ? task.pic_assignment.split(', ') : [])
    setEditKategori(task.kategori || CATEGORIES[0])
    setEditPriority(task.priority || 'Medium')
    setEditFeedback(task.feedback || '')
    setEditBuktiUrl(task.bukti_url || '')
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    const { error } = await supabase
      .from('db_tasklist')
      .update({
        detail_task: editDetailTask,
        pic_assignment: editPics.join(', '),
        kategori: editKategori,
        priority: editPriority,
        feedback: editFeedback || null,
        bukti_url: editBuktiUrl || null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', editingTask.id)

    if (!error) {
      setEditingTask(null)
      fetchTasks()
    } else {
      alert('Gagal memperbarui task: ' + error.message)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('db_tasklist')
      .update({ status: newStatus, last_updated: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetchTasks()
  }

  const togglePic = (pic: string, isEdit = false) => {
    if (isEdit) {
      setEditPics((prev) =>
        prev.includes(pic) ? prev.filter((p) => p !== pic) : [...prev, pic]
      )
    } else {
      setSelectedPics((prev) =>
        prev.includes(pic) ? prev.filter((p) => p !== pic) : [...prev, pic]
      )
    }
  }

  const scopedTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isQC = t.pic_assignment?.toLowerCase().includes('qc')
      const isOG =
        t.pic_assignment?.toLowerCase().includes('outgoing') ||
        t.pic_assignment?.toLowerCase().includes('og')

      const matchesDivisi =
        selectedDivisi === 'All'
          ? true
          : selectedDivisi === 'TL QC'
          ? isQC
          : isOG

      const matchesPic =
        selectedPicFilter === 'All' || t.pic_assignment?.includes(selectedPicFilter)

      return matchesDivisi && matchesPic
    })
  }, [tasks, selectedDivisi, selectedPicFilter])

  const stats = useMemo(() => {
    const now = new Date()
    const total = scopedTasks.length
    const open = scopedTasks.filter((t) => t.status === 'Open').length
    const progress = scopedTasks.filter((t) => t.status === 'On Progress').length
    const closed = scopedTasks.filter((t) => t.status === 'Closed').length
    const urgent = scopedTasks.filter(
      (t) => t.priority === 'Urgent' && t.status !== 'Closed'
    ).length
    const overdue = scopedTasks.filter((t) => {
      if (t.status === 'Closed' || !t.deadline) return false
      const deadlineDate = new Date(t.deadline)
      return !isNaN(deadlineDate.getTime()) && deadlineDate < now
    }).length

    return { total, open, progress, closed, urgent, overdue }
  }, [scopedTasks])

  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((t) => {
      const matchesKategori = selectedKategori === 'All' || t.kategori === selectedKategori
      const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus
      const matchesPriority = selectedPriority === 'All' || t.priority === selectedPriority
      const matchesSearch =
        t.detail_task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.pic_assignment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.kategori?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.feedback?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesKategori && matchesStatus && matchesPriority && matchesSearch
    })
  }, [scopedTasks, selectedKategori, selectedStatus, selectedPriority, searchQuery])

  const formatDeadlineDisplay = (dateStr: string) => {
    if (!dateStr) return null
    if (dateStr.includes('T')) {
      const parts = dateStr.split('T')
      const datePart = parts[0] || ''
      const timePart = parts[1] || ''
      const [year, month, day] = datePart.split('-')
      return `${day}/${month}/${year ? year.slice(2) : ''} ${timePart}`
    }
    return dateStr
  }

  return (
    <main className="p-8 max-w-[1600px] w-full mx-auto space-y-6">
      {/* Header & Metric Strip */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
            Team Leader Management Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Daily Tracker Log Activity & Tasklist Team Leader QC & Outgoing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
              Total Task: <strong className="text-zinc-900">{stats.total}</strong>
            </span>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded border border-zinc-200">
              Open: <strong className="text-zinc-900">{stats.open}</strong>
            </span>
            <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded border border-sky-200/80">
              Progress: <strong className="text-sky-900">{stats.progress}</strong>
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/80">
              Closed: <strong className="text-emerald-900">{stats.closed}</strong>
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded border border-rose-200/80">
              Urgent: <strong className="text-rose-900">{stats.urgent}</strong>
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200/80">
              Overdue: <strong className="text-amber-950">{stats.overdue}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportTasksToCSV(filteredTasks, 'Tasklist_TL')}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>⤓</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Task Baru TL</span>
            </button>
            <button
              onClick={fetchTasks}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded shadow-2xs transition cursor-pointer"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Divisi Tabs */}
      <div className="flex items-center gap-1">
        {(['All', 'TL QC', 'TL OG'] as const).map((div) => (
          <button
            key={div}
            onClick={() => setSelectedDivisi(div)}
            className={`px-4 py-1.5 text-xs font-bold rounded transition cursor-pointer ${
              selectedDivisi === div
                ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200/90'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {div === 'All' ? 'Semua TL' : div}
          </button>
        ))}
      </div>

      {/* Toolbar Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-2.5 rounded-lg border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 text-xs font-medium scrollbar-none">
          <button
            onClick={() => setSelectedKategori('All')}
            className={`px-3 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${
              selectedKategori === 'All'
                ? 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Semua Kategori
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedKategori(cat)}
              className={`px-3 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${
                selectedKategori === cat
                  ? 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-200/80'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari task, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-52 pl-7 pr-3 py-1.5 bg-zinc-50 border border-zinc-200/90 rounded text-xs placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition"
            />
            <span className="absolute left-2.5 top-1.5 text-zinc-400 text-xs">🔍</span>
          </div>

          <select
            value={selectedPicFilter}
            onChange={(e) => setSelectedPicFilter(e.target.value)}
            className="bg-white border border-zinc-200/90 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="All">Semua User</option>
            {ALL_PICS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-white border border-zinc-200/90 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-zinc-200/90 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Status</option>
            <option value="Open">Open</option>
            <option value="On Progress">On Progress</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white border border-zinc-200/90 rounded-lg shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Memuat Konsol Tasklist...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-xs text-zinc-500 font-medium space-y-1">
            <p className="font-bold text-zinc-700">Tidak ada task yang ditemukan</p>
            <p className="text-zinc-400 text-[11px]">Cobalah mengubah filter pencarian atau buat task baru.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/90 bg-zinc-50/80 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                <th className="py-3 px-4 w-5/12">DESKRIPSI TUGAS</th>
                <th className="py-3 px-4">KATEGORI PILAR</th>
                <th className="py-3 px-4">DIVISI & PIC</th>
                <th className="py-3 px-4">PRIORITY</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs text-zinc-800">
              {filteredTasks.map((task) => {
                const isQC = task.pic_assignment?.toLowerCase().includes('qc')
                return (
                  <tr key={task.id} className="hover:bg-zinc-50/60 transition group">
                    
                    {/* DESKRIPSI TUGAS */}
                    <td className="py-3.5 px-4 align-top space-y-2">
                      <div className="font-semibold text-zinc-900 group-hover:text-black leading-relaxed">
                        {task.detail_task}
                      </div>

                      {task.deadline && (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                          <span>🕒</span>
                          <span>Deadline: {formatDeadlineDisplay(task.deadline)}</span>
                        </div>
                      )}

                      {/* Log Riwayat Feedback / Tindak Lanjut */}
                      <div className="mt-2 space-y-1.5">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          💬 History Feedback/Tindak Lanjut:
                        </div>

                        {task.feedback && (
                          <div className="p-2 rounded bg-zinc-50 border-l-2 border-zinc-900 text-[11px] text-zinc-700 font-mono space-y-1 max-h-32 overflow-y-auto">
                            {task.feedback.split('\n').map((line, idx) => (
                              <div key={idx} className="leading-snug">
                                {line}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <input
                            id={`new-feedback-${task.id}`}
                            type="text"
                            placeholder="Tambah tindak lanjut berikutnya..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddFeedbackLog(task.id, e.currentTarget.value)
                              }
                            }}
                            className="flex-1 px-2.5 py-1 text-xs bg-white border border-zinc-200 rounded focus:border-zinc-900 focus:outline-none placeholder:text-zinc-400 transition"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`new-feedback-${task.id}`) as HTMLInputElement | null
                              if (el) handleAddFeedbackLog(task.id, el.value)
                            }}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold rounded shadow-2xs transition cursor-pointer shrink-0"
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>

                      {task.bukti_url && (
                        <div className="pt-0.5">
                          <a
                            href={task.bukti_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-semibold border border-zinc-200 transition"
                          >
                            <span>🔗</span>
                            <span className="truncate max-w-xs">{task.bukti_url}</span>
                          </a>
                        </div>
                      )}
                    </td>

                    {/* KATEGORI PILAR (align-middle) */}
                    <td className="py-3.5 px-4 align-middle">
                      <span className="inline-block px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80">
                        {task.kategori || 'Daily Task Operasional'}
                      </span>
                    </td>

                    {/* DIVISI & PIC (align-middle) */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isQC ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'}`}>
                          {isQC ? 'QC' : 'TL'}
                        </span>
                        <span className="font-semibold text-zinc-800">{task.pic_assignment}</span>
                      </div>
                    </td>

                    {/* PRIORITY (align-middle) */}
                    <td className="py-3.5 px-4 align-middle">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                        <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'Urgent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        {task.priority || 'Medium'}
                      </span>
                    </td>

                    {/* STATUS (align-middle) */}
                    <td className="py-3.5 px-4 align-middle">
                      <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${task.status === 'Closed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : task.status === 'On Progress' ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'}`}>
                        {task.status || 'Open'}
                      </span>
                    </td>

                    {/* AKSI (align-middle) */}
                    <td className="py-3.5 px-4 align-middle text-right space-y-1">
                      <select
                        value={task.status || 'Open'}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className="text-xs bg-white border border-zinc-200 rounded px-2 py-1 font-medium text-zinc-800 hover:border-zinc-400 focus:outline-none cursor-pointer"
                      >
                        <option value="Open">Open</option>
                        <option value="On Progress">On Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                      <div>
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-[11px] font-bold text-zinc-500 hover:text-black underline cursor-pointer"
                        >
                          Edit Task
                        </button>
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Tambah Task */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
              <h3 className="font-extrabold text-sm text-zinc-900">Tambah Task TL Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-black font-bold p-1 text-sm cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddTask} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Assign PIC</label>
                <div className="flex flex-wrap gap-1.5">
                  {PICS.map((pic) => (
                    <button
                      key={pic}
                      type="button"
                      onClick={() => togglePic(pic)}
                      className={`h-8 px-3 text-xs font-medium border border-zinc-900 rounded-md transition cursor-pointer ${selectedPics.includes(pic) ? 'bg-black text-white font-bold' : 'bg-white text-zinc-800 hover:bg-zinc-100'}`}
                    >
                      {pic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Prioritas</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Deadline (SLA)</label>
                  <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Kategori Pilar</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Detail Task</label>
                <textarea rows={3} placeholder="Tuliskan deskripsi..." value={detailTask} onChange={(e) => setDetailTask(e.target.value)} required className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Tindak Lanjut / Feedback Awal</label>
                <textarea rows={2} placeholder="Catatan tindak lanjut..." value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Link Referensi</label>
                <input type="text" placeholder="https://..." value={buktiUrl} onChange={(e) => setBuktiUrl(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black" />
              </div>
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black rounded cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-black text-white rounded-md hover:bg-zinc-800 transition shadow-xs cursor-pointer">Simpan Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Task */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
              <h3 className="font-extrabold text-sm text-zinc-900">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-zinc-400 hover:text-black font-bold p-1 text-sm cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">PIC Assignment</label>
                <div className="flex flex-wrap gap-1.5">
                  {PICS.map((pic) => (
                    <button
                      key={pic}
                      type="button"
                      onClick={() => togglePic(pic, true)}
                      className={`h-8 px-3 text-xs font-medium border border-zinc-900 rounded-md transition cursor-pointer ${editPics.includes(pic) ? 'bg-black text-white font-bold' : 'bg-white text-zinc-800 hover:bg-zinc-100'}`}
                    >
                      {pic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Prioritas</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-500 flex items-center gap-1"><span>🔒</span> Deadline</label>
                  <input type="text" disabled value={formatDeadlineDisplay(editingTask.deadline) || 'Tidak ada deadline'} className="w-full h-10 px-3 border border-zinc-300 bg-zinc-100 text-zinc-500 font-mono rounded-md cursor-not-allowed" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Kategori Pilar</label>
                <select value={editKategori} onChange={(e) => setEditKategori(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Detail Task (Editable)</label>
                <textarea rows={3} value={editDetailTask} onChange={(e) => setEditDetailTask(e.target.value)} required className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">History Feedback/Tindak Lanjut</label>
                <textarea rows={3} placeholder="Catatan..." value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Link Referensi</label>
                <input type="text" placeholder="https://..." value={editBuktiUrl} onChange={(e) => setEditBuktiUrl(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-black" />
              </div>
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black rounded cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-black text-white rounded-md hover:bg-zinc-800 transition shadow-xs cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
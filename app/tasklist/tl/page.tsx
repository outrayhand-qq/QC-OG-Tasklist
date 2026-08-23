'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { exportTasksToCSV } from '@/lib/export-csv'
import { useRouter } from 'next/navigation'

type Task = {
  id: string
  created_at: string
  detail_task: string
  pic_assignment?: string
  status?: string
  last_updated?: string
  final_status?: string
  feedback?: string
  deadline: string
  priority: string
  waktu_close?: string
  kategori: string
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
  const router = useRouter()

  useEffect(() => {
    const isLogged = localStorage.getItem('isLoggedIn')
    if (!isLogged) {
      router.push('/')
    }
  }, [router])

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')

  const [selectedDivisi, setSelectedDivisi] = useState<'All' | 'TL QC' | 'TL OG'>('All')
  const [selectedKategori, setSelectedKategori] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedPriority, setSelectedPriority] = useState<string>('All')
  const [selectedPicFilter, setSelectedPicFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const [activeBadgeFilter, setActiveBadgeFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'updated'>('deadline')
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})

  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 10

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = (localStorage.getItem('userRole') || '').toLowerCase().trim()
      const email = localStorage.getItem('userEmail') || ''
      setUserRole(role)
      setUserEmail(email)

      if (role === 'tlqc') setSelectedDivisi('TL QC')
      else if (role === 'tlog') setSelectedDivisi('TL OG')
      else setSelectedDivisi('All')
    }
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const role = (typeof window !== 'undefined' ? localStorage.getItem('userRole') || '' : '').toLowerCase().trim()

    let query = supabase.from('db_tasklist').select('*')

    if (role === 'tlqc') {
      query = query.ilike('pic_assignment', '%qc%')
    } else if (role === 'tlog') {
      query = query.or('pic_assignment.ilike.%outgoing%,pic_assignment.ilike.%og%')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error.message)
    }
    if (!error && data) {
      let filtered = data
      if (role === 'tlqc') {
        filtered = data.filter((t) => t.pic_assignment?.toLowerCase().includes('qc'))
      } else if (role === 'tlog') {
        filtered = data.filter(
          (t) =>
            t.pic_assignment?.toLowerCase().includes('outgoing') ||
            t.pic_assignment?.toLowerCase().includes('og')
        )
      }
      setTasks(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  const handleAddFeedbackLog = async (taskId: string, newEntry: string) => {
    const cleanEntry = newEntry.trim()
    if (!cleanEntry) return

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const day = parts.find(p => p.type === 'day')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const hour = parts.find(p => p.type === 'hour')?.value
    const minute = parts.find(p => p.type === 'minute')?.value
    const timeStamp = `[${day}/${month} ${hour}:${minute}]`
    
    const activeUserName = typeof window !== 'undefined' ? (localStorage.getItem('userName') || userEmail || 'User') : 'User'
    const logString = `${timeStamp} (${activeUserName}): ${cleanEntry}`

    const targetTask = tasks.find((t) => t.id === taskId)
    const currentFeedback = targetTask?.feedback ? targetTask.feedback.trim() : ''

    const updatedFeedback = currentFeedback
      ? `${currentFeedback}\n${logString}`
      : `${logString}`

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
    if (!detailTask) {
      alert('Detail task wajib diisi!')
      return
    }

    let assignedPic = selectedPics.join(', ')
    if (!assignedPic) {
      if (userRole === 'tlqc') assignedPic = 'TL QC'
      else if (userRole === 'tlog') assignedPic = 'TL Outgoing'
      else assignedPic = 'Manager QC&OG'
    }

    const { error } = await supabase.from('db_tasklist').insert([
      {
        detail_task: detailTask,
        pic_assignment: assignedPic,
        kategori: kategori,
        priority: priority,
        deadline: deadline || null,
        feedback: feedback ? `[${new Date().toLocaleDateString('id-ID')}] ${feedback}` : null,
        bukti_url: buktiUrl || null,
        status: 'Open',
        final_status: null,
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
    const options = { timeZone: 'Asia/Jakarta', year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const, hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const, hour12: false }
    const formatter = new Intl.DateTimeFormat('en-CA', options)
    const parts = formatter.formatToParts(new Date())
    const year = parts.find(p => p.type === 'year')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    const hour = parts.find(p => p.type === 'hour')?.value
    const minute = parts.find(p => p.type === 'minute')?.value
    const second = parts.find(p => p.type === 'second')?.value
    const nowWIB = `${year}-${month}-${day} ${hour}:${minute}:${second}+07`

    const currentDateStr = newStatus === 'Closed' ? nowWIB : null

    const { error } = await supabase
      .from('db_tasklist')
      .update({ 
        status: newStatus, 
        final_status: newStatus === 'Closed' ? 'Closed' : null,
        waktu_close: currentDateStr,
        last_updated: new Date().toISOString() 
      })
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
    const open = scopedTasks.filter((t) => (t.status || t.final_status) === 'Open').length
    const progress = scopedTasks.filter((t) => (t.status || t.final_status) === 'On Progress').length
    const closed = scopedTasks.filter((t) => (t.status || t.final_status) === 'Closed' || t.final_status === 'Closed').length
    const urgent = scopedTasks.filter(
      (t) => t.priority === 'Urgent' && (t.status || t.final_status) !== 'Closed' && t.final_status !== 'Closed'
    ).length
    const overdue = scopedTasks.filter((t) => {
      const currentStat = t.final_status || t.status
      if (currentStat === 'Closed' || !t.deadline) return false
      const deadlineDate = new Date(t.deadline)
      return !isNaN(deadlineDate.getTime()) && deadlineDate < now
    }).length

    return { total, open, progress, closed, urgent, overdue }
  }, [scopedTasks])

  const isClosedStatus = (stat?: string) => stat === 'Closed'

  const filteredTasks = useMemo(() => {
    let result = scopedTasks.filter((t) => {
      const currentStat = t.final_status || t.status || 'Open'
      const matchesKategori = selectedKategori === 'All' || t.kategori === selectedKategori
      const matchesStatus = selectedStatus === 'All' || currentStat === selectedStatus
      const matchesPriority = selectedPriority === 'All' || t.priority === selectedPriority
      const matchesSearch =
        t.detail_task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.pic_assignment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.kategori?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.feedback?.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesBadge = true
      if (activeBadgeFilter) {
        const now = new Date().getTime()
        const deadlineTime = t.deadline ? new Date(t.deadline).getTime() : 0
        const diffHours = deadlineTime ? (deadlineTime - now) / (1000 * 60 * 60) : 999

        switch (activeBadgeFilter) {
          case 'Open': matchesBadge = currentStat === 'Open'; break
          case 'Progress': matchesBadge = currentStat === 'On Progress'; break
          case 'Closed': matchesBadge = currentStat === 'Closed'; break
          case 'Urgent': matchesBadge = !isClosedStatus(currentStat) && t.priority === 'Urgent'; break
          case 'Overdue': matchesBadge = !isClosedStatus(currentStat) && deadlineTime > 0 && diffHours < 0; break
        }
      }

      return matchesKategori && matchesStatus && matchesPriority && matchesSearch && matchesBadge
    })

    result.sort((a, b) => {
      if (sortBy === 'deadline') {
        const timeA = a.deadline ? new Date(a.deadline).getTime() : 8640000000000
        const timeB = b.deadline ? new Date(b.deadline).getTime() : 8640000000000
        return timeA - timeB
      }
      if (sortBy === 'priority') {
        const prioMap: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 }
        return (prioMap[b.priority] || 0) - (prioMap[a.priority] || 0)
      }
      if (sortBy === 'updated') {
        const timeA = a.last_updated ? new Date(a.last_updated).getTime() : new Date(a.created_at).getTime()
        const timeB = b.last_updated ? new Date(b.last_updated).getTime() : new Date(b.created_at).getTime()
        return timeB - timeA
      }
      return 0
    })

    return result
  }, [scopedTasks, selectedKategori, selectedStatus, selectedPriority, searchQuery, activeBadgeFilter, sortBy])

  const handleExportDynamicCSV = () => {
    const filterContext = selectedKategori !== 'All' ? selectedKategori.replace(/\s+/g, '_') : 'All_Cat'
    const dateStr = new Date().toISOString().split('T')[0]
    const fileName = `TL_${filterContext}_${dateStr}.csv`
    exportTasksToCSV(filteredTasks, fileName)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedKategori, selectedStatus, selectedPriority, selectedPicFilter, searchQuery, activeBadgeFilter, selectedDivisi])

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTasks.slice(start, start + itemsPerPage)
  }, [filteredTasks, currentPage])

  const getTaskUrgencyStyle = (task: Task) => {
    const currentStat = task.final_status || task.status || 'Open'
    if (isClosedStatus(currentStat)) {
      return { borderColor: 'border-l-zinc-300', badgeStyle: 'bg-zinc-100 text-zinc-600' }
    }
    if (!task.deadline) {
      return { borderColor: 'border-l-zinc-400', badgeStyle: 'bg-zinc-100 text-zinc-700' }
    }

    const now = new Date().getTime()
    const deadlineTime = new Date(task.deadline).getTime()
    const diffHours = (deadlineTime - now) / (1000 * 60 * 60)

    if (diffHours < 0) {
      return { borderColor: 'border-l-rose-600', badgeStyle: 'bg-rose-100 text-rose-800' }
    } else if (diffHours <= 24) {
      return { borderColor: 'border-l-amber-500', badgeStyle: 'bg-amber-100 text-amber-900' }
    }
    return { borderColor: 'border-l-emerald-500', badgeStyle: 'bg-emerald-50 text-emerald-800' }
  }

  const toggleBadgeFilter = (badgeName: string) => {
    setActiveBadgeFilter(prev => prev === badgeName ? null : badgeName)
  }

  const formatDeadlineDisplay = (dateStr: string) => {
    if (!dateStr) return null
    if (dateStr.includes('T') || dateStr.includes(' ')) {
      const parts = dateStr.split(/T| /)
      const datePart = parts[0] || ''
      const timePart = parts[1] ? parts[1].substring(0, 5) : ''
      const [year, month, day] = datePart.split('-')
      return `${day}/${month}/${year ? year.slice(2) : ''}${timePart ? ' ' + timePart : ''}`
    }
    return dateStr
  }

  const calculateDuration = (createdAt: string, closedAt?: string) => {
    if (!createdAt || !closedAt) return null
    const start = new Date(createdAt).getTime()
    const end = new Date(closedAt).getTime()
    const diffMs = end - start

    if (isNaN(diffMs) || diffMs < 0) return null

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return `${diffMinutes} Menit`
    } else if (diffHours < 24) {
      const mins = diffMinutes % 60
      return mins > 0 ? `${diffHours} Jam ${mins} Menit` : `${diffHours} Jam`
    } else {
      const hours = diffHours % 24
      return hours > 0 ? `${diffDays} Hari ${hours} Jam` : `${diffDays} Hari`
    }
  }

  const getDeadlineStatusInfo = (deadlineStr: string, status?: string, finalStatus?: string) => {
    const currentStat = finalStatus || status
    if (currentStat === 'Closed' || !deadlineStr) return null

    const now = new Date().getTime()
    const deadlineTime = new Date(deadlineStr).getTime()
    if (isNaN(deadlineTime)) return null

    const diffMs = deadlineTime - now
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffMs < 0) {
      const overdueDays = Math.abs(Math.floor(diffDays))
      const overdueHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)))
      const label = overdueHours < 24 ? `${overdueHours} Jam lalu` : `${overdueDays} Hari lalu`
      return { type: 'overdue', text: `⚠️ Overdue (${label}!)` }
    } else if (diffDays <= 3) {
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60))
      const daysLeft = Math.floor(diffDays)
      const label = hoursLeft < 24 ? `${hoursLeft} Jam lagi` : `${daysLeft} Hari lagi`
      return { type: 'h3', text: `Deadline ${label}!` }
    }

    return null
  }

  const isSuperAdmin = userRole === 'superadmin'
  const displayRoleLabel = isSuperAdmin ? 'SUPERADMIN' : userRole === 'tlqc' ? 'TL QC' : userRole === 'tlog' ? 'TL OUTGOING' : userRole.toUpperCase()

  return (
    <main className="p-8 max-w-[1600px] w-full mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
            {isSuperAdmin ? 'Team Leader Management Dashboard' : userRole === 'tlqc' ? 'Tasklist Operasional TL QC' : 'Tasklist Operasional TL Outgoing'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Daily Tracker Log Activity & Tasklist Performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button onClick={() => setActiveBadgeFilter(null)} className={`px-3 py-1 rounded border transition cursor-pointer ${!activeBadgeFilter ? 'bg-zinc-900 text-white font-bold' : 'bg-zinc-100 text-zinc-700'}`}>
              Total Task: <strong>{stats.total}</strong>
            </button>
            <button onClick={() => toggleBadgeFilter('Open')} className={`px-3 py-1 rounded border transition cursor-pointer ${activeBadgeFilter === 'Open' ? 'bg-zinc-900 text-white font-bold' : 'bg-zinc-100 text-zinc-700'}`}>
              Open: <strong>{stats.open}</strong>
            </button>
            <button onClick={() => toggleBadgeFilter('Progress')} className={`px-3 py-1 rounded border transition cursor-pointer ${activeBadgeFilter === 'Progress' ? 'bg-sky-600 text-white font-bold' : 'bg-sky-50 text-sky-700'}`}>
              Progress: <strong>{stats.progress}</strong>
            </button>
            <button onClick={() => toggleBadgeFilter('Closed')} className={`px-3 py-1 rounded border transition cursor-pointer ${activeBadgeFilter === 'Closed' ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-50 text-emerald-700'}`}>
              Closed: <strong>{stats.closed}</strong>
            </button>
            <button onClick={() => toggleBadgeFilter('Urgent')} className={`px-3 py-1 rounded border transition cursor-pointer ${activeBadgeFilter === 'Urgent' ? 'bg-rose-600 text-white font-bold' : 'bg-rose-50 text-rose-700'}`}>
              Urgent: <strong>{stats.urgent}</strong>
            </button>
            <button onClick={() => toggleBadgeFilter('Overdue')} className={`px-3 py-1 rounded border transition cursor-pointer ${activeBadgeFilter === 'Overdue' ? 'bg-amber-600 text-white font-bold' : 'bg-amber-50 text-amber-800'}`}>
              Overdue: <strong>{stats.overdue}</strong>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleExportDynamicCSV} className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded shadow-2xs transition cursor-pointer">
              ⤓ Export CSV
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="px-3.5 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded shadow-2xs transition cursor-pointer">
              + Tambah Task
            </button>
            <button onClick={fetchTasks} className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded shadow-2xs transition cursor-pointer">
              ↻
            </button>
          </div>
        </div>
      </div>

      {(stats.urgent > 0 || stats.overdue > 0) && (
        <div className="bg-zinc-900 text-amber-300 px-4 py-3 rounded-lg text-xs font-bold flex items-center justify-between shadow-md border-l-4 border-amber-400">
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <span>Perhatian: Ada {stats.urgent} task urgent dan {stats.overdue} task overdue yang memerlukan tindakan segera!</span>
          </div>
          <button onClick={() => setActiveBadgeFilter('Urgent')} className="text-white underline text-[11px] hover:text-amber-200 cursor-pointer">
            Filter Task Terkait
          </button>
        </div>
      )}

      {isSuperAdmin && (
        <div className="flex items-center gap-1">
          {(['All', 'TL QC', 'TL OG'] as const).map((div) => (
            <button key={div} onClick={() => setSelectedDivisi(div)} className={`px-4 py-1.5 text-xs font-bold rounded transition cursor-pointer ${selectedDivisi === div ? 'bg-white text-zinc-900 shadow-2xs border border-zinc-200' : 'text-zinc-500'}`}>
              {div === 'All' ? 'Semua TL' : div}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white p-3 rounded-lg border border-zinc-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto p-0.5 text-xs font-medium scrollbar-none">
            <button onClick={() => setSelectedKategori('All')} className={`px-3 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${selectedKategori === 'All' ? 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-200' : 'text-zinc-600'}`}>
              Semua Kategori
            </button>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedKategori(cat)} className={`px-3 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${selectedKategori === cat ? 'bg-zinc-100 text-zinc-900 font-bold border border-zinc-200' : 'text-zinc-600'}`}>
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <input type="text" placeholder="Cari task, PIC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-52 pl-7 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs focus:outline-none focus:bg-white" />
              <span className="absolute left-2.5 top-1.5 text-zinc-400 text-xs">🔍</span>
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer">
              <option value="deadline">Urut: Deadline terdekat</option>
              <option value="priority">Urut: Priority tertinggi</option>
              <option value="updated">Urut: Terakhir diupdate</option>
            </select>
            {isSuperAdmin && (
              <select value={selectedPicFilter} onChange={(e) => setSelectedPicFilter(e.target.value)} className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer">
                <option value="All">Semua User</option>
                {ALL_PICS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Semua Priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Semua Status</option>
              <option value="Open">Open</option>
              <option value="On Progress">On Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {(selectedKategori !== 'All' || selectedPriority !== 'All' || selectedStatus !== 'All' || selectedPicFilter !== 'All' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 text-[11px]">
            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Filter Aktif:</span>
            {searchQuery && <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-zinc-700">Pencarian: "{searchQuery}" <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-rose-600 font-bold ml-1">✕</button></span>}
            {selectedKategori !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-zinc-700">Kategori: {selectedKategori} <button onClick={() => setSelectedKategori('All')} className="text-zinc-400 hover:text-rose-600 font-bold ml-1">✕</button></span>}
            {selectedPriority !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-zinc-700">Priority: {selectedPriority} <button onClick={() => setSelectedPriority('All')} className="text-zinc-400 hover:text-rose-600 font-bold ml-1">✕</button></span>}
            {selectedStatus !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-zinc-700">Status: {selectedStatus} <button onClick={() => setSelectedStatus('All')} className="text-zinc-400 hover:text-rose-600 font-bold ml-1">✕</button></span>}
            {selectedPicFilter !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium text-zinc-700">User: {selectedPicFilter} <button onClick={() => setSelectedPicFilter('All')} className="text-zinc-400 hover:text-rose-600 font-bold ml-1">✕</button></span>}
            <button onClick={() => { setSelectedKategori('All'); setSelectedPriority('All'); setSelectedStatus('All'); setSelectedPicFilter('All'); setSearchQuery(''); }} className="text-sky-600 hover:underline font-bold ml-1">Hapus semua filter</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest bg-white rounded-xl border border-zinc-200 animate-pulse">
            Memuat Daftar Task...
          </div>
        ) : paginatedTasks.length === 0 ? (
          <div className="py-20 text-center text-xs text-zinc-500 font-medium bg-white rounded-xl border border-zinc-200 space-y-1">
            <p className="font-bold text-zinc-700">Tidak ada task yang ditemukan</p>
            <p className="text-zinc-400 text-[11px]">Cobalah mengubah filter pencarian atau buat task baru.</p>
          </div>
        ) : (
          paginatedTasks.map((task) => {
            const isQC = task.pic_assignment?.toLowerCase().includes('qc')
            const currentStatus = task.final_status || task.status || 'Open'
            const isClosed = currentStatus === 'Closed'
            const durationResult = isClosed ? calculateDuration(task.created_at, task.waktu_close) : null
            const deadlineAlert = getDeadlineStatusInfo(task.deadline, task.status, task.final_status)
            const urgencyStyle = getTaskUrgencyStyle(task)

            let barPercent = 0
            let barColor = 'bg-emerald-400'
            if (!isClosed && task.deadline) {
              const diffHours = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
              if (diffHours < 0) { barPercent = 100; barColor = 'bg-rose-500' }
              else if (diffHours <= 24) { barPercent = 100 - ((diffHours / 24) * 100); barColor = 'bg-amber-400' }
              else { barPercent = 30; barColor = 'bg-emerald-400' }
            }

            const feedbackLines = task.feedback ? task.feedback.split('\n').filter(Boolean) : []
            const isExpanded = expandedHistory[task.id]
            const displayedLines = isExpanded ? feedbackLines : feedbackLines.slice(-2)

            return (
              <div key={task.id} className={`bg-white rounded-xl shadow-xs border border-zinc-200/90 overflow-hidden border-l-4 ${urgencyStyle.borderColor} transition hover:shadow-md`}>
                <div className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-900 text-sm leading-snug">{task.detail_task}</h3>
                        <button onClick={() => openEditModal(task)} title="Edit Task" className="p-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded border border-zinc-200 transition cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                        {task.deadline && (
                          <span className="text-zinc-500 font-semibold flex items-center gap-1">
                            <span>🕒</span> Deadline: {formatDeadlineDisplay(task.deadline)}
                          </span>
                        )}
                        {deadlineAlert && !isClosed && (
                          <span className={`px-2 py-0.5 rounded font-black tracking-wide ${deadlineAlert.type === 'overdue' ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-900'}`}>
                            {deadlineAlert.text}
                          </span>
                        )}
                        {!isClosed && task.deadline && (
                          <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden inline-block">
                            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${barPercent}%` }}></div>
                          </div>
                        )}
                        {isClosed && task.waktu_close && (
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            ✅ Closed: {formatDeadlineDisplay(task.waktu_close)} {durationResult && `(Selesai dalam ${durationResult})`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100">
                      <span className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 font-medium border border-zinc-200">
                        {task.kategori || 'Daily Task Operasional'}
                      </span>

                      <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 font-medium">
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${isQC ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>
                          {isQC ? 'QC' : 'TL'}
                        </span>
                        <span>{task.pic_assignment || '-'}</span>
                      </div>

                      <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200/70 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'Urgent' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        {task.priority || 'Medium'}
                      </span>

                      <select
                        value={currentStatus}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className={`font-bold rounded-lg px-3 py-1.5 border transition cursor-pointer appearance-none ${
                          currentStatus === 'Closed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          currentStatus === 'On Progress' ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="On Progress">On Progress</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        💬 History Feedback / Tindak Lanjut:
                      </span>
                      {feedbackLines.length > 2 && (
                        <button onClick={() => setExpandedHistory(prev => ({ ...prev, [task.id]: !prev[task.id] }))} className="text-[11px] text-sky-600 font-bold hover:underline cursor-pointer">
                          {isExpanded ? 'Tutup' : `Lihat semua (${feedbackLines.length})`}
                        </button>
                      )}
                    </div>

                    {feedbackLines.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-zinc-50 border-l-2 border-zinc-900 text-[11px] text-zinc-700 font-mono space-y-1 max-h-32 overflow-y-auto">
                        {displayedLines.map((line, idx) => (
                          <div key={idx} className="leading-snug">{line}</div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
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
                        className="flex-1 px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg focus:border-zinc-900 focus:outline-none placeholder:text-zinc-400 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(`new-feedback-${task.id}`) as HTMLInputElement | null
                          if (el) handleAddFeedbackLog(task.id, el.value)
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer shrink-0"
                      >
                        + Tambah
                      </button>
                    </div>

                    {task.bukti_url && (
                      <div className="pt-1">
                        <a href={task.bukti_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition shadow-2xs">
                          <span>🔗</span> Buka Lampiran Link
                        </a>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })
        )}
      </div>

      {filteredTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border border-zinc-200 rounded-lg text-xs shadow-sm">
          <div className="text-zinc-500 font-medium">
            Menampilkan <span className="font-bold text-zinc-850">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold text-zinc-850">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> dari <span className="font-bold text-zinc-850">{filteredTasks.length}</span> task
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-bold disabled:opacity-40 hover:bg-zinc-100 transition cursor-pointer">
              Sebelumnya
            </button>
            <span className="px-2 font-bold text-zinc-700">Halaman {currentPage} dari {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-bold disabled:opacity-40 hover:bg-zinc-100 transition cursor-pointer">
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xs border-t border-zinc-200/80 px-4 py-2 flex items-center justify-between text-xs shadow-md z-40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="text-zinc-700 font-medium">{userEmail}</span>
          <span className="px-2.5 py-0.5 bg-zinc-900 text-white rounded text-[10px] font-extrabold tracking-wider uppercase">{displayRoleLabel}</span>
        </div>
        <button onClick={handleLogout} title="Keluar Sistem" className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition cursor-pointer flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
              <h3 className="font-extrabold text-sm text-zinc-900">Tambah Task TL Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-black font-bold p-1 text-sm cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddTask} className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Assign PIC (Opsional - Kosongkan jika untuk task pribadi)</label>
                <div className="flex flex-wrap gap-1.5">
                  {PICS.map((pic) => (
                    <button key={pic} type="button" onClick={() => togglePic(pic)} className={`h-8 px-3 text-xs font-medium border border-zinc-900 rounded-md transition cursor-pointer ${selectedPics.includes(pic) ? 'bg-black text-white font-bold' : 'bg-white text-zinc-800 hover:bg-zinc-100'}`}>
                      {pic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Prioritas</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none cursor-pointer">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Deadline (SLA)</label>
                  <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none cursor-pointer" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Kategori Pilar</label>
                <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Detail Task</label>
                <textarea rows={3} placeholder="Tuliskan deskripsi..." value={detailTask} onChange={(e) => setDetailTask(e.target.value)} required className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Tindak Lanjut / Feedback Awal</label>
                <textarea rows={2} placeholder="Catatan tindak lanjut..." value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Link Referensi</label>
                <input type="text" placeholder="https://..." value={buktiUrl} onChange={(e) => setBuktiUrl(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none" />
              </div>
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black rounded cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-black text-white rounded-md hover:bg-zinc-800 transition cursor-pointer">Simpan Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <button key={pic} type="button" onClick={() => togglePic(pic, true)} className={`h-8 px-3 text-xs font-medium border border-zinc-900 rounded-md transition cursor-pointer ${editPics.includes(pic) ? 'bg-black text-white font-bold' : 'bg-white text-zinc-800 hover:bg-zinc-100'}`}>
                      {pic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-zinc-900">Prioritas</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none cursor-pointer">
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
                <select value={editKategori} onChange={(e) => setEditKategori(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs font-medium text-zinc-900 focus:outline-none cursor-pointer">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Detail Task (Editable)</label>
                <textarea rows={3} value={editDetailTask} onChange={(e) => setEditDetailTask(e.target.value)} required className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">History Feedback/Tindak Lanjut</label>
                <textarea rows={3} placeholder="Catatan..." value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} className="w-full p-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-900">Link Referensi</label>
                <input type="text" placeholder="https://..." value={editBuktiUrl} onChange={(e) => setEditBuktiUrl(e.target.value)} className="w-full h-10 px-3 border border-zinc-900 bg-white rounded-md text-xs focus:outline-none" />
              </div>
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-black rounded cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-black text-white rounded-md hover:bg-zinc-800 transition cursor-pointer">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
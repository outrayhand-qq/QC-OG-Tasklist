'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// --- TIPE DATA ---
type HistoryLog = {
  id: string
  user: string
  timestamp: string
  text: string
}

type Task = {
  id: string
  title: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'On Progress' | 'Closed'
  deadline: string 
  pic: string 
  history: HistoryLog[] | string 
  updatedAt: string
  attachment?: string // Low #9: Lampiran Link
}

export default function TaskTLDashboard() {
  const router = useRouter()
  
  // --- STATE USER & ROLE ACCESS ---
  const [currentUser, setCurrentUser] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const isLogged = localStorage.getItem('isLoggedIn')
    if (!isLogged) {
      router.push('/')
      return
    }
    setCurrentUser(localStorage.getItem('userName') || 'Unknown')
    setUserRole(localStorage.getItem('userRole') || 'staff')
  }, [router])

  const isSuperAdmin = userRole === 'superadmin'
  const isTL = userRole.includes('tl') || userRole === 'tl'
  const canChangeStatus = isSuperAdmin || isTL
  const canAddTask = isSuperAdmin || isTL
  const canAddHistory = true 

  // --- STATE DATA ---
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'TASK-001',
      title: 'dummy deadline',
      category: 'Daily Task Operasional',
      priority: 'Medium',
      status: 'On Progress',
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      pic: 'RH',
      history: [
        { id: 'h1', user: 'Rayhand', timestamp: new Date(Date.now() - 3600000).toISOString(), text: 'Sudah konfirmasi ke vendor, menunggu balasan final.' }
      ],
      updatedAt: new Date().toISOString(),
      attachment: 'https://docs.google.com/spreadsheets/d/123/edit'
    },
    {
      id: 'TASK-002',
      title: 'Case Ekspedisi',
      category: 'Eskalasi',
      priority: 'High',
      status: 'Closed',
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      pic: 'RH, VN',
      history: [
        { id: 'h2', user: 'Rayhand', timestamp: new Date(Date.now() - 86400000).toISOString(), text: 'SAP paket cancel tapi sudah dikirim.' }
      ],
      updatedAt: new Date().toISOString()
    }
  ])
  
  // --- STATE FILTER & SORTING ---
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBadgeFilter, setActiveBadgeFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'updated'>('deadline')
  
  // Dropdown Kombinasi Filters (Medium #5)
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterPriority, setFilterPriority] = useState<string>('All')
  const [filterUser, setFilterUser] = useState<string>('All')

  // State Pagination (Medium #8)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 15

  // State History & Modal
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})
  const [newLogTexts, setNewLogTexts] = useState<Record<string, string>>({})
  const [quickAddModal, setQuickAddModal] = useState<string | null>(null) // Low #10

  // Ekstraksi opsi filter dinamis
  const categories = useMemo(() => Array.from(new Set(tasks.map(t => t.category))), [tasks])
  const priorities = ['High', 'Medium', 'Low']
  const users = useMemo(() => {
    const allUsers = tasks.flatMap(t => t.pic.split(',').map(p => p.trim()))
    return Array.from(new Set(allUsers))
  }, [tasks])

  // --- LOGIC: PERHITUNGAN URGENSI ---
  const getUrgency = (deadline: string, status: string) => {
    if (status === 'Closed') return { color: 'border-zinc-300', text: 'Selesai', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200' }
    const diffHours = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60)
    if (diffHours < 0) return { color: 'border-rose-500', text: 'Overdue', badge: 'bg-rose-100 text-rose-700 border-rose-200' }
    if (diffHours <= 24) return { color: 'border-amber-500', text: 'Due Soon', badge: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { color: 'border-emerald-500', text: 'On Track', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  // --- LOGIC: SUMMARY BADGES ---
  const summary = useMemo(() => {
    let open = 0, progress = 0, closed = 0, urgent = 0, overdue = 0
    const now = Date.now()
    tasks.forEach(t => {
      if (t.status === 'Open') open++
      if (t.status === 'On Progress') progress++
      if (t.status === 'Closed') closed++
      if (t.status !== 'Closed') {
        const diffHours = (new Date(t.deadline).getTime() - now) / (1000 * 60 * 60)
        if (diffHours < 0) overdue++
        else if (diffHours <= 24) urgent++
      }
    })
    return { total: tasks.length, open, progress, closed, urgent, overdue }
  }, [tasks])

  // --- LOGIC: FILTER, SEARCH & SORTING UTAMA ---
  const processedTasks = useMemo(() => {
    let filtered = tasks.filter(t => {
      // 1. Search Bar
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.pic.toLowerCase().includes(searchQuery.toLowerCase())
      
      // 2. Kombinasi Dropdown (Medium #5)
      const matchesCat = filterCategory === 'All' || t.category === filterCategory
      const matchesPri = filterPriority === 'All' || t.priority === filterPriority
      const matchesUsr = filterUser === 'All' || t.pic.includes(filterUser)
      
      // 3. Badge Aktif
      let matchesBadge = true
      if (activeBadgeFilter) {
        const diffHours = (new Date(t.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
        switch (activeBadgeFilter) {
          case 'Open': matchesBadge = t.status === 'Open'; break
          case 'Progress': matchesBadge = t.status === 'On Progress'; break
          case 'Closed': matchesBadge = t.status === 'Closed'; break
          case 'Urgent': matchesBadge = t.status !== 'Closed' && diffHours >= 0 && diffHours <= 24; break
          case 'Overdue': matchesBadge = t.status !== 'Closed' && diffHours < 0; break
        }
      }

      return matchesSearch && matchesCat && matchesPri && matchesUsr && matchesBadge
    })

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (sortBy === 'priority') {
        const prio = { High: 3, Medium: 2, Low: 1 }
        return prio[b.priority] - prio[a.priority]
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return filtered
  }, [tasks, searchQuery, activeBadgeFilter, filterCategory, filterPriority, filterUser, sortBy])

  // Reset pagination jika filter berubah
  useEffect(() => setCurrentPage(1), [searchQuery, activeBadgeFilter, filterCategory, filterPriority, filterUser])

  // Splitting & Pagination (Medium #8)
  const actionRequiredTasks = processedTasks.filter(t => t.status !== 'Closed')
  const completedTasks = processedTasks.filter(t => t.status === 'Closed')
  
  const allPaginatedTasks = processedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(processedTasks.length / itemsPerPage) || 1

  // --- HANDLERS ---
  const handleAddHistory = (taskId: string, textOverride?: string) => {
    const text = textOverride || newLogTexts[taskId]
    if (!text || text.trim() === '') return
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newLog: HistoryLog = { id: Date.now().toString(), user: currentUser, timestamp: new Date().toISOString(), text: text.trim() }
        const currentHistory = Array.isArray(t.history) ? t.history : [] 
        return { ...t, history: [...currentHistory, newLog], updatedAt: new Date().toISOString() }
      }
      return t
    }))
    setNewLogTexts(prev => ({ ...prev, [taskId]: '' }))
    setQuickAddModal(null)
  }

  const handleChangeStatus = (taskId: string, newStatus: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
  }

  const formatTime = (isoString: string) => new Date(isoString).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })

  // Export CSV (Low #11)
  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Deadline', 'PIC', 'Total_History', 'Last_Updated']
    const rows = processedTasks.map(t => [
      t.id, `"${t.title.replace(/"/g, '""')}"`, t.category, t.priority, t.status, 
      formatTime(t.deadline), `"${t.pic}"`, Array.isArray(t.history) ? t.history.length : 0, formatTime(t.updatedAt)
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `TL_Task_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- COMPONENT: TASK CARD ---
  const renderTaskCard = (task: Task) => {
    const urgency = getUrgency(task.deadline, task.status)
    const historyArray = Array.isArray(task.history) ? task.history : []
    const isExpanded = expandedHistory[task.id]
    const displayHistory = isExpanded ? historyArray : historyArray.slice(-2)

    // Perhitungan lebar bar deadline (Medium #7)
    let barPercent = 0
    let barColor = 'bg-emerald-400'
    if (task.status !== 'Closed') {
      const diffHours = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
      if (diffHours < 0) { barPercent = 100; barColor = 'bg-rose-500' }
      else if (diffHours <= 24) { barPercent = 100 - ((diffHours / 24) * 100); barColor = 'bg-amber-400' }
    }

    return (
      <div key={task.id} className={`bg-white rounded-xl shadow-sm border border-zinc-200 mb-4 overflow-hidden border-l-4 ${urgency.color}`}>
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 pr-4">
              <h3 className="font-bold text-zinc-900 text-lg mb-1 flex items-center gap-2">
                {task.title}
                {/* Tombol Quick Add Log (Low #10) */}
                {canAddHistory && (
                  <button onClick={() => setQuickAddModal(task.id)} className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-2 py-1 rounded transition cursor-pointer" title="Quick Add Tindak Lanjut">
                    + Quick Log
                  </button>
                )}
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1.5">
                <span className="flex items-center gap-1 font-mono">⏰ {formatTime(task.deadline)}</span>
                
                {/* Progress Bar Deadline (Medium #7) */}
                {task.status !== 'Closed' ? (
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${urgency.badge}`}>{urgency.text}</span>
                    <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${barPercent}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-zinc-100 text-zinc-600 border-zinc-200">Selesai / Ditutup</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
              <span className="text-zinc-500 hidden md:inline-block">{task.category}</span>
              <span className={`px-2 py-1 rounded-full ${task.priority === 'High' ? 'text-rose-700 bg-rose-50' : 'text-amber-700 bg-amber-50'}`}>
                ● {task.priority}
              </span>
              
              {/* Dropdown Aksi & Status Digabung (Medium #6) */}
              <select 
                disabled={!canChangeStatus}
                value={task.status}
                onChange={(e) => handleChangeStatus(task.id, e.target.value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold focus:outline-none transition cursor-pointer appearance-none ${
                  task.status === 'Closed' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 
                  task.status === 'On Progress' ? 'text-sky-700 border-sky-200 bg-sky-50' : 'text-zinc-700 border-zinc-300 bg-zinc-50'
                } ${!canChangeStatus && 'opacity-70 cursor-not-allowed'}`}
              >
                <option value="Open">Open</option>
                <option value="On Progress">On Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* PIC Chips */}
            {task.pic.split(',').map((p, idx) => (
              <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded-md text-[11px] font-medium text-zinc-700 cursor-pointer hover:bg-zinc-200 transition">
                <div className="w-4 h-4 rounded-full bg-zinc-300 flex items-center justify-center text-[8px] text-white font-bold">
                  {p.trim().substring(0, 2).toUpperCase()}
                </div>
                {p.trim()}
                <span className="text-zinc-400 hover:text-emerald-500" title="Tandai selesai oleh PIC ini">✓</span>
              </span>
            ))}
            
            {/* Lampiran Link Menonjol (Low #9) */}
            {task.attachment && (
              <a href={task.attachment} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition">
                🔗 Buka Lampiran
              </a>
            )}
          </div>

          {/* History Thread */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">History Feedback / Tindak Lanjut</h4>
              {historyArray.length > 2 && (
                <button onClick={() => setExpandedHistory(prev => ({ ...prev, [task.id]: !prev[task.id] }))} className="text-xs text-sky-600 font-semibold hover:underline cursor-pointer">
                  {isExpanded ? 'Tutup' : `Lihat semua (${historyArray.length})`}
                </button>
              )}
            </div>

            <div className="space-y-3 mb-4">
              {displayHistory.length === 0 ? (
                <div className="text-xs text-zinc-400 italic">Belum ada tindak lanjut.</div>
              ) : (
                displayHistory.map((log) => (
                  <div key={log.id} className="flex gap-3 bg-zinc-50/50 p-3 rounded-lg border border-zinc-100">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">{log.user.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-bold text-xs text-zinc-800">{log.user}</span>
                        <span className="text-[10px] text-zinc-400">{formatTime(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">{log.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {canAddHistory && (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newLogTexts[task.id] || ''}
                  onChange={(e) => setNewLogTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                  placeholder="Tambah tindak lanjut..." 
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-zinc-400 transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHistory(task.id)}
                />
                <button onClick={() => handleAddHistory(task.id)} className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition cursor-pointer">
                  + Tambah
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/30 p-6 md:p-8 relative">
      
      {/* HEADER & EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Team Leader Management Dashboard</h1>
          <p className="text-xs text-zinc-500">Daily Tracker Log Activity & Tasklist Performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs rounded-lg hover:bg-zinc-50 transition cursor-pointer shadow-sm">
            📥 Export CSV (Filter Aktif)
          </button>
          {canAddTask && (
            <button className="px-4 py-2 bg-black text-white font-bold text-xs rounded-lg hover:bg-zinc-800 transition cursor-pointer shadow-sm">
              + Tambah Task
            </button>
          )}
        </div>
      </div>
      
      {/* SUMMARY BADGES */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveBadgeFilter(null)} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${!activeBadgeFilter ? 'bg-black text-white border-black shadow-md' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'}`}>
          Total Task {summary.total}
        </button>
        <button onClick={() => setActiveBadgeFilter(activeBadgeFilter === 'Open' ? null : 'Open')} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${activeBadgeFilter === 'Open' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'}`}>
          Open {summary.open}
        </button>
        <button onClick={() => setActiveBadgeFilter(activeBadgeFilter === 'Progress' ? null : 'Progress')} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${activeBadgeFilter === 'Progress' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'}`}>
          Progress {summary.progress}
        </button>
        <button onClick={() => setActiveBadgeFilter(activeBadgeFilter === 'Closed' ? null : 'Closed')} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${activeBadgeFilter === 'Closed' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'}`}>
          Closed {summary.closed}
        </button>
        <button onClick={() => setActiveBadgeFilter(activeBadgeFilter === 'Urgent' ? null : 'Urgent')} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${activeBadgeFilter === 'Urgent' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
          🔥 Urgent {summary.urgent}
        </button>
        <button onClick={() => setActiveBadgeFilter(activeBadgeFilter === 'Overdue' ? null : 'Overdue')} className={`px-4 py-2 rounded-lg font-bold text-xs transition border cursor-pointer ${activeBadgeFilter === 'Overdue' ? 'bg-rose-500 text-white border-rose-600 shadow-md' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}>
          ⏰ Overdue {summary.overdue}
        </button>
      </div>

      {/* FILTER, SEARCH, SORT (Medium #5 & High #1) */}
      <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <input type="text" placeholder="Cari task, PIC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs focus:outline-none focus:bg-white transition" />
            <span className="absolute left-2.5 top-2 text-zinc-400 text-xs">🔍</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Kategori (Semua)</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Priority (Semua)</option>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">User (Semua)</option>
              {users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="h-6 w-px bg-zinc-300 mx-1 hidden md:block"></div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 font-bold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="deadline">Urut: Deadline terdekat</option>
              <option value="priority">Urut: Priority tertinggi</option>
              <option value="updated">Urut: Terakhir diupdate</option>
            </select>
          </div>
        </div>

        {/* CHIP FILTER AKTIF (Medium #5) */}
        {(filterCategory !== 'All' || filterPriority !== 'All' || filterUser !== 'All' || searchQuery) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
            {searchQuery && (
              <span className="bg-zinc-100 border border-zinc-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 font-medium text-zinc-600">
                Pencarian: "{searchQuery}" <button onClick={() => setSearchQuery('')} className="ml-1 text-zinc-400 hover:text-rose-500 font-bold">✕</button>
              </span>
            )}
            {filterCategory !== 'All' && (
              <span className="bg-zinc-100 border border-zinc-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 font-medium text-zinc-600">
                Kategori: {filterCategory} <button onClick={() => setFilterCategory('All')} className="ml-1 text-zinc-400 hover:text-rose-500 font-bold">✕</button>
              </span>
            )}
            {filterPriority !== 'All' && (
              <span className="bg-zinc-100 border border-zinc-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 font-medium text-zinc-600">
                Priority: {filterPriority} <button onClick={() => setFilterPriority('All')} className="ml-1 text-zinc-400 hover:text-rose-500 font-bold">✕</button>
              </span>
            )}
            {filterUser !== 'All' && (
              <span className="bg-zinc-100 border border-zinc-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 font-medium text-zinc-600">
                User: {filterUser} <button onClick={() => setFilterUser('All')} className="ml-1 text-zinc-400 hover:text-rose-500 font-bold">✕</button>
              </span>
            )}
            <button onClick={() => { setFilterCategory('All'); setFilterPriority('All'); setFilterUser('All'); setSearchQuery('') }} className="text-[10px] text-sky-600 hover:underline font-bold ml-2">
              Hapus semua filter
            </button>
          </div>
        )}
      </div>

      {/* RENDER TASKS DARI PAGINATED DATA */}
      <div className="space-y-6 mt-6">
        {processedTasks.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 font-medium text-xs bg-white">
            Tidak ada task yang cocok dengan filter saat ini.
          </div>
        ) : (
          allPaginatedTasks.map(renderTaskCard)
        )}
      </div>

      {/* PAGINATION CONTROLS (Medium #8) */}
      {processedTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-4 py-3 bg-white border border-zinc-200 rounded-lg text-xs shadow-sm">
          <div className="text-zinc-500 font-medium">
            Menampilkan <span className="font-bold text-zinc-800">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold text-zinc-800">{Math.min(currentPage * itemsPerPage, processedTasks.length)}</span> dari <span className="font-bold text-zinc-800">{processedTasks.length}</span> task
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-bold disabled:opacity-40 hover:bg-zinc-100 transition">
              Sebelumnya
            </button>
            <span className="px-2 font-bold text-zinc-700">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-700 font-bold disabled:opacity-40 hover:bg-zinc-100 transition">
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL (Low #10) */}
      {quickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-zinc-200">
            <h3 className="font-bold text-lg text-zinc-900 mb-2">Tindak Lanjut Cepat</h3>
            <p className="text-xs text-zinc-500 mb-4">Tambahkan log progress ke task yang dipilih.</p>
            <textarea 
              autoFocus
              rows={4}
              placeholder="Ketik progres di sini..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:border-black mb-4"
              id="quickAddInput"
            ></textarea>
            <div className="flex justify-end gap-2">
              <button onClick={() => setQuickAddModal(null)} className="px-4 py-2 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-lg hover:bg-zinc-200 transition">Batal</button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('quickAddInput') as HTMLTextAreaElement).value
                  handleAddHistory(quickAddModal, val)
                }} 
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
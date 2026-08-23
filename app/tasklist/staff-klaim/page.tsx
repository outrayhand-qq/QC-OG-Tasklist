'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// --- TYPE DEFINITIONS ---
type KlaimData = {
  id: string
  awb: string
  klien: string
  ekspedisi: string
  kasus: string
  status_progres: string
  status_final: string | null
  tgl_masuk: string
  tgl_mutasi: string | null
  nominal_claim: number
  keterangan: string
  pic_staff: string
}

// --- HELPER FUNCTIONS ---
const parseTagKeterangan = (text: string) => {
  const tags = []
  const lowerText = text.toLowerCase()
  if (lowerText.includes('rentan bocor')) tags.push('Barang Rentan Bocor')
  if (lowerText.includes('clear case') || lowerText.includes('fisik datang')) tags.push('Fisik Datang ke Gudang')
  if (lowerText.includes('alur update')) tags.push('Alur Update')
  
  let sisaTeks = text
  tags.forEach(t => {
    const regex = new RegExp(t, 'ig')
    sisaTeks = sisaTeks.replace(regex, '').trim()
  })
  sisaTeks = sisaTeks.replace(/^[^\w\s]+|[^\w\s]+$/g, '').trim()
  return { tags, sisaTeks }
}

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
}

export default function TrackerKlaimDashboard() {
  const router = useRouter()
  
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<KlaimData[]>([])
  const [loading, setLoading] = useState(true)
  const [syncInfo, setSyncInfo] = useState({ time: '', status: 'idle' })

  // Filters
  const [search, setSearch] = useState('')
  const [filterBulan, setFilterBulan] = useState('All')
  const [filterEkspedisi, setFilterEkspedisi] = useState('All')
  const [filterKategori, setFilterKategori] = useState('All')
  const [filterPic, setFilterPic] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  // Sort & Pagination
  const [sortConfig, setSortConfig] = useState<{ key: 'aging' | 'nominal' | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // --- FETCH REAL DATA FROM APPS SCRIPT / API ---
  const fetchData = async () => {
    setSyncInfo(prev => ({ ...prev, status: 'loading' }))
    try {
      // Ganti URL di bawah dengan Endpoint Apps Script / API Real Anda
      const response = await fetch('https://script.google.com/macros/s/AKfycbylwHe4pvQIl7a1gnNynbUqZG6U5Aa7pPpByICiznMPSRO-JYMR1HavlStzCt_gAoYKCg/exec')
      const result = await response.json()
      
      // Mapping data agar sesuai dengan struktur type KlaimData
      const mappedData: KlaimData[] = (result.data || result || []).map((item: any, index: number) => ({
        id: item.id || String(index + 1),
        awb: item.awb || item.NO_AWB || '-',
        klien: item.klien || item.KLIEN || '-',
        ekspedisi: item.ekspedisi || item.EKSPEDISI || '-',
        kasus: item.kasus || item.KASUS || '-',
        status_progres: item.status_progres || item.STATUS_PROGRES || '-',
        status_final: item.status_final || item.STATUS_FINAL || null,
        tgl_masuk: item.tgl_masuk || item.TGL_MASUK || new Date().toISOString(),
        tgl_mutasi: item.tgl_mutasi || item.TGL_MUTASI || null,
        nominal_claim: Number(item.nominal_claim || item.NOMINAL_CLAIM || 0),
        keterangan: item.keterangan || item.KETERANGAN || '',
        pic_staff: item.pic_staff || item.PIC_STAFF || 'Staff'
      }))

      setData(mappedData)
      
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
      const timeStr = `${formatter.format(now)} WIB`
      
      setSyncInfo({ time: timeStr, status: 'success' })
      localStorage.setItem('lastKlaimSync', timeStr)
    } catch (err) {
      console.error('Gagal mengambil data real:', err)
      setSyncInfo(prev => ({ ...prev, status: 'error' }))
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
    const isLogged = localStorage.getItem('isLoggedIn')
    const role = (localStorage.getItem('userRole') || '').toLowerCase().trim()
    
    if (!isLogged) {
      router.push('/')
      return
    }

    // Role yang diizinkan: Superadmin, TL QC, dan Staff Klaim (TL OG tidak boleh)
    const allowedRoles = ['superadmin', 'tlqc', 'staff_klaim', 'staffklaim']
    
    if (role && !allowedRoles.includes(role)) {
      alert('Akses ditolak. Halaman Tracker Klaim khusus untuk Superadmin, TL QC, dan Staff Klaim.')
      router.push('/') // Mengarahkan kembali jika tidak punya akses
    }
  }, [router])

  // --- DATA PROCESSING (AGING LOGIC) ---
  const processedData = useMemo(() => {
    const today = new Date()
    
    return data.map(item => {
      const tglMasuk = new Date(item.tgl_masuk)
      let tglAkhir = today
      let isFinal = false

      if (item.status_final && item.tgl_mutasi) {
        tglAkhir = new Date(item.tgl_mutasi)
        isFinal = true
      }

      const diffTime = Math.abs(tglAkhir.getTime() - tglMasuk.getTime())
      const agingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let agingStatus = 'green'
      if (agingDays >= 7 && agingDays <= 14) agingStatus = 'yellow'
      if (agingDays > 14) agingStatus = 'red'

      return { ...item, agingDays, isFinal, agingStatus, tglMasukObj: tglMasuk, tglMutasiObj: item.tgl_mutasi ? new Date(item.tgl_mutasi) : null }
    })
  }, [data])

  // --- PIC WORKLOAD AGGREGATION ---
  const picWorkload = useMemo(() => {
    const counts: Record<string, number> = {}
    processedData.forEach(d => {
      if (!counts[d.pic_staff]) counts[d.pic_staff] = 0
      counts[d.pic_staff]++
    })
    return counts
  }, [processedData])

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    let result = processedData

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d => 
        d.awb.toLowerCase().includes(q) || 
        d.klien.toLowerCase().includes(q) || 
        d.keterangan.toLowerCase().includes(q)
      )
    }
    if (filterEkspedisi !== 'All') result = result.filter(d => d.ekspedisi === filterEkspedisi)
    if (filterKategori !== 'All') result = result.filter(d => d.kasus === filterKategori)
    if (filterPic !== 'All') result = result.filter(d => d.pic_staff === filterPic)
    if (filterStatus !== 'All') {
      if (filterStatus === 'Open') result = result.filter(d => !d.isFinal)
      else result = result.filter(d => d.status_final === filterStatus)
    }

    // --- SORTING ---
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'aging') {
          return sortConfig.direction === 'asc' ? a.agingDays - b.agingDays : b.agingDays - a.agingDays
        }
        if (sortConfig.key === 'nominal') {
          return sortConfig.direction === 'asc' ? a.nominal_claim - b.nominal_claim : b.nominal_claim - a.nominal_claim
        }
        return 0
      })
    }

    return result
  }, [processedData, search, filterEkspedisi, filterKategori, filterPic, filterStatus, sortConfig])

  // --- SUMMARY STATS ---
  const stats = useMemo(() => {
    let totalKasus = filteredData.length
    let totalKasusNominal = filteredData.reduce((acc, d) => acc + d.nominal_claim, 0)
    
    let pengajuanResi = 0
    let pengajuanNominal = 0
    let approvedResi = 0
    let approvedNominal = 0
    let cancelRejectResi = 0
    let cancelRejectNominal = 0

    filteredData.forEach(d => {
      const finalStat = (d.status_final || '').toLowerCase()
      const progStat = (d.status_progres || '').toLowerCase()

      if (!d.status_final || progStat.includes('pengajuan') || progStat.includes('claim')) {
        pengajuanResi++
        pengajuanNominal += d.nominal_claim
      }

      if (finalStat.includes('approved')) {
        approvedResi++
        approvedNominal += d.nominal_claim
      }

      if (finalStat.includes('reject') || finalStat.includes('cancel')) {
        cancelRejectResi++
        cancelRejectNominal += d.nominal_claim
      }
    })

    return { 
      totalKasus, 
      totalKasusNominal, 
      pengajuanResi, 
      pengajuanNominal, 
      approvedResi, 
      approvedNominal, 
      cancelRejectResi, 
      cancelRejectNominal 
    }
  }, [filteredData])

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  useEffect(() => { setCurrentPage(1) }, [search, filterEkspedisi, filterKategori, filterPic, filterStatus])

  const handleSort = (key: 'aging' | 'nominal') => {
    setSortConfig(prev => ({
      key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  // --- EXPORT CSV ---
  const exportToCSV = () => {
    if (filteredData.length === 0) return
    const headers = ['AWB', 'KLIEN', 'EKSPEDISI', 'KASUS', 'STATUS PROGRES', 'STATUS FINAL', 'TGL MASUK', 'TGL MUTASI', 'AGING (HARI)', 'NOMINAL CLAIM', 'KETERANGAN', 'PIC STAFF']
    const csvContent = [
      headers.join(','),
      ...filteredData.map(d => [
        d.awb, `"${d.klien}"`, d.ekspedisi, d.kasus, d.status_progres, d.status_final || '', 
        d.tgl_masuk, d.tgl_mutasi || '', d.agingDays, d.nominal_claim, `"${d.keterangan.replace(/"/g, '""')}"`, d.pic_staff
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Export_Klaim_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const ekspedisiList = ['All', 'J&T EXPRESS', 'NINJA EXPRESS', 'SHOPEE EXPRESS', 'SICEPAT']
  const kategoriList = ['All', 'PAKET STUCK', 'RETUR BERMASALAH', 'BARANG HILANG']
  const finalStatusList = ['All', 'Open', 'Approved Claim', 'Cancel Claim', 'Reject Claim']

  return (
    <main className="p-8 max-w-[1600px] w-full mx-auto space-y-6 bg-zinc-50/50 min-h-screen pb-20">
      
      {/* HEADER & SYNC */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Tracker & Monitoring Klaim</h1>
          <p className="text-sm text-zinc-500 mt-1">Real-time synchronization data dari Google Sheets operasional klaim.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
            {syncInfo.status === 'loading' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
            {syncInfo.status === 'success' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
            {syncInfo.status === 'error' && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
            <span>Terakhir disinkron: {syncInfo.time || 'Belum pernah'}</span>
          </div>
          <button onClick={fetchData} disabled={syncInfo.status === 'loading'} className="px-5 py-2.5 bg-zinc-900 hover:bg-black disabled:bg-zinc-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${syncInfo.status === 'loading' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sinkronisasi Data
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        
        {/* Card 1: Total Kasus Klaim */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-1 relative overflow-hidden">
          <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Total Kasus Klaim</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-zinc-900">{stats.totalKasus.toLocaleString('id-ID')} Resi</span>
            <span className="text-xs font-bold text-zinc-400">|</span>
            <span className="text-sm font-bold text-zinc-700">{formatRupiah(stats.totalKasusNominal)}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-2">↳ Akumulasi Keseluruhan Kasus Klaim</span>
        </div>

        {/* Card 2: Total Pengajuan Klaim */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col gap-1 relative overflow-hidden">
          <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Total Pengajuan Klaim</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-zinc-900">{stats.pengajuanResi.toLocaleString('id-ID')} Resi</span>
            <span className="text-xs font-bold text-zinc-400">|</span>
            <span className="text-sm font-bold text-zinc-700">{formatRupiah(stats.pengajuanNominal)}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-2">↳ Kasus Klaim Yang sedang dalam proses pengajuan.</span>
        </div>

        {/* Card 3: Total Approved */}
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col gap-1 relative overflow-hidden">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Total Approved (Pencairan)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{formatRupiah(stats.approvedNominal)}</span>
            <span className="text-xs font-bold text-emerald-400">|</span>
            <span className="text-sm font-bold text-emerald-700">{stats.approvedResi.toLocaleString('id-ID')} Resi</span>
          </div>
          <span className="text-[10px] text-emerald-500/70 mt-2">↳ Nominal dana yang diterima.</span>
        </div>

        {/* Card 4: Cancel / Reject Claim */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col gap-1 relative overflow-hidden md:col-span-3">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Cancel / Reject Claim</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{stats.cancelRejectResi.toLocaleString('id-ID')} Resi</span>
            <span className="text-xs font-bold text-rose-400">|</span>
            <span className="text-sm font-bold text-rose-700">{formatRupiah(stats.cancelRejectNominal)}</span>
          </div>
          <span className="text-[10px] text-rose-500/70 mt-2">↳ Klaim ditolak atau hangus.</span>
        </div>

      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Cari No. AWB, Nama Klien, Keterangan..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition" 
            />
            <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">🔍</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={filterEkspedisi} onChange={e => setFilterEkspedisi(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {ekspedisiList.map(e => <option key={e} value={e}>{e === 'All' ? 'Ekspedisi' : e}</option>)}
            </select>
            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {kategoriList.map(k => <option key={k} value={k}>{k === 'All' ? 'Kategori Case' : k}</option>)}
            </select>
            <select value={filterPic} onChange={e => setFilterPic(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              <option value="All">PIC Staff</option>
              {Object.entries(picWorkload).map(([pic, count]) => (
                <option key={pic} value={pic}>{pic} • {count}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {finalStatusList.map(s => <option key={s} value={s}>{s === 'All' ? 'Final Status' : s}</option>)}
            </select>
            
            <button onClick={exportToCSV} className="ml-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5">
              ⤓ Export CSV
            </button>
          </div>
        </div>

        {/* ACTIVE CHIPS */}
        {(search || filterEkspedisi !== 'All' || filterKategori !== 'All' || filterPic !== 'All' || filterStatus !== 'All') && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
            {filterEkspedisi !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Ekspedisi: {filterEkspedisi} <button onClick={() => setFilterEkspedisi('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterKategori !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Kategori: {filterKategori} <button onClick={() => setFilterKategori('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterPic !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">PIC: {filterPic} <button onClick={() => setFilterPic('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterStatus !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Status: {filterStatus} <button onClick={() => setFilterStatus('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            
            <button onClick={() => { setSearch(''); setFilterEkspedisi('All'); setFilterKategori('All'); setFilterPic('All'); setFilterStatus('All'); }} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 underline ml-2 cursor-pointer">
              Hapus semua filter
            </button>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
              <tr>
                <th className="px-5 py-4">NO. AWB & KLIEN</th>
                <th className="px-5 py-4">EKSPEDISI & KASUS</th>
                <th className="px-5 py-4">STATUS PROGRES → FINAL</th>
                <th className="px-5 py-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => handleSort('aging')}>
                  TIMELINE & AGING {sortConfig.key === 'aging' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => handleSort('nominal')}>
                  NOMINAL CLAIM {sortConfig.key === 'nominal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4">KETERANGAN</th>
                <th className="px-5 py-4 text-right">PIC STAFF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-zinc-400 font-bold animate-pulse">Memuat Data dari Google Sheets...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-zinc-500 font-medium">Tidak ada data klaim yang sesuai filter.</td></tr>
              ) : (
                paginatedData.map((item) => {
                  const { tags, sisaTeks } = parseTagKeterangan(item.keterangan || '')
                  const isHighValue = item.nominal_claim > 200000
                  const avatarInitial = item.pic_staff.substring(0, 2).toUpperCase()

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 transition group">
                      <td className="px-5 py-4">
                        <div className="font-black text-zinc-900 text-sm">{item.awb}</div>
                        <div className="text-zinc-500 font-medium mt-0.5">{item.klien}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-zinc-800">{item.ekspedisi}</div>
                        <div className="text-rose-600 font-bold text-[10px] uppercase tracking-wide mt-1">{item.kasus}</div>
                      </td>
                      
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 font-medium">{item.status_progres}</span>
                          <span className="text-zinc-300">→</span>
                          {item.status_final ? (
                            <span className={`font-black ${
                              item.status_final.includes('Approved') ? 'text-emerald-600' : 
                              item.status_final.includes('Reject') || item.status_final.includes('Cancel') ? 'text-rose-600' : 'text-zinc-800'
                            }`}>
                              {item.status_final}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Belum Final</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] space-y-1">
                        <div className="text-zinc-600 flex items-center gap-1">
                          <span className="text-blue-500">📥</span> Masuk: {item.tglMasukObj.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric'})}
                        </div>
                        {item.isFinal && item.tglMutasiObj && (
                          <div className="text-zinc-600 flex items-center gap-1">
                            <span className="text-emerald-500">📤</span> Mutasi: {item.tglMutasiObj.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric'})}
                          </div>
                        )}
                        <div className={`inline-flex items-center gap-1 mt-1 font-extrabold ${
                          item.isFinal ? 'text-emerald-600' :
                          item.agingStatus === 'red' ? 'text-rose-600' : 
                          item.agingStatus === 'yellow' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {item.isFinal ? `✓ Selesai ${item.agingDays} hari` : `⏳ ${item.agingDays} hari - belum final`}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className={`font-mono ${isHighValue ? 'text-rose-600 font-black text-sm' : 'text-zinc-800 font-bold'}`}>
                          {formatRupiah(item.nominal_claim)}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-normal max-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.map((t, i) => (
                                <span key={i} className="bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">{t}</span>
                              ))}
                            </div>
                          )}
                          {sisaTeks && <span className="text-zinc-600 text-[11px] leading-snug">{sisaTeks}</span>}
                          {!tags.length && !sisaTeks && <span className="text-zinc-400">—</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-zinc-200 rounded-full shadow-2xs">
                          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] font-black">{avatarInitial}</span>
                          <span className="font-bold text-zinc-800">{item.pic_staff}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {filteredData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 border-t border-zinc-200 bg-white text-[11px]">
            <div className="text-zinc-500 font-medium flex items-center gap-2">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} dari <span className="font-bold text-zinc-900">{filteredData.length.toLocaleString('id-ID')} kasus</span>
              
              <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1)}} className="ml-2 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none cursor-pointer">
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white border border-zinc-200 rounded text-zinc-600 font-bold disabled:opacity-40 hover:bg-zinc-50 transition cursor-pointer">
                &lt; Sebelumnya
              </button>
              
              <div className="flex items-center gap-1 px-2">
                {[...Array(Math.min(3, totalPages))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${currentPage === pageNum ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                      {pageNum}
                    </button>
                  )
                })}
                {totalPages > 3 && <span className="text-zinc-400 px-1">...</span>}
                {totalPages > 3 && (
                  <button onClick={() => setCurrentPage(totalPages)} className={`w-8 h-6 flex items-center justify-center rounded text-[10px] font-bold ${currentPage === totalPages ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                    {totalPages}
                  </button>
                )}
              </div>

              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 bg-white border border-zinc-200 rounded text-zinc-600 font-bold disabled:opacity-40 hover:bg-zinc-50 transition cursor-pointer">
                Berikutnya &gt;
              </button>
            </div>
          </div>
        )}
      </div>

    </main>
  )
}
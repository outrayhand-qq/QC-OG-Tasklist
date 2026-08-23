'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// --- TYPE DEFINITIONS ---
type KlaimData = {
  id: string
  user: string
  jenis_ekspedisi: string
  date_added: string
  bulan: string
  client_name: string
  no_awb: string
  kategori_case: string
  update_status: string
  final_status: string | null
  keterangan: string
  tgl_mutasi: string | null
  nominal_claim: number
  sla: string
}

// --- HELPER FUNCTIONS ---
const parseTagKeterangan = (text: string) => {
  const tags: string[] = []
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

// ✅ FUNGSI BARU: Generate bulan dari date_added
const generateBulanFromDate = (dateString: string): string => {
  if (!dateString || dateString === '-') return ''
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
    const bulanMap = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    
    const bulan = bulanMap[date.getMonth()]
    const tahun = date.getFullYear()
    
    return `${bulan} ${tahun}`
  } catch {
    return ''
  }
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

  // --- ACCESS CONTROL ---
  useEffect(() => {
    const isLogged = localStorage.getItem('isLoggedIn')
    const role = (localStorage.getItem('userRole') || '').toLowerCase().trim()
    
    if (!isLogged) {
      router.push('/')
      return
    }

    const allowedRoles = ['superadmin', 'tlqc']
    if (role && !allowedRoles.includes(role)) {
      alert('Akses ditolak. Halaman ini hanya untuk Superadmin dan TL QC.')
      router.push('/')
    }
  }, [router])

  const fetchData = async () => {
    setSyncInfo(prev => ({ ...prev, status: 'loading' }))
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbylwHe4pvQIl7a1gnNynbUqZG6U5Aa7pPpByICiznMPSRO-JYMR1HavlStzCt_gAoYKCg/exec')
      const result: any = await response.json()
      
      let rawArray: any = result.data || result.rows || result || []
      
      if (!Array.isArray(rawArray)) {
        const possibleArrays = Object.values(result).filter((v: any) => Array.isArray(v))
        if (possibleArrays.length > 0) rawArray = possibleArrays[0]
        else rawArray = []
      }

      const isArrayOfArrays = rawArray.length > 0 && Array.isArray(rawArray[0])
      let mappedData: KlaimData[] = []

      if (isArrayOfArrays) {
        const firstRow = rawArray[0]
        const isHeader = firstRow.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('bulan'))
        const dataRows = isHeader ? rawArray.slice(1) : rawArray

        const col = {
          user: 0,
          jenis_ekspedisi: 1,
          date_added: 2,
          bulan: 3,
          client_name: 4,
          no_awb: 5,
          kategori_case: 6,
          update_status: 7,
          final_status: 8,
          keterangan: 9,
          tgl_mutasi: 10,
          nominal_claim: 11,
          sla: 12
        }

        mappedData = dataRows.map((row: any[], index: number) => {
          const dateAdded = String(row[col.date_added] || '')
          // ✅ GENERATE BULAN DARI DATE_ADDED (TIDAK BERGANTUNG KOLOM BULAN)
          const generatedBulan = generateBulanFromDate(dateAdded)
          
          return {
            id: String(row[0] || index + 1),
            user: String(row[col.user] || 'Staff'),
            jenis_ekspedisi: String(row[col.jenis_ekspedisi] || '-'),
            date_added: dateAdded,
            bulan: generatedBulan, // ✅ PAKAI HASIL GENERATE
            client_name: String(row[col.client_name] || '-'),
            no_awb: String(row[col.no_awb] || '-'),
            kategori_case: String(row[col.kategori_case] || '-'),
            update_status: String(row[col.update_status] || '-'),
            final_status: row[col.final_status] || null,
            keterangan: String(row[col.keterangan] || ''),
            tgl_mutasi: row[col.tgl_mutasi] || null,
            nominal_claim: Number(row[col.nominal_claim] || 0),
            sla: String(row[col.sla] || '-')
          }
        })
      } else {
        mappedData = rawArray.map((item: any, index: number) => {
          const dateAdded = String(item.date_added || item.DATE_ADDED || item.tgl_masuk || '')
          // ✅ GENERATE BULAN DARI DATE_ADDED
          const generatedBulan = generateBulanFromDate(dateAdded)
          
          return {
            id: String(item.id || item.ID || index + 1),
            user: String(item.user || item.USER || item.pic_staff || 'Staff'),
            jenis_ekspedisi: String(item.jenis_ekspedisi || item.JENIS_EKSPEDISI || item.ekspedisi || '-'),
            date_added: dateAdded,
            bulan: generatedBulan, // ✅ PAKAI HASIL GENERATE
            client_name: String(item.client_name || item.CLIENT_NAME || item.klien || '-'),
            no_awb: String(item.no_awb || item.NO_AWB || item.awb || '-'),
            kategori_case: String(item.kategori_case || item.KATEGORI_CASE || item.kasus || '-'),
            update_status: String(item.update_status || item.UPDATE_STATUS || item.status_progres || '-'),
            final_status: item.final_status || item.FINAL_STATUS || item.status_final || null,
            keterangan: String(item.keterangan || item.KETERANGAN || ''),
            tgl_mutasi: item.tgl_mutasi || item.TGL_MUTASI || null,
            nominal_claim: Number(item.nominal_claim || item.NOMINAL_CLAIM || 0),
            sla: String(item.sla || item.SLA || '-')
          }
        })
      }

      console.log('✅ Sample bulan values:', mappedData.slice(0, 10).map(d => d.bulan))

      setData(mappedData)
      
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
      const timeStr = `${formatter.format(now)} WIB`
      
      setSyncInfo({ time: timeStr, status: 'success' })
      localStorage.setItem('lastKlaimSync', timeStr)
    } catch (err) {
      console.error('Gagal mengambil data:', err)
      setSyncInfo(prev => ({ ...prev, status: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedTime = localStorage.getItem('lastKlaimSync')
    if (savedTime) setSyncInfo({ time: savedTime, status: 'idle' })
    fetchData()
  }, [])

  // --- DYNAMIC FILTER LISTS ---
  const bulanList = useMemo(() => {
    const setBulan = new Set<string>()
    
    data.forEach(d => {
      const bulanValue = d.bulan ? d.bulan.trim() : ''
      
      if (bulanValue === '' || bulanValue === '-' || bulanValue.toLowerCase() === 'null') {
        setBulan.add('(Tanpa Bulan)')
      } else {
        setBulan.add(bulanValue)
      }
    })
    
    const allBulan = Array.from(setBulan)
    const tanpaBulan = allBulan.filter(b => b === '(Tanpa Bulan)')
    const withBulan = allBulan.filter(b => b !== '(Tanpa Bulan)').sort((a, b) => {
      const parseBulan = (bulanStr: string) => {
        const parts = bulanStr.split(' ')
        const bulanName = parts[0]
        const tahun = parts[1] || '0000'
        
        const bulanMap: Record<string, number> = {
          'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4,
          'Mei': 5, 'Juni': 6, 'Juli': 7, 'Agustus': 8,
          'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12
        }
        
        const bulanNum = bulanMap[bulanName] || 0
        return `${tahun}-${String(bulanNum).padStart(2, '0')}`
      }
      
      return parseBulan(a).localeCompare(parseBulan(b))
    })
    
    return ['All', ...tanpaBulan, ...withBulan]
  }, [data])

  const ekspedisiList = useMemo(() => {
    const setEks = new Set<string>()
    data.forEach(d => {
      if (d.jenis_ekspedisi && d.jenis_ekspedisi !== '-' && d.jenis_ekspedisi.trim() !== '') {
        setEks.add(d.jenis_ekspedisi.trim())
      }
    })
    return ['All', ...Array.from(setEks)]
  }, [data])

  const kategoriList = useMemo(() => {
    const setKat = new Set<string>()
    data.forEach(d => {
      if (d.kategori_case && d.kategori_case !== '-' && d.kategori_case.trim() !== '') {
        setKat.add(d.kategori_case.trim())
      }
    })
    return ['All', ...Array.from(setKat)]
  }, [data])

  // --- DATA PROCESSING (AGING LOGIC) ---
  const processedData = useMemo(() => {
    const today = new Date()
    
    return data.map(item => {
      const tglMasuk = new Date(item.date_added)
      let tglAkhir = today
      let isFinal = false

      if (item.final_status && item.tgl_mutasi) {
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
      const pic = d.user || 'Staff'
      if (!counts[pic]) counts[pic] = 0
      counts[pic]++
    })
    return counts
  }, [processedData])

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    let result = processedData

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d => 
        d.no_awb.toLowerCase().includes(q) || 
        d.client_name.toLowerCase().includes(q) || 
        d.keterangan.toLowerCase().includes(q)
      )
    }
    
    if (filterBulan !== 'All') {
      result = result.filter(d => {
        const dataBulan = d.bulan ? d.bulan.trim() : ''
        
        if (filterBulan === '(Tanpa Bulan)') {
          return dataBulan === '' || dataBulan === '-' || dataBulan.toLowerCase() === 'null'
        }
        
        return dataBulan.toLowerCase() === filterBulan.toLowerCase()
      })
    }
    
    if (filterEkspedisi !== 'All') {
      result = result.filter(d => d.jenis_ekspedisi.toLowerCase() === filterEkspedisi.toLowerCase())
    }
    if (filterKategori !== 'All') {
      result = result.filter(d => d.kategori_case.toLowerCase() === filterKategori.toLowerCase())
    }
    if (filterPic !== 'All') {
      result = result.filter(d => d.user.toLowerCase() === filterPic.toLowerCase())
    }
    if (filterStatus !== 'All') {
      if (filterStatus === 'Open') result = result.filter(d => !d.isFinal)
      else result = result.filter(d => (d.final_status || '').toLowerCase() === filterStatus.toLowerCase())
    }

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
  }, [processedData, search, filterBulan, filterEkspedisi, filterKategori, filterPic, filterStatus, sortConfig])

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
      const finalStat = (d.final_status || '').toLowerCase()
      const progStat = (d.update_status || '').toLowerCase()

      if (!d.final_status || finalStat.trim() === '' || progStat.includes('pengajuan') || progStat.includes('claim')) {
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

  useEffect(() => { setCurrentPage(1) }, [search, filterBulan, filterEkspedisi, filterKategori, filterPic, filterStatus])

  const handleSort = (key: 'aging' | 'nominal') => {
    setSortConfig(prev => ({
      key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const exportToCSV = () => {
    if (filteredData.length === 0) return
    const headers = ['AWB', 'KLIEN', 'EKSPEDISI', 'KASUS', 'STATUS PROGRES', 'STATUS FINAL', 'TGL MASUK', 'TGL MUTASI', 'AGING (HARI)', 'NOMINAL CLAIM', 'KETERANGAN', 'PIC STAFF', 'BULAN']
    const csvContent = [
      headers.join(','),
      ...filteredData.map(d => [
        d.no_awb, `"${d.client_name}"`, d.jenis_ekspedisi, d.kategori_case, d.update_status, d.final_status || '', 
        d.date_added, d.tgl_mutasi || '', d.agingDays, d.nominal_claim, `"${d.keterangan.replace(/"/g, '""')}"`, d.user, d.bulan
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

  const finalStatusList = ['All', 'Open', 'Approved Claim', 'Cancel Claim', 'Reject Claim']

  return (
    <main className="p-8 max-w-[1600px] w-full mx-auto space-y-6 bg-zinc-50/50 min-h-screen pb-20">
      
      {/* HEADER & SYNC */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Tracker & Monitoring Klaim</h1>
          <p className="text-sm text-zinc-500 mt-1">Dashboard Monitoring Operasional dan Resolusi Klaim.</p>
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

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between gap-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Kasus Klaim</span>
          <div>
            <div className="text-xl font-black text-zinc-900">{stats.totalKasus.toLocaleString('id-ID')} Resi</div>
            <div className="text-sm font-bold text-zinc-700 mt-0.5">{formatRupiah(stats.totalKasusNominal)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-between gap-2">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Total Pengajuan Klaim</span>
          <div>
            <div className="text-xl font-black text-zinc-900">{stats.pengajuanResi.toLocaleString('id-ID')} Resi</div>
            <div className="text-sm font-bold text-zinc-700 mt-0.5">{formatRupiah(stats.pengajuanNominal)}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between gap-2">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Total Approved (Pencairan)</span>
          <div>
            <div className="text-lg font-black text-emerald-600">{formatRupiah(stats.approvedNominal)}</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">{stats.approvedResi.toLocaleString('id-ID')} Resi</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between gap-2">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">Cancel / Reject Claim</span>
          <div>
            <div className="text-xl font-black text-rose-600">{stats.cancelRejectResi.toLocaleString('id-ID')} Resi</div>
            <div className="text-sm font-bold text-rose-700 mt-0.5">{formatRupiah(stats.cancelRejectNominal)}</div>
          </div>
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
            <select value={filterBulan} onChange={e => setFilterBulan(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {bulanList.map(b => (
                <option key={b} value={b}>
                  {b === 'All' ? 'Semua Bulan' : b === '(Tanpa Bulan)' ? '⚠️ Tanpa Bulan' : b}
                </option>
              ))}
            </select>
            <select value={filterEkspedisi} onChange={e => setFilterEkspedisi(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {ekspedisiList.map(e => <option key={e} value={e}>{e === 'All' ? 'Semua Ekspedisi' : e}</option>)}
            </select>
            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {kategoriList.map(k => <option key={k} value={k}>{k === 'All' ? 'Semua Kategori' : k}</option>)}
            </select>
            <select value={filterPic} onChange={e => setFilterPic(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              <option value="All">Semua PIC Staff</option>
              {Object.entries(picWorkload).map(([pic, count]) => (
                <option key={pic} value={pic}>{pic} • {count}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-800 cursor-pointer focus:outline-none">
              {finalStatusList.map(s => <option key={s} value={s}>{s === 'All' ? 'Semua Status' : s}</option>)}
            </select>
            
            <button onClick={exportToCSV} className="ml-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5">
              ⤓ Export CSV
            </button>
          </div>
        </div>

        {/* ACTIVE CHIPS */}
        {(search || filterBulan !== 'All' || filterEkspedisi !== 'All' || filterKategori !== 'All' || filterPic !== 'All' || filterStatus !== 'All') && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
            {filterBulan !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Bulan: {filterBulan} <button onClick={() => setFilterBulan('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterEkspedisi !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Ekspedisi: {filterEkspedisi} <button onClick={() => setFilterEkspedisi('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterKategori !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Kategori: {filterKategori} <button onClick={() => setFilterKategori('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterPic !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">PIC: {filterPic} <button onClick={() => setFilterPic('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            {filterStatus !== 'All' && <span className="bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-[11px] font-bold text-zinc-700 flex items-center gap-1.5">Status: {filterStatus} <button onClick={() => setFilterStatus('All')} className="text-zinc-400 hover:text-rose-600">✕</button></span>}
            
            <button onClick={() => { setSearch(''); setFilterBulan('All'); setFilterEkspedisi('All'); setFilterKategori('All'); setFilterPic('All'); setFilterStatus('All'); }} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 underline ml-2 cursor-pointer">
              Hapus semua filter
            </button>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
              <tr>
                <th className="px-5 py-4 text-center">NO. AWB & KLIEN</th>
                <th className="px-5 py-4 text-center">EKSPEDISI & KASUS</th>
                <th className="px-5 py-4 text-center">STATUS PROGRES → FINAL</th>
                <th className="px-5 py-4 text-center cursor-pointer hover:bg-zinc-100 transition" onClick={() => handleSort('aging')}>
                  TIMELINE & AGING {sortConfig.key === 'aging' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4 text-center cursor-pointer hover:bg-zinc-100 transition" onClick={() => handleSort('nominal')}>
                  NOMINAL CLAIM {sortConfig.key === 'nominal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-5 py-4 text-center">KETERANGAN</th>
                <th className="px-5 py-4 text-center">PIC STAFF</th>
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
                  const avatarInitial = item.user.substring(0, 2).toUpperCase()

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 transition group align-middle">
                      <td className="px-5 py-4 text-center">
                        <div className="font-black text-zinc-900 text-sm">{item.no_awb}</div>
                        <div className="text-zinc-500 font-medium mt-0.5">{item.client_name}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="font-bold text-zinc-800">{item.jenis_ekspedisi}</div>
                        <div className="text-rose-600 font-bold text-[10px] uppercase tracking-wide mt-1">{item.kategori_case}</div>
                      </td>
                      
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <span className="text-zinc-500 font-medium">{item.update_status}</span>
                          <span className="text-zinc-300">→</span>
                          {item.final_status ? (
                            <span className={`font-black ${
                              item.final_status.toLowerCase().includes('approved') ? 'text-emerald-600' : 
                              item.final_status.toLowerCase().includes('reject') || item.final_status.toLowerCase().includes('cancel') ? 'text-rose-600' : 'text-zinc-800'
                            }`}>
                              {item.final_status}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Pengajuan Klaim</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center font-mono text-[11px] space-y-1">
                        <div className="text-zinc-600 flex items-center justify-center gap-1">
                          <span className="text-blue-500">📥</span> Masuk: {!isNaN(item.tglMasukObj.getTime()) ? item.tglMasukObj.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric'}) : '-'}
                        </div>
                        {item.isFinal && item.tglMutasiObj && !isNaN(item.tglMutasiObj.getTime()) && (
                          <div className="text-zinc-600 flex items-center justify-center gap-1">
                            <span className="text-emerald-500">📤</span> Mutasi: {item.tglMutasiObj.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric'})}
                          </div>
                        )}
                        <div className={`inline-flex items-center justify-center gap-1 mt-1 font-extrabold ${
                          item.isFinal ? 'text-emerald-600' :
                          item.agingStatus === 'red' ? 'text-rose-600' : 
                          item.agingStatus === 'yellow' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {item.isFinal ? `✓ Selesai ${item.agingDays} Hari` : `⏳ Pengajuan Klaim (Hari Ke ${item.agingDays})`}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className={`font-mono ${isHighValue ? 'text-rose-600 font-black text-sm' : 'text-zinc-800 font-bold'}`}>
                          {formatRupiah(item.nominal_claim)}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-normal max-w-[200px] mx-auto">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          {tags.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1">
                              {tags.map((t, i) => (
                                <span key={i} className="bg-zinc-100 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-bold">{t}</span>
                              ))}
                            </div>
                          )}
                          {sisaTeks && <span className="text-zinc-600 text-[11px] leading-snug">{sisaTeks}</span>}
                          {!tags.length && !sisaTeks && <span className="text-zinc-400">—</span>}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2 px-2.5 py-1 bg-white border border-zinc-200 rounded-full shadow-2xs mx-auto">
                          <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] font-black">{avatarInitial}</span>
                          <span className="font-bold text-zinc-800">{item.user}</span>
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
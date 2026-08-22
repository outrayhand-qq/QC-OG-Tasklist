'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffKlaimDashboard() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // State Filter
  const [selectedEkspedisi, setSelectedEkspedisi] = useState<string>('All')
  const [selectedCase, setSelectedCase] = useState<string>('All')
  const [selectedUser, setSelectedUser] = useState<string>('All')
  const [selectedBulan, setSelectedBulan] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')

  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 50

  useEffect(() => {
    const isLogged = localStorage.getItem('isLoggedIn')
    if (!isLogged) {
      router.push('/')
    }
  }, [router])

  const fetchDataFromSheet = async () => {
    setLoading(true)
    try {
      const url = 'https://script.google.com/macros/s/AKfycbylwHe4pvQIl7a1gnNynbUqZG6U5Aa7pPpByICiznMPSRO-JYMR1HavlStzCt_gAoYKCg/exec'
      if (url.includes('MASUKKAN_URL')) {
        setLoading(false)
        return
      }
      const res = await fetch(url)
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Gagal mengambil data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDataFromSheet()
  }, [])

  // Helper super tangguh: Mencari berdasarkan key, atau langsung ambil kolom ke-colIndex (0 untuk User/Kolom A)
  const getVal = (item: any, possibleKeys: string[], colIndex?: number) => {
    const itemKeys = Object.keys(item)
    
    // 1. Cari berdasarkan nama key (diabaikan spasi/huruf besar-kecil)
    for (const key of possibleKeys) {
      const cleanKey = key.toLowerCase().replace(/[\s_]/g, '')
      const found = itemKeys.find(
        (k) => k.toLowerCase().replace(/[\s_]/g, '') === cleanKey
      )
      if (found !== undefined && item[found] !== null && item[found] !== '' && item[found] !== 'undefined') {
        return item[found]
      }
    }

    // 2. Jika tidak ketemu berdasarkan key, ambil langsung berdasarkan urutan kolom (index)
    if (colIndex !== undefined && Array.isArray(itemKeys) && itemKeys.length > colIndex) {
      const val = item[itemKeys[colIndex]]
      if (val !== null && val !== '' && val !== 'undefined') {
        return val
      }
    }

    return ''
  }

  // Ekstraksi nilai bulan yang cerdas
  const extractMonth = (item: any) => {
    let val = String(getVal(item, ['bulan', 'month']))
    if (val && val !== '-' && val.toLowerCase() !== 'invalid date') return val.trim()

    const dateVal = getVal(item, ['date_added', 'dateadded', 'tgl_pengajuan_ez'])
    if (dateVal) {
      try {
        const d = new Date(dateVal)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        }
        return String(dateVal)
      } catch {
        return String(dateVal)
      }
    }
    return ''
  }

  // Opsi Dropdown Unik (User dipaksa ambil dari indeks 0 / Kolom A)
  const uniqueUsers = useMemo(() => {
    const list = data.map(item => String(getVal(item, ['user', 'pic', 'staff', 'namastaff', 'picstaff'], 0)).trim())
    return Array.from(new Set(list)).filter(val => val && val !== 'undefined' && val !== 'null' && val !== '-' && val.length < 30).sort()
  }, [data])

  const uniqueBulan = useMemo(() => {
    const list = data.map(item => extractMonth(item))
    return Array.from(new Set(list)).filter(val => val && val !== 'undefined' && val !== 'null' && val !== '-').sort()
  }, [data])

  const uniqueStatus = useMemo(() => {
    const list = data.map(item => String(getVal(item, ['final_status', 'finalstatus', 'statusfinal'])).trim())
    return Array.from(new Set(list)).filter(val => val && val !== 'undefined' && val !== 'null' && val !== '-').sort()
  }, [data])

  // 1. FILTER DATA UTAMA
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const awb = String(getVal(item, ['no_awb', 'noawb'])).toLowerCase()
      const client = String(getVal(item, ['client_name', 'clientname'])).toLowerCase()
      const ket = String(getVal(item, ['keterangan'])).toLowerCase()
      
      const ekspedisiVal = String(getVal(item, ['jenis_ekspedisi', 'jenisekspedisi'])).trim()
      const caseVal = String(getVal(item, ['kategori_case', 'kategoricase'])).trim()
      const userVal = String(getVal(item, ['user', 'pic', 'staff', 'namastaff', 'picstaff'], 0)).trim()
      const bulanVal = extractMonth(item)
      const statusVal = String(getVal(item, ['final_status', 'finalstatus', 'statusfinal'])).trim()

      const query = searchQuery.toLowerCase()
      const matchesSearch = awb.includes(query) || client.includes(query) || ket.includes(query)
      
      const matchesEkspedisi = selectedEkspedisi === 'All' || ekspedisiVal.toLowerCase() === selectedEkspedisi.toLowerCase()
      const matchesCase = selectedCase === 'All' || caseVal.toLowerCase() === selectedCase.toLowerCase()
      const matchesUser = selectedUser === 'All' || userVal.toLowerCase() === selectedUser.toLowerCase()
      const matchesBulan = selectedBulan === 'All' || bulanVal.toLowerCase() === selectedBulan.toLowerCase()
      const matchesStatus = selectedStatus === 'All' || statusVal.toLowerCase() === selectedStatus.toLowerCase()

      return matchesSearch && matchesEkspedisi && matchesCase && matchesUser && matchesBulan && matchesStatus
    })
  }, [data, searchQuery, selectedEkspedisi, selectedCase, selectedUser, selectedBulan, selectedStatus])

  // Reset ke halaman 1 setiap kali filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedEkspedisi, selectedCase, selectedUser, selectedBulan, selectedStatus])

  // 2. STATISTIK DINAMIS (Mengikuti Filter Aktif)
  const stats = useMemo(() => {
    const totalKasus = filteredData.length
    let totalPengajuan = 0
    let totalRupiahApproved = 0
    let totalRejectCancel = 0

    filteredData.forEach((item) => {
      const tglAjuan = getVal(item, ['tgl_pengajuan_ez', 'tglpengajuanez'])
      if (tglAjuan) totalPengajuan += 1

      const fStatus = String(getVal(item, ['final_status', 'finalstatus', 'statusfinal'])).toLowerCase()
      if (fStatus.includes('approved')) {
        const nominal = Number(getVal(item, ['nominal_claim', 'nominalclaim'])) || 0
        totalRupiahApproved += nominal
      }
      if (fStatus.includes('cancel') || fStatus.includes('reject') || fStatus.includes('void')) {
        totalRejectCancel += 1
      }
    })

    return { totalKasus, totalPengajuan, totalRupiahApproved, totalRejectCancel }
  }, [filteredData])

  // 3. PAGINATION (50 Data Per Halaman)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage])

  const formatRupiah = (val: any) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  const formatDateDisplay = (dateVal: any) => {
    if (!dateVal) return '-'
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return String(dateVal)
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return String(dateVal)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
            Tracker & Monitoring Klaim
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time synchronization data dari Google Sheets operasional klaim.
          </p>
        </div>
        <button
          onClick={fetchDataFromSheet}
          className="px-3.5 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>↻</span>
          <span>Sinkronisasi Data</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Kasus Klaim</span>
          <div className="text-xl font-black text-zinc-900">{stats.totalKasus} Resi</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Pengajuan EZ</span>
          <div className="text-xl font-black text-sky-600">{stats.totalPengajuan} Kasus</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Approved (Pencairan)</span>
          <div className="text-xl font-black text-emerald-600">{formatRupiah(stats.totalRupiahApproved)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cancel / Reject Claim</span>
          <div className="text-xl font-black text-rose-600">{stats.totalRejectCancel} Kasus</div>
        </div>
      </div>

      {/* Toolbar & Filter Lengkap */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Cari No. AWB, Nama Klien, Keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 transition"
            />
            <span className="absolute left-2.5 top-2 text-zinc-400 text-xs">🔍</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select value={selectedBulan} onChange={(e) => setSelectedBulan(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Bulan (Semua)</option>
              {uniqueBulan.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select value={selectedEkspedisi} onChange={(e) => setSelectedEkspedisi(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Semua Ekspedisi</option>
              <option value="J&T EXPRESS">J&T EXPRESS</option>
              <option value="NINJA EXPRESS">NINJA EXPRESS</option>
              <option value="ID EXPRESS">ID EXPRESS</option>
              <option value="J&T VIP">J&T VIP</option>
              <option value="SPX EXPRESS">SPX EXPRESS</option>
              <option value="SAP EXPRESS">SAP EXPRESS</option>
            </select>

            <select value={selectedCase} onChange={(e) => setSelectedCase(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Kategori Case (Semua)</option>
              <option value="PAKET STUCK">PAKET STUCK</option>
              <option value="PAKET HILANG">PAKET HILANG</option>
              <option value="RETUR BERMASALAH">RETUR BERMASALAH</option>
              <option value="TTD PAKSA">TTD PAKSA</option>
              <option value="PTMP">PTMP</option>
              <option value="VOID">VOID</option>
              <option value="RUSAK">RUSAK</option>
              <option value="REMBES">REMBES</option>
            </select>

            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">PIC Staff (Semua)</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer">
              <option value="All">Final Status (Semua)</option>
              {uniqueStatus.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Klaim & Pagination */}
      <div className="bg-white border border-zinc-200/90 rounded-lg shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Menarik Data dari Google Sheets...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center text-xs text-zinc-500 font-medium space-y-1">
            <p className="font-bold text-zinc-700">Tidak ada data klaim ditemukan untuk filter ini.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/90 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                    <th className="py-3 px-4">No. AWB & Klien</th>
                    <th className="py-3 px-4">Ekspedisi & Kasus</th>
                    <th className="py-3 px-4">Status Progres</th>
                    <th className="py-3 px-4">Status Final</th>
                    <th className="py-3 px-4">Timeline Tanggal</th>
                    <th className="py-3 px-4 text-right">Nominal Claim</th>
                    <th className="py-3 px-4">Keterangan / Alur Update</th>
                    <th className="py-3 px-4">PIC Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-800">
                  {paginatedData.map((item, idx) => {
                    const finalStatText = String(getVal(item, ['final_status', 'finalstatus', 'statusfinal']) || 'Belum Putus')
                    const isApproved = finalStatText.toLowerCase().includes('approved')
                    const isRejectCancel = finalStatText.toLowerCase().includes('cancel') || finalStatText.toLowerCase().includes('reject')

                    const awbText = getVal(item, ['no_awb', 'noawb']) || '-'
                    const clientText = getVal(item, ['client_name', 'clientname']) || '-'
                    const ekspedisiText = getVal(item, ['jenis_ekspedisi', 'jenisekspedisi']) || '-'
                    const caseText = getVal(item, ['kategori_case', 'kategoricase']) || '-'
                    const updateStatText = getVal(item, ['update_status', 'updatestatus']) || 'Open'
                    const dateAddedVal = getVal(item, ['date_added', 'dateadded'])
                    const tglPengajuanVal = getVal(item, ['tgl_pengajuan_ez', 'tglpengajuanez'])
                    const tglMutasiVal = getVal(item, ['tgl_mutasi', 'tglmutasi'])
                    const nominalVal = getVal(item, ['nominal_claim', 'nominalclaim']) || 0
                    const ketText = getVal(item, ['keterangan']) || '-'
                    const userText = getVal(item, ['user', 'pic', 'staff', 'namastaff'], 0) || '-'

                    return (
                      <tr key={idx} className="hover:bg-zinc-50/70 transition">
                        <td className="py-3 px-4 align-middle">
                          <div className="font-mono font-bold text-zinc-900">{awbText}</div>
                          <div className="text-[11px] text-zinc-500 font-medium">{clientText}</div>
                        </td>
                        <td className="py-3 px-4 align-middle space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {ekspedisiText}
                          </span>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                              {caseText}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            {updateStatText}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : isRejectCancel ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                            {finalStatText}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle text-[11px] font-mono text-zinc-600 space-y-0.5">
                          <div>📥 Masuk: {formatDateDisplay(dateAddedVal)}</div>
                          {tglPengajuanVal && <div>📤 Ajuan: {formatDateDisplay(tglPengajuanVal)}</div>}
                          {tglMutasiVal && <div className="text-emerald-700 font-bold">💰 Mutasi: {formatDateDisplay(tglMutasiVal)}</div>}
                        </td>
                        <td className="py-3 px-4 align-middle text-right font-mono font-bold text-zinc-900">
                          {formatRupiah(nominalVal)}
                        </td>
                        <td className="py-3 px-4 align-middle max-w-xs truncate text-zinc-600" title={ketText}>
                          {ketText}
                        </td>
                        <td className="py-3 px-4 align-middle font-semibold text-zinc-700">
                          {userText}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-zinc-50/80 border-t border-zinc-200 text-xs">
              <div className="text-zinc-500 font-medium">
                Menampilkan <span className="font-bold text-zinc-800">{paginatedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> sampai <span className="font-bold text-zinc-800">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-bold text-zinc-800">{filteredData.length}</span> total data
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white border border-zinc-200 rounded text-zinc-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 transition cursor-pointer"
                >
                  Sebelumnya
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2))
                    .map((page, index, arr) => {
                      const prevPage = arr[index - 1]
                      const showEllipsisBefore = prevPage && page - prevPage > 1

                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsisBefore && <span className="px-1.5 text-zinc-400">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 flex items-center justify-center rounded font-bold transition cursor-pointer ${
                              currentPage === page
                                ? 'bg-black text-white shadow-2xs'
                                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      )
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white border border-zinc-200 rounded text-zinc-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 transition cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
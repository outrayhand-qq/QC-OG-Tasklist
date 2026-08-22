'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffKlaimDashboard() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedEkspedisi, setSelectedEkspedisi] = useState<string>('All')
  const [selectedCase, setSelectedCase] = useState<string>('All')

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

  const stats = useMemo(() => {
    const totalKasus = data.length
    const totalPengajuan = data.filter((item) => item.tgl_pengajuan_ez).length
    
    let totalRupiahApproved = 0
    let totalRejectCancel = 0

    data.forEach((item) => {
      const fStatus = String(item.final_status || '').toLowerCase()
      if (fStatus.includes('approved')) {
        const rawNominal = item.nominal_claim ?? 0
        totalRupiahApproved += Number(rawNominal) || 0
      }
      if (fStatus.includes('cancel') || fStatus.includes('reject')) {
        totalRejectCancel += 1
      }
    })

    return { totalKasus, totalPengajuan, totalRupiahApproved, totalRejectCancel }
  }, [data])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const awb = String(item.no_awb || '').toLowerCase()
      const client = String(item.client_name || '').toLowerCase()
      const ket = String(item.keterangan || '').toLowerCase()
      const query = searchQuery.toLowerCase()

      const matchesSearch = awb.includes(query) || client.includes(query) || ket.includes(query)
      const matchesEkspedisi = selectedEkspedisi === 'All' || item.jenis_ekspedisi === selectedEkspedisi
      const matchesCase = selectedCase === 'All' || item.kategori_case === selectedCase

      return matchesSearch && matchesEkspedisi && matchesCase
    })
  }, [data, searchQuery, selectedEkspedisi, selectedCase])

  const formatRupiah = (val: any) => {
    const num = Number(val ?? 0) || 0
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
    <main className="p-8 max-w-[1700px] w-full mx-auto space-y-6 pb-24 bg-zinc-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
            Dashboard Monitoring Staff Klaim
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-zinc-200/90 shadow-2xs">
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
          <select
            value={selectedEkspedisi}
            onChange={(e) => setSelectedEkspedisi(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Ekspedisi</option>
            <option value="J&T EXPRESS">J&T EXPRESS</option>
            <option value="NINJA EXPRESS">NINJA EXPRESS</option>
            <option value="ID EXPRESS">ID EXPRESS</option>
            <option value="J&T VIP">J&T VIP</option>
            <option value="SPX EXPRESS">SPX EXPRESS</option>
            <option value="SAP EXPRESS">SAP EXPRESS</option>
          </select>

          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 font-semibold text-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="All">Semua Kategori Case</option>
            <option value="PAKET STUCK">PAKET STUCK</option>
            <option value="PAKET HILANG">PAKET HILANG</option>
            <option value="RETUR BERMASALAH">RETUR BERMASALAH</option>
            <option value="TTD PAKSA">TTD PAKSA</option>
            <option value="PTMP">PTMP</option>
            <option value="VOID">VOID</option>
            <option value="RUSAK">RUSAK</option>
            <option value="REMBES">REMBES</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/90 rounded-lg shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest animate-pulse">
            Menarik Data dari Google Sheets...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-24 text-center text-xs text-zinc-500 font-medium space-y-1">
            <p className="font-bold text-zinc-700">Tidak ada data klaim ditemukan</p>
          </div>
        ) : (
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
                {filteredData.map((item, idx) => {
                  const finalStat = String(item.final_status || '').toLowerCase()
                  const isApproved = finalStat.includes('approved')
                  const isRejectCancel = finalStat.includes('cancel') || finalStat.includes('reject')

                  return (
                    <tr key={idx} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3 px-4 align-middle">
                        <div className="font-mono font-bold text-zinc-900">{item.no_awb || '-'}</div>
                        <div className="text-[11px] text-zinc-500 font-medium">{item.client_name || '-'}</div>
                      </td>
                      <td className="py-3 px-4 align-middle space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {item.jenis_ekspedisi || '-'}
                        </span>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                            {item.kategori_case || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span className="inline-block px-2.5 py-1 rounded text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          {item.update_status || 'Open'}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${isApproved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : isRejectCancel ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                          {item.final_status || 'Belum Putus'}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle text-[11px] font-mono text-zinc-600 space-y-0.5">
                        <div>📥 Masuk: {formatDateDisplay(item.date_added)}</div>
                        {item.tgl_pengajuan_ez && <div>📤 Ajuan: {formatDateDisplay(item.tgl_pengajuan_ez)}</div>}
                        {item.tgl_mutasi && <div className="text-emerald-700 font-bold">💰 Mutasi: {formatDateDisplay(item.tgl_mutasi)}</div>}
                      </td>
                      <td className="py-3 px-4 align-middle text-right font-mono font-bold text-zinc-900">
                        {formatRupiah(item.nominal_claim)}
                      </td>
                      <td className="py-3 px-4 align-middle max-w-xs truncate text-zinc-600" title={item.keterangan}>
                        {item.keterangan || '-'}
                      </td>
                      <td className="py-3 px-4 align-middle font-semibold text-zinc-700">
                        {item.user || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function TaskListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || ''
      setUserRole(role)
    }
  }, [])

  const isSuperAdmin = userRole === 'superadmin'

  // Cek apakah halaman aktif saat ini berada di Task TL
  const isTaskTLActive = pathname === '/tasklist/tl'

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col md:flex-row">
      {/* Sidebar Kiri */}
      <aside className="w-full md:w-64 bg-white border-r border-zinc-200/80 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 leading-tight">
              QC&Outgoing
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
              Dashboard Monitoring Control
            </p>
          </div>

          {/* Navigasi Menu */}
          <nav className="space-y-6 text-xs font-medium">
            
            {/* MENU SPESIAL SUPERADMIN */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block px-2">
                  Departemen
                </span>
                <div className="space-y-0.5">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                  >
                    <span>📊</span>
                    <span>Dashboard Utama</span>
                  </Link>
                  <Link
                    href="/outgoing"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                  >
                    <span>📦</span>
                    <span>Data Outgoing</span>
                  </Link>
                </div>
              </div>
            )}

            {/* MENU OPERASIONAL HARIAN - SEMUA ROLE BISA AKSES */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block px-2">
                Operasional Harian
              </span>
              <div className="space-y-0.5">
                <Link
                  href="/tasklist/tl"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                    isTaskTLActive
                      ? 'bg-black text-white font-bold'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span>📋</span>
                  <span>Task TL (QC & OG)</span>
                </Link>
              </div>
            </div>

            {/* MENU MONITORING & RTS KHUSUS SUPERADMIN */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block px-2">
                  Monitoring
                </span>
                <div className="space-y-0.5">
                  <Link
                    href="/monitoring-rts"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                  >
                    <span>📈</span>
                    <span>Monitoring RTS</span>
                  </Link>
                </div>
              </div>
            )}

            {/* MENU RESOLUSI & KENDALA - SUPERADMIN & TLQC */}
            {(isSuperAdmin || userRole === 'tlqc') && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block px-2">
                  Resolusi & Kendala
                </span>
                <div className="space-y-0.5">
                  {/* Log Komplain - HANYA SUPERADMIN */}
                  {isSuperAdmin && (
                    <Link
                      href="/log-komplain"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                    >
                      <span>💬</span>
                      <span>Log Komplain Harian</span>
                    </Link>
                  )}
                  
                  {/* Tracker Klaim - SUPERADMIN & TLQC */}
                  <Link
                    href="/tasklist/staff-klaim"
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                      pathname === '/tasklist/staff-klaim'
                        ? 'bg-black text-white font-bold'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <span>️</span>
                    <span>Tracker Klaim</span>
                  </Link>
                </div>
              </div>
            )}

          </nav>
        </div>

        {/* Info Hak Akses di Sidebar Bawah */}
        <div className="pt-6 border-t border-zinc-200/60 text-[11px] text-zinc-400">
          Role Akses: <strong className="text-zinc-700 uppercase">{userRole || 'Loading...'}</strong>
        </div>
      </aside>

      {/* Konten Utama Halaman */}
      <div className="flex-1 overflow-x-auto p-6 md:p-8">
        {children}
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TasklistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const isTLActive = pathname === '/tasklist/tl' || pathname === '/tasklist'
  const isStaffActive = pathname === '/tasklist/staff'

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
      `}</style>

      <div className="flex min-h-screen bg-[#F8FAFC] text-zinc-900 font-sans antialiased">
        
        {/* ================= SIDEBAR ================= */}
        <aside
          className={`bg-white border-r border-zinc-200/90 flex flex-col justify-between transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div>
            {/* Header / Logo (Ukuran Font Besar & Bold 900) */}
{/* Header / Logo */}
<div className="h-20 flex items-center justify-between px-6 border-b border-zinc-200/80 bg-white">
  {!sidebarCollapsed ? (
    <div className="flex flex-col">
      <h1 className="font-black text-3xl tracking-tighter text-black select-none leading-none">
        QC&Outgoing
      </h1>
      <span className="text-[8.5px] font-extrabold tracking-widest uppercase text-zinc-500 mt-1">
        Dashboard Monitoring Control
      </span>
    </div>
  ) : (
    <span className="font-black text-lg tracking-tight text-black">
      QC
    </span>
  )}
  <button
    type="button"
    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
    className="text-zinc-400 hover:text-black transition p-1 text-sm cursor-pointer"
  >
    {sidebarCollapsed ? '→' : '←'}
  </button>
</div>
            {/* Navigation Groups */}
            <nav className="p-3 space-y-6 mt-2 text-xs">
              
              {/* DEPARTEMEN */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
                    Departemen
                  </div>
                )}
                <div className="space-y-0.5">
                  <a href="#" className="flex items-center gap-3 px-3 py-2 font-medium rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
                    <span>◱</span>
                    {!sidebarCollapsed && <span>Dashboard Utama</span>}
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 font-medium rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
                    <span>▤</span>
                    {!sidebarCollapsed && <span>Data Outgoing</span>}
                  </a>
                </div>
              </div>

              {/* OPERASIONAL HARIAN */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
                    Operasional Harian
                  </div>
                )}
                <div className="space-y-1">
                  <div className="bg-zinc-100 rounded-md p-2 border border-zinc-200/80">
                    <div className="flex items-center gap-2.5 font-bold text-zinc-900 text-xs mb-1">
                      <span>⚡︎</span>
                      {!sidebarCollapsed && <span>Tasklist Operasional</span>}
                    </div>
                    
                    {!sidebarCollapsed && (
                      <div className="ml-5 space-y-1 mt-2 border-l-2 border-zinc-300 pl-3 text-[11px]">
                        <Link
                          href="/tasklist/tl"
                          className={`block py-0.5 transition ${
                            isTLActive
                              ? 'font-black text-black underline underline-offset-2'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Task TL (QC & OG)
                        </Link>
                        <Link
                          href="/tasklist/staff"
                          className={`block py-0.5 transition ${
                            isStaffActive
                              ? 'font-black text-black underline underline-offset-2'
                              : 'text-zinc-500 hover:text-zinc-900'
                          }`}
                        >
                          Task Staff
                        </Link>
                      </div>
                    )}
                  </div>

                  <a href="#" className="flex items-center gap-3 px-3 py-2 font-medium rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
                    <span>⚲</span>
                    {!sidebarCollapsed && <span>Monitoring RTS</span>}
                  </a>
                </div>
              </div>

              {/* RESOLUSI & KENDALA */}
              <div>
                {!sidebarCollapsed && (
                  <div className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2">
                    Resolusi & Kendala
                  </div>
                )}
                <div className="space-y-0.5">
                  <a href="#" className="flex items-center gap-3 px-3 py-2 font-medium rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
                    <span>💬</span>
                    {!sidebarCollapsed && <span>Log Komplain Harian</span>}
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 font-medium rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition">
                    <span>⚖</span>
                    {!sidebarCollapsed && <span>Tracker Klaim</span>}
                  </a>
                </div>
              </div>

            </nav>
          </div>

          {/* Profile Footer */}
          <div className="p-4 border-t border-zinc-200/80 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-zinc-300 bg-zinc-100 flex items-center justify-center font-bold text-zinc-800 text-xs">
                SA
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-900">Super Admin</span>
                  <span className="text-[10px] text-zinc-400 font-mono">SUPER ADMIN</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ================= PAGE CONTENT ================= */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {children}
        </div>

      </div>
    </>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CustomModal from '@/components/CustomModal'

export default function TaskListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') || ''
      const email = localStorage.getItem('userEmail') || ''
      setUserRole(role)
      setUserEmail(email)
    }
  }, [])

  const isSuperAdmin = userRole === 'superadmin'
  const isTaskTLActive = pathname === '/tasklist/tl'

  const handleLogoutConfirm = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    router.push('/')
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'superadmin': 'SA',
      'tlqc': 'TLQC',
      'tlog': 'TLOG',
      'staff_klaim': 'SK'
    }
    return roleMap[role.toLowerCase()] || role.toUpperCase()
  }

  const getRoleFull = (role: string) => {
    const roleMap: Record<string, string> = {
      'superadmin': 'Super Admin',
      'tlqc': 'TL QC',
      'tlog': 'TL Outgoing',
      'staff_klaim': 'Staff Klaim'
    }
    return roleMap[role.toLowerCase()] || role
  }

  return (
    <>
      <div className="h-screen bg-zinc-50/50 flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR - Tidak scroll */}
        <aside className="w-full md:w-64 bg-white border-r border-zinc-200/80 p-6 flex flex-col justify-between shrink-0 h-full">
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
                    <span></span>
                    <span>Task TL (QC & OG)</span>
                  </Link>
                </div>
              </div>

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

              {(isSuperAdmin || userRole === 'tlqc') && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block px-2">
                    Resolusi & Kendala
                  </span>
                  <div className="space-y-0.5">
                    {isSuperAdmin && (
                      <Link
                        href="/log-komplain"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                      >
                        <span>💬</span>
                        <span>Log Komplain Harian</span>
                      </Link>
                    )}
                    
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

          {/* User Bar di Sidebar Bottom */}
          <div className="pt-6 border-t border-zinc-200/60">
            <div 
              className="relative"
              onMouseEnter={() => {
                if (dropdownTimeout) clearTimeout(dropdownTimeout)
                setShowDropdown(true)
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => setShowDropdown(false), 200)
                setDropdownTimeout(timeout)
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 cursor-pointer transition">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-700 truncate">
                    {getRoleDisplay(userRole)}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {userEmail || 'Loading...'}
                  </div>
                </div>
              </div>

              {showDropdown && (
                <div className="absolute bottom-full left-0 mb-2 w-[200px] bg-white rounded-xl shadow-lg border border-zinc-200 py-2 z-50"
                  onMouseEnter={() => {
                    if (dropdownTimeout) clearTimeout(dropdownTimeout)
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setShowDropdown(false), 200)
                    setDropdownTimeout(timeout)
                  }}
                >
                  <div className="px-4 py-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{userEmail}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 pl-6">{getRoleFull(userRole)}</div>
                  </div>

                  <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-3 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-3 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archived Chats
                  </button>
                  
                  <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-3 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Suggestions
                  </button>

                  <div className="my-2 border-t border-zinc-200"></div>

                  <button 
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT - Bisa scroll */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>

      {/* Custom Logout Modal */}
      <CustomModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari sistem?"
        type="confirm"
        confirmText="Ya, Logout"
        cancelText="Batal"
      />
    </>
  )
}
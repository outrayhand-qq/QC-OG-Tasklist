'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Email dan password wajib diisi!')
      setLoading(false)
      return
    }

    try {
      const cleanEmail = email.trim().toLowerCase()

      // 1. Cek apakah email terdaftar dan apa rolenya di tabel db_users
      const { data: userData, error: userError } = await supabase
        .from('db_users')
        .select('role, email')
        .eq('email', cleanEmail)
        .single()

      if (userError || !userData) {
        setErrorMsg('Email tidak terdaftar sebagai hak akses sistem!')
        setLoading(false)
        return
      }

     // 2. Buat string waktu spesifik zona waktu Indonesia (WIB / UTC+7) yang presisi
      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as const
      const formatter = new Intl.DateTimeFormat('en-CA', options)
      const parts = formatter.formatToParts(new Date())
      
      const year = parts.find(p => p.type === 'year')?.value
      const month = parts.find(p => p.type === 'month')?.value
      const day = parts.find(p => p.type === 'day')?.value
      const hour = parts.find(p => p.type === 'hour')?.value
      const minute = parts.find(p => p.type === 'minute')?.value
      const second = parts.find(p => p.type === 'second')?.value

      const nowWIB = `${year}-${month}-${day} ${hour}:${minute}:${second}+07`

      // 3. Catat log login ke database Supabase dengan waktu WIB
      await supabase
        .from('db_login_logs')
        .insert([
          {
            email: cleanEmail,
            status: 'Success',
            created_at: nowWIB,
          },
        ])
        .select()
        .then(() => {}) // Abaikan jika tabel log belum ada

      // 4. Simpan sesi & role di browser
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', userData.email)
      localStorage.setItem('userRole', userData.role)

      // 5. Redirect ke halaman tasklist
      router.push('/tasklist/tl')

    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan sistem: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-zinc-900 leading-tight">
            QC&OG<br />Monitoring.
          </h1>
          <p className="text-xs text-zinc-500 font-medium">
            Dashboard performance.
          </p>
        </div>

        {/* Error Message jika ada */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email (cth: anda@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black transition"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black transition"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-zinc-600 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
              />
              <span>Ingat saya di perangkat ini</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            {!loading && <span>→</span>}
          </button>
        </form>

      </div>
    </main>
  )
}
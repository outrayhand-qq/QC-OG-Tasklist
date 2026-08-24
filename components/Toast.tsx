'use client'

import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, duration])

  // Styling dinamis berdasarkan tipe
  const bgClass = 
    type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/20' :
    type === 'error' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/20' :
    'bg-zinc-900 text-white shadow-zinc-500/20';

  return (
    <div className="fixed bottom-8 right-8 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`${bgClass} px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] backdrop-blur-md border border-white/10`}>
        <span className="text-sm font-medium flex-1">{message}</span>
        <button 
          onClick={onClose}
          className="text-white/70 hover:text-white transition font-bold"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
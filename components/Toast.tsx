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

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px]">
        <span className="text-sm font-medium flex-1">{message}</span>
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
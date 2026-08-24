'use client'

import React, { useEffect } from 'react'

type ModalType = 'confirm' | 'alert' | 'success' | 'error' | 'info'

interface CustomModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  type?: ModalType
  confirmText?: string
  cancelText?: string
}

const iconMap: Record<ModalType, { icon: string; color: string; bg: string }> = {
  confirm: { icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50' },
  alert: { icon: '🔔', color: 'text-blue-600', bg: 'bg-blue-50' },
  success: { icon: '✓', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  error: { icon: '✕', color: 'text-rose-600', bg: 'bg-rose-50' },
  info: { icon: 'ℹ', color: 'text-zinc-600', bg: 'bg-zinc-50' },
}

export default function CustomModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'OK',
  cancelText = 'Batal',
}: CustomModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen) return null

  const style = iconMap[type]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
        <div className={`p-6 ${style.bg} border-b border-zinc-100`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full ${style.bg} ${style.color} flex items-center justify-center text-2xl shrink-0`}>
              {style.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
              <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 flex items-center justify-end gap-2">
          {type === 'confirm' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm()
              onClose()
            }}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition ${
              type === 'error'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : type === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-900 hover:bg-black text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { connectSocket } from '@/services/socket/socketClient'
import { staffApi } from '@/services/api/staffApi'
import { unwrapApiData, normalizeList } from '@/utils/apiResponse'
import { useAuthStore } from '@/store/authStore'
import { pickMyUserId } from '@/hooks/useChat'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'message' | string

export type AppNotification = {
  id: string | number
  message: string
  type?: NotificationType
  createdAt?: string | number
  readAt?: string | number | null
  isRead?: boolean
}

const toTs = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = Date.parse(v)
    return Number.isFinite(t) ? t : Date.now()
  }
  return Date.now()
}

const normalizeNotification = (raw: any): AppNotification | null => {
  const plain = raw?.dataValues ?? raw
  const id = plain?.id ?? plain?.notificationId ?? plain?._id
  if (id == null) return null
  const message = String(plain?.message ?? plain?.content ?? plain?.text ?? '').trim()
  if (!message) return null
  const createdAt = plain?.createdAt ?? plain?.time ?? plain?.ts
  const readAt = plain?.readAt ?? plain?.read_at ?? null
  const isRead =
    Boolean(plain?.isRead) ||
    Boolean(plain?.read) ||
    (readAt != null && String(readAt) !== '')

  return {
    id,
    message,
    type: plain?.type ?? plain?.kind ?? 'info',
    createdAt,
    readAt,
    isRead,
  }
}

export const useNotifications = () => {
  const user = useAuthStore((s) => s.user)
  const userId = pickMyUserId(user)

  const socket = useMemo(() => connectSocket(), []) as Socket | null

  const [items, setItems] = useState<AppNotification[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [toast, setToast] = useState<AppNotification | null>(null)
  const loadedRef = useRef(false)

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0),
    [items],
  )

  const fetchNotifications = useCallback(async () => {
    try {
      const body = await staffApi.listNotifications()
      const payload = unwrapApiData(body)
      const { items: rows } = normalizeList(payload, ['items', 'rows', 'notifications', 'data'])
      const normalized = rows
        .map(normalizeNotification)
        .filter(Boolean) as AppNotification[]
      // newest first
      normalized.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt))
      setItems(normalized)
      loadedRef.current = true
    } catch {
      if (!loadedRef.current) setItems([])
    }
  }, [])

  const markRead = useCallback(async (id: string | number) => {
    setItems((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true, readAt: Date.now() } : n)),
    )
    try {
      await staffApi.markNotificationRead(id)
    } catch {
      // keep optimistic UI; backend sync will happen on next fetch
    }
  }, [])

  const markAllRead = useCallback(async () => {
    // Optimistic: flip all to read immediately
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? Date.now() })))
    try {
      await staffApi.markAllNotificationsRead()
    } catch {
      // keep optimistic UI
    }
  }, [])

  // Initial fetch after login
  useEffect(() => {
    if (!userId) return
    fetchNotifications()
  }, [userId, fetchNotifications])

  // Socket wiring
  useEffect(() => {
    if (!socket || !userId) return

    // Join private room: backend expects join_room { userId }
    socket.emit('join_room', { userId: String(userId) })

    const onReceive = (payload: any) => {
      const n = normalizeNotification(payload)
      if (!n) return
      setItems((prev) => {
        // de-dupe by id
        const next = [n, ...prev.filter((x) => String(x.id) !== String(n.id))]
        next.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt))
        return next
      })
      setToast(n)
      // auto-clear toast
      window.setTimeout(() => setToast((cur) => (cur && String(cur.id) === String(n.id) ? null : cur)), 3500)
    }

    // Prevent duplicate listeners
    socket.off('receive_notification', onReceive)
    socket.on('receive_notification', onReceive)

    return () => {
      socket.off('receive_notification', onReceive)
    }
  }, [socket, userId])

  return {
    items,
    unreadCount,
    dropdownOpen,
    setDropdownOpen,
    toast,
    setToast,
    fetchNotifications,
    markRead,
    markAllRead,
  }
}


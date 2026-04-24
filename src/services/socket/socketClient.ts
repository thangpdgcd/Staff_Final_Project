import { io, type Socket } from 'socket.io-client'
import { getSocketUrl } from '@/config/backend'

let socketSingleton: Socket | null = null
let status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' = 'idle'
let socketIoUnsupported = false

const getToken = (): string | null => {
  try {
    const raw = localStorage.getItem('staff_auth')
    const parsed = raw ? (JSON.parse(raw) as { accessToken?: string }) : null
    return parsed?.accessToken ?? null
  } catch {
    return null
  }
}

export const getSocketStatus = () => status
export const getSocket = () => socketSingleton

export const connectSocket = (): Socket | null => {
  if (socketIoUnsupported) {
    status = 'error'
    return socketSingleton
  }

  const token = getToken()

  if (socketSingleton) {
    socketSingleton.auth = token ? { token } : {}
    if (!socketSingleton.connected) {
      status = 'connecting'
      try {
        socketSingleton.connect()
      } catch (err) {
        console.error('Socket connect failed:', err)
      }
    }
    return socketSingleton
  }

  status = 'connecting'
  const url = getSocketUrl()

  socketSingleton = io(url, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: token ? { token } : {},
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    timeout: 10000,
  })

  socketSingleton.on('connect', () => {
    status = 'connected'
  })

  socketSingleton.on('disconnect', () => {
    status = 'disconnected'
  })

  socketSingleton.on('connect_error', (err: Error) => {
    status = 'error'
    const msg = String(err?.message ?? err ?? '')
    if (msg.includes('404') || msg.toLowerCase().includes('unexpected response code: 404')) {
      socketIoUnsupported = true
      try {
        if (socketSingleton) {
          socketSingleton.io.opts.reconnection = false
          socketSingleton.io.opts.autoConnect = false
          socketSingleton.disconnect()
        }
      } catch {
        // ignore
      }
    }
  })

  return socketSingleton
}

export const disconnectSocket = () => {
  if (!socketSingleton) return
  try {
    socketSingleton.removeAllListeners()
    socketSingleton.disconnect()
  } finally {
    socketSingleton = null
    status = 'disconnected'
  }
}

type AckFn = (res: unknown) => void

export type ChatPayload = Record<string, unknown> & {
  conversationId?: string | number
  roomId?: string
  recipientUserId?: string | number
  toUserId?: string | number
  message?: unknown
}

export const chatEvents = {
  joinRoom: (payload: ChatPayload | undefined, ack?: AckFn) => {
    const s = connectSocket()
    if (!s) return
    const normalized = payload?.conversationId
      ? { ...payload, roomId: String(payload.conversationId) }
      : payload
    s.emit('join_room', normalized, ack)
  },

  sendMessage: (payload: ChatPayload | undefined, ack?: AckFn) => {
    const s = connectSocket()
    if (!s) return
    const normalized = payload?.conversationId
      ? { ...payload, roomId: String(payload.conversationId) }
      : payload
    s.emit('send_message', normalized, ack)
  },

  sendChatMessage: (payload: ChatPayload | undefined, ack?: AckFn) => {
    const s = connectSocket()
    if (!s) return
    const roomId =
      payload?.roomId ??
      (payload?.conversationId != null ? String(payload.conversationId) : null)
    const hasRecipient =
      (payload?.recipientUserId != null && payload.recipientUserId !== '') ||
      (payload?.toUserId != null && payload.toUserId !== '')
    if (!roomId && !hasRecipient) {
      if (typeof ack === 'function')
        ack({ ok: false, message: 'roomId, conversationId, or recipientUserId required' })
      return
    }
    const body: Record<string, unknown> = {
      ...payload,
      message: payload?.message ?? payload,
    }
    if (roomId) body.roomId = String(roomId)
    s.emit('chat:message', body, ack)
  },

  onReceiveMessage: (handler: (...args: unknown[]) => void) => {
    const s = connectSocket()
    if (!s) return () => {}
    s.on('receive_message', handler)
    return () => {
      s.off('receive_message', handler)
    }
  },

  onJoinedRoom: (handler: (...args: unknown[]) => void) => {
    const s = connectSocket()
    if (!s) return () => {}
    s.on('joined_room', handler)
    s.on('chat:join', handler)
    return () => {
      s.off('joined_room', handler)
      s.off('chat:join', handler)
    }
  },

  onError: (handler: (...args: unknown[]) => void) => {
    const s = connectSocket()
    if (!s) return () => {}
    s.on('error', handler)
    return () => {
      s.off('error', handler)
    }
  },
}

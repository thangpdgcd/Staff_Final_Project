// @ts-nocheck — chat payload shapes from API/socket are dynamic; narrow gradually if needed.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { connectSocket, chatEvents } from '@/services/socket/socketClient'
import { useAuthStore } from '@/store/authStore'
import { staffApi } from '@/api/staffApi'
import { normalizeList, unwrapApiData } from '@/utils/apiResponse'
import { normalizeRoleId, ROLE_IDS } from '@/constants/roles'

export const pickMyUserId = (user) => {
  if (!user || typeof user !== 'object') return null
  const raw = user.user_ID ?? user.userId ?? user.id
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

// Backwards-compatible name (existing imports).
export const pickStaffId = pickMyUserId

const pickMyRole = (user) => {
  const roleId = normalizeRoleId(user?.roleID ?? user?.roleId)
  if (roleId === ROLE_IDS.ADMIN) return 'admin'
  if (roleId === ROLE_IDS.STAFF) return 'staff'
  if (roleId === ROLE_IDS.CUSTOMER) return 'user'
  const raw = roleId != null ? String(roleId).trim().toLowerCase() : ''
  if (raw === 'admin' || raw === 'staff' || raw === 'user' || raw === 'customer') return raw === 'customer' ? 'user' : raw
  return null
}

const resolveSenderUserId = (plain) => {
  if (!plain || typeof plain !== 'object') return null
  const sid =
    plain.senderUserId ??
    plain.sender_user_id ??
    plain.senderUserID ??
    (plain.sender && typeof plain.sender === 'object'
      ? plain.sender.userId ?? plain.sender.user_ID ?? plain.sender.id
      : null)
  if (sid == null || sid === '') return null
  const n = Number(sid)
  return Number.isFinite(n) ? n : null
}

const roleFromSenderMeta = (senderRoleId, peerFallback) => {
  const r = senderRoleId != null ? String(senderRoleId).trim() : ''
  if (r === '2') return 'admin'
  if (r === '3') return 'staff'
  if (r === '1') return 'user'
  return peerFallback
}

const normalizeConversationEvent = (evt, myUserId, myRole, activeConversationId, peerIncomingRole = 'user') => {
  const convId = evt?.conversationId ?? evt?.roomId
  if (convId == null) return null
  if (activeConversationId != null && String(convId) !== String(activeConversationId)) return null

  const rawMsg = evt?.message
  if (!rawMsg || typeof rawMsg !== 'object') return null

  const plain = rawMsg.dataValues ?? rawMsg.toJSON?.() ?? rawMsg
  const senderUserId = resolveSenderUserId(plain)
  if (senderUserId == null) return null

  const senderRoleId =
    plain.senderRoleId ??
    (plain.sender && typeof plain.sender === 'object' ? plain.sender.roleID ?? plain.sender.roleId : null)

  const text = plain.text ?? plain.content ?? ''
  const me = myUserId != null && Number(senderUserId) === Number(myUserId)
  const role = me ? (myRole ?? 'staff') : roleFromSenderMeta(senderRoleId, peerIncomingRole)

  const ts =
    plain.createdAt != null
      ? typeof plain.createdAt === 'number'
        ? plain.createdAt
        : new Date(plain.createdAt).getTime()
      : Date.now()

  return {
    from: { userId: senderUserId, role },
    message: {
      type: 'text',
      content: String(text),
      ...(plain.id != null ? { id: plain.id } : {}),
    },
    ts,
    conversationId: convId,
  }
}

/** Legacy send_message relay shape (optional echo). */
const legacyPeerMatchesSelection = (evt, selectedUserId) => {
  if (!evt?.from) return false
  const toUid = evt?.to?.userId
  const fromUid = evt?.from?.userId
  const fromRole = String(evt?.from?.role ?? '')
  if (fromRole === 'staff' || fromRole === 'admin') {
    return toUid != null && String(toUid) === String(selectedUserId)
  }
  return fromUid != null && String(fromUid) === String(selectedUserId)
}

const mapApiMessageRow = (row, myUserId, myRole, convId, peerIncomingRole = 'user') => {
  const plain = row?.dataValues ?? row
  const senderUserId = resolveSenderUserId(plain)
  if (senderUserId == null) return null
  const text = plain.text ?? plain.content ?? ''
  const me = myUserId != null && Number(senderUserId) === Number(myUserId)
  const senderRoleId =
    plain.senderRoleId ??
    (plain.sender && typeof plain.sender === 'object' ? plain.sender.roleID ?? plain.sender.roleId : null)
  const peerRole = roleFromSenderMeta(senderRoleId, peerIncomingRole)
  const ts =
    plain.createdAt != null
      ? typeof plain.createdAt === 'number'
        ? plain.createdAt
        : new Date(plain.createdAt).getTime()
      : Date.now()
  return {
    from: { userId: senderUserId, role: me ? (myRole ?? 'staff') : peerRole },
    message: {
      type: 'text',
      content: String(text),
      ...(plain.id != null ? { id: plain.id } : {}),
    },
    ts,
    conversationId: convId ?? plain.conversationId,
  }
}

export const useChat = (selectedUserId, options = {}) => {
  const peerIncomingRole = options.peerRole ?? 'user'

  const socket = useMemo(() => connectSocket(), [])
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [onlineMap, setOnlineMap] = useState({})
  const [conversationId, setConversationId] = useState(null)

  const myUserId = useAuthStore((s) => pickMyUserId(s.user))
  const myRole = useAuthStore((s) => pickMyRole(s.user))

  const typingTimerRef = useRef(null)
  const seenRef = useRef(new Set())
  const selectedUserIdRef = useRef(selectedUserId)
  const conversationIdRef = useRef(null)
  const historyLoadedForConvRef = useRef(null)

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const buildKey = useCallback((evt) => {
    const id = evt?.message?.id
    if (id != null) return `msg:${id}`
    return `${evt?.ts ?? ''}:${evt?.from?.role ?? ''}:${evt?.from?.userId ?? ''}:${JSON.stringify(evt?.message ?? '')}`
  }, [])

  useEffect(() => {
    const s = socket

    const offReceive = chatEvents.onReceiveMessage((evt) => {
      const sel = selectedUserIdRef.current
      const conv = conversationIdRef.current

      let normalized = null
      if (evt?.roomId != null || evt?.conversationId != null) {
        normalized = normalizeConversationEvent(evt, myUserId, myRole, conv, peerIncomingRole)
        // If conv ref is stale/wrong or join is late, still accept when sender is the selected peer.
        if (!normalized && sel) {
          const rawMsg = evt?.message
          const plain = rawMsg?.dataValues ?? rawMsg?.toJSON?.() ?? rawMsg
          const sid = resolveSenderUserId(plain)
          if (sid != null && String(sid) === String(sel)) {
            normalized = normalizeConversationEvent(evt, myUserId, myRole, null, peerIncomingRole)
          }
        }
        // Same thread, conv id matched event but first pass failed (e.g. nested sender shape).
        if (!normalized && conv != null) {
          const rawMsg = evt?.message
          const plain = rawMsg?.dataValues ?? rawMsg?.toJSON?.() ?? rawMsg
          const sid = resolveSenderUserId(plain)
          const evtConv = evt?.conversationId ?? evt?.roomId
          if (
            sid != null &&
            myUserId != null &&
            Number(sid) !== Number(myUserId) &&
            evtConv != null &&
            String(evtConv) === String(conv)
          ) {
            normalized = normalizeConversationEvent(evt, myUserId, myRole, null, peerIncomingRole)
          }
        }
        if (
          normalized &&
          conv == null &&
          (evt?.conversationId != null || evt?.roomId != null)
        ) {
          const rid = evt.conversationId ?? evt.roomId
          if (rid != null) {
            conversationIdRef.current = rid
            setConversationId(rid)
          }
        }
      } else if (evt?.from) {
        if (!legacyPeerMatchesSelection(evt, sel)) return
        normalized = evt
      } else {
        return
      }

      if (!normalized) return

      const key = buildKey(normalized)
      if (seenRef.current.has(key)) return
      seenRef.current.add(key)

      setMessages((prev) => [...prev, normalized])

      const fromUserId = normalized?.from?.userId ?? evt?.userId
      if (fromUserId && String(fromUserId) === String(sel)) {
        s.emit('chat:seen', { toUserId: fromUserId, ts: Date.now() })
      }
    })

    const onTyping = (payload) => {
      const id = payload?.userId ?? payload?.fromUserId ?? payload?.from?.userId
      if (String(id ?? '') !== String(selectedUserId ?? '')) return

      setIsTyping(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 2000)
    }

    const onPresence = (payload) => {
      const userId = String(payload?.userId ?? '')
      if (!userId) return
      setOnlineMap((prev) => ({ ...prev, [userId]: Boolean(payload?.online) }))
    }

    s.on('chat:typing', onTyping)
    s.on('presence:update', onPresence)

    return () => {
      offReceive()
      s.off('chat:typing', onTyping)
      s.off('presence:update', onPresence)
    }
  }, [socket, selectedUserId, buildKey, myUserId, myRole, peerIncomingRole])

  useEffect(() => {
    const clearRefsOnly = () => {
      conversationIdRef.current = null
      historyLoadedForConvRef.current = null
      seenRef.current.clear()
    }

    if (!selectedUserId) {
      clearRefsOnly()
      setConversationId(null)
      setMessages([])
      return
    }
    clearRefsOnly()
    setConversationId(null)
    setMessages([])

    chatEvents.joinRoom({ recipientUserId: Number(selectedUserId) }, (res) => {
      if (res?.ok && res?.conversationId != null) {
        conversationIdRef.current = res.conversationId
        setConversationId(res.conversationId)
      }
    })
  }, [selectedUserId])

  // Load thread history from API so staff sees the same conversation as the customer app.
  useEffect(() => {
    if (!conversationId || !selectedUserId) return
    if (historyLoadedForConvRef.current === conversationId) return

    let cancelled = false
    const cid = conversationId
    historyLoadedForConvRef.current = cid

    staffApi
      .getChatMessages(cid)
      .then((body) => {
        if (cancelled) return
        const { items: rows } = normalizeList(unwrapApiData(body), ['messages', 'items', 'rows', 'data'])
        const chronological = [...rows].reverse()
        const mapped = chronological
          .map((r) => mapApiMessageRow(r, myUserId, myRole, cid, peerIncomingRole))
          .filter(Boolean)
        mapped.forEach((m) => {
          const key = buildKey(m)
          seenRef.current.add(key)
        })
        // Avoid wiping socket-delivered lines if the API returns [] briefly or lags behind insert.
        if (mapped.length === 0) return
        setMessages(mapped)
      })
      .catch(() => {
        historyLoadedForConvRef.current = null
      })

    return () => {
      cancelled = true
    }
  }, [conversationId, myUserId, myRole, selectedUserId, buildKey, peerIncomingRole])

  const sendMessage = useCallback(
    (text) => {
      const trimmed = String(text ?? '').trim()
      if (!socket || !selectedUserId || !trimmed) return false

      const peerId = Number(selectedUserId)
      if (!Number.isFinite(peerId)) return false

      /** Same shape as admin app: server resolves conversation via recipientUserId + JWT when room is not ready. */
      const outgoing = {
        recipientUserId: peerId,
        message: { type: 'text', content: trimmed },
      }
      const cid = conversationId ?? conversationIdRef.current
      if (cid != null) {
        outgoing.conversationId = cid
        outgoing.roomId = String(cid)
      }

      chatEvents.sendChatMessage(outgoing, (res) => {
        if (res && res.ok === false) console.warn('Message send failed:', res?.message)
        if (res?.conversationId != null) {
          conversationIdRef.current = res.conversationId
          setConversationId(res.conversationId)
        }
      })
      return true
    },
    [socket, selectedUserId, conversationId],
  )

  const emitTyping = useCallback(() => {
    if (!socket || !selectedUserId) return
    const payload = { toUserId: Number(selectedUserId) }
    if (conversationId != null) payload.conversationId = conversationId
    socket.emit('chat:typing', payload)
  }, [socket, selectedUserId, conversationId])

  return {
    messages,
    setMessages,
    isTyping,
    onlineMap,
    sendMessage,
    emitTyping,
    socket,
    conversationId,
    myRole,
  }
}

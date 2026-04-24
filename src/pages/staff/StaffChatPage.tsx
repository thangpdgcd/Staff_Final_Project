// @ts-nocheck — dynamic API / socket payloads
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Image as ImageIcon, Search, Phone, Video, Info, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChat, pickMyUserId } from '@/hooks/useChat'
import { useAuthStore } from '@/store/authStore'
import { staffApi } from '@/services/api/staffApi'
import { unwrapApiData, normalizeList } from '@/utils/apiResponse'

const peerUserIdFromConversation = (conv, staffId) => {
  if (staffId == null) return null
  const parts = Array.isArray(conv?.participants) ? conv.participants : []
  const peer = parts.find((p) => Number(p.userId) !== Number(staffId))
  return peer?.userId != null ? Number(peer.userId) : null
}

const peerLabelFromConversation = (conv, staffId) => {
  if (staffId == null) return null
  const parts = Array.isArray(conv?.participants) ? conv.participants : []
  const peer = parts.find((p) => Number(p.userId) !== Number(staffId))
  if (!peer) return null
  const plain = peer?.dataValues ?? peer
  const raw =
    plain.name ??
    plain.fullName ??
    plain.username ??
    plain.userName ??
    plain.user_name ??
    plain.displayName ??
    plain.email ??
    plain.phone ??
    null
  const label = raw != null ? String(raw).trim() : ''
  return label || null
}

const peerEmailFromConversation = (conv, staffId) => {
  if (staffId == null) return null
  const parts = Array.isArray(conv?.participants) ? conv.participants : []
  const peer = parts.find((p) => Number(p.userId) !== Number(staffId))
  if (!peer) return null
  const plain = peer?.dataValues ?? peer
  const raw = plain.email ?? plain.mail ?? plain.userEmail ?? null
  const email = raw != null ? String(raw).trim() : ''
  return email || null
}

const peerRoleIdFromConversation = (conv, staffId) => {
  if (staffId == null) return null
  const parts = Array.isArray(conv?.participants) ? conv.participants : []
  const peer = parts.find((p) => Number(p.userId) !== Number(staffId))
  if (!peer) return null
  const plain = peer?.dataValues ?? peer
  const raw = plain.roleID ?? plain.roleId ?? plain.role ?? null
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export const StaffChatPage = () => {
  const { t } = useTranslation()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [query, setQuery] = useState('')
  const [input, setInput] = useState('')
  const [convList, setConvList] = useState([])
  const [convLoading, setConvLoading] = useState(false)
  const [userCache, setUserCache] = useState({})
  const myUserId = useAuthStore((s) => pickMyUserId(s.user))
  const { messages, isTyping, onlineMap, sendMessage, emitTyping, socket, myRole } = useChat(selectedUserId)
  const messagesEndRef = useRef(null)
  const convInFlightRef = useRef(false)
  const didLoadOnceRef = useRef(false)

  const [voucherCode, setVoucherCode] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const loadConversations = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    // Prevent overlapping refreshes (causes flicker + "loading" loop feeling).
    if (convInFlightRef.current) return
    convInFlightRef.current = true
    if (!silent) setConvLoading(true)
    try {
      const body = await staffApi.listChatConversations({ mineOnly: false, limit: 50 })
      const payload = unwrapApiData(body)
      const { items } = normalizeList(payload, ['items', 'rows', 'data'])
      setConvList(Array.isArray(items) ? items : [])
      didLoadOnceRef.current = true
    } catch {
      // Only wipe list on the first load; later failures shouldn't blank the UI.
      if (!didLoadOnceRef.current) setConvList([])
    } finally {
      if (!silent) setConvLoading(false)
      convInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const uid = Number(selectedUserId)
    if (!Number.isFinite(uid) || uid <= 0) return

    staffApi
      .getUserById(uid)
      .then((body) => {
        if (cancelled) return
        const payload = unwrapApiData(body)
        const p = payload?.user ?? payload?.profile ?? payload
        const plain = p?.dataValues ?? p
        const name = (
          plain?.name ??
          plain?.fullName ??
          plain?.username ??
          plain?.userName ??
          plain?.user_name ??
          plain?.displayName ??
          ''
        )
          .toString()
          .trim()
        const email = (plain?.email ?? plain?.mail ?? plain?.userEmail ?? '').toString().trim()
        const roleRaw = plain?.roleID ?? plain?.roleId ?? plain?.role ?? null
        const roleId = roleRaw == null || roleRaw === '' ? null : Number(roleRaw)
        setUserCache((prev) => ({
          ...prev,
          [String(uid)]: {
            name: name || prev?.[String(uid)]?.name || '',
            email: email || prev?.[String(uid)]?.email || '',
            roleId: Number.isFinite(roleId) ? roleId : prev?.[String(uid)]?.roleId ?? null,
            ts: Date.now(),
          },
        }))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [selectedUserId])

  useEffect(() => {
    let mounted = true
    // Initial load
    loadConversations({ silent: false })

    // Khi user bên customer đổi tên, danh sách conversations cần fetch lại để lấy `participants.name` mới.
    const refreshIfVisible = () => {
      if (!mounted) return
      if (document.visibilityState !== 'visible') return
      // Silent refresh so UI doesn't flicker.
      loadConversations({ silent: true })
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)

    // Light polling (silent) to keep names/previews updated without feeling "reloady".
    const t = window.setInterval(refreshIfVisible, 30000)

    return () => {
      mounted = false
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.clearInterval(t)
    }
  }, [loadConversations])

  const send = () => {
    if (!input.trim()) return
    const success = sendMessage(input)
    if (success) {
      setInput('')
    }
  }

  const sendVoucher = () => {
    if (!socket || !selectedUserId) return
    const uid = Number(selectedUserId)
    if (!Number.isInteger(uid) || uid <= 0) {
      console.warn(t('staff.chatPage.warnNumericUserId'))
      return
    }
    const code = String(voucherCode ?? '').trim()
    if (!code) {
      console.warn(t('staff.chatPage.warnEnterVoucherCode'))
      return
    }
    socket.emit(
      'send_voucher',
      {
        userId: String(uid),
        code,
        message: t('staff.chatPage.voucherReceivedMessage'),
      },
      (res) => {
        if (!res?.ok) {
          console.error(res?.message || t('staff.chatPage.voucherSendFailed'))
          return
        }
        // Fallback: also send as a normal chat message so the customer UI always sees it.
        sendMessage(t('staff.chatPage.voucherCodeMessage', { code }))
      },
    )
  }

  const convRows = useMemo(() => {
    // Normalize: backend đôi khi trả nhiều conversation cho cùng 1 peer → UI bị "chọn 2".
    const byPeer = new Map()
    for (const conv of Array.isArray(convList) ? convList : []) {
      const peerId = peerUserIdFromConversation(conv, myUserId)
      if (peerId == null) continue
      // Only show customer users here. Admin/Staff have their own chat page.
      const cachedRole = userCache?.[String(peerId)]?.roleId ?? null
      const peerRole = cachedRole ?? peerRoleIdFromConversation(conv, myUserId)
      if (peerRole != null && Number(peerRole) !== 1) continue
      // Keep the first one (API usually returns latest-first). If not, we still dedupe deterministically.
      if (!byPeer.has(String(peerId))) byPeer.set(String(peerId), conv)
    }
    const items = Array.from(byPeer.entries()).map(([peerId, conv]) => ({
      peerId,
      conv,
      label:
        userCache?.[String(peerId)]?.name ||
        peerLabelFromConversation(conv, myUserId) ||
        t('common.user'),
      email:
        userCache?.[String(peerId)]?.email ||
        peerEmailFromConversation(conv, myUserId) ||
        '',
      preview: conv?.lastMessagePreview ?? '',
    }))

    const q = String(query ?? '').trim().toLowerCase()
    if (!q) return items
    return items.filter((x) => {
      return (
        x.peerId.toLowerCase().includes(q) ||
        String(x.label ?? '').toLowerCase().includes(q) ||
        String(x.email ?? '').toLowerCase().includes(q) ||
        String(x.preview ?? '').toLowerCase().includes(q)
      )
    })
  }, [convList, myUserId, query, userCache])

  const selectedConvLabel = useMemo(() => {
    if (!selectedUserId) return null
    const found = convRows.find((x) => String(x.peerId) === String(selectedUserId))
    return found?.label ?? null
  }, [convRows, selectedUserId])

  const selectedConvEmail = useMemo(() => {
    if (!selectedUserId) return null
    const found = convRows.find((x) => String(x.peerId) === String(selectedUserId))
    const v = found?.email ? String(found.email).trim() : ''
    return v || null
  }, [convRows, selectedUserId])

  const rendered = useMemo(() => {
    return messages.map((m, idx) => {
      const fromRole = String(m?.from?.role ?? '')
      const content =
        typeof m?.message === 'string'
          ? m.message
          : typeof m?.message?.content === 'string'
            ? m.message.content
            : ''
      const mine = myRole ? fromRole === myRole : fromRole === 'staff'

      return (
        <motion.div 
          key={`${idx}-${m?.ts ?? ''}`}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`flex mb-4 ${mine ? 'justify-end' : 'justify-start'}`}
        >
          {!mine && (
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mr-2 shrink-0">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{selectedUserId?.[0] || 'U'}</span>
            </div>
          )}
          <div
            className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[15px] shadow-sm leading-relaxed ${
              mine
                ? 'bg-linear-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm border border-brand-500/20'
                : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-tl-sm text-zinc-800 dark:text-zinc-100'
            }`}
          >
            {content}
          </div>
        </motion.div>
      )
    })
  }, [messages, selectedUserId, myRole])

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col md:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Left Sidebar - Chat List (match admin layout) */}
      <div className="md:w-[320px] md:border-r border-b md:border-b-0 border-zinc-200/70 dark:border-zinc-800 flex md:flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800 h-[72px] flex items-center gap-2 shrink-0 w-full">
          <MessageSquare className="text-brand-600 dark:text-brand-400 shrink-0" size={22} />
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-tight leading-tight truncate">{t('staff.chatPage.title')}</h2>
         
          </div>
        </div>

        <div className="p-3 border-b border-zinc-200/70 dark:border-zinc-800 shrink-0 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('staff.chatPage.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-3 space-y-1 w-full">
          {convLoading && (
            <div className="px-2 py-3 text-xs text-zinc-500">{t('staff.chatPage.loadingConversations')}</div>
          )}
          {!convLoading &&
            convRows.map(({ peerId, conv, label: peerLabel, email }) => {
              const active = String(peerId) === String(selectedUserId)
              const subline = (conv?.lastMessagePreview ?? '') || email || ' '
              return (
                <motion.button
                  key={conv.id ?? conv.conversationId}
                  type="button"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedUserId(String(peerId))}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 border transition-colors ${
                    active
                      ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800'
                      : 'bg-white dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50 hover:border-brand-300/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-full bg-linear-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                      {(peerLabel?.[0] ?? 'U').toUpperCase()}
                    </div>
                    {onlineMap[String(peerId)] && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14px] truncate text-zinc-900 dark:text-white">{peerLabel}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{subline}</div>
                  </div>
                </motion.button>
              )
            })}
          {!convLoading && convRows.length === 0 && (
            <div className="px-2 py-4 text-xs text-zinc-500">{t('staff.chatPage.emptyConversations')}</div>
          )}
        </div>
      </div>

      {/* Right Area - Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] dark:bg-zinc-950/50">
        {selectedUserId ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-linear-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {selectedUserId?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {onlineMap[String(selectedUserId)] && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[15px] text-zinc-900 dark:text-white leading-tight">
                    {selectedConvLabel || t('common.user')}
                  </div>
                  {selectedConvEmail ? <div className="text-[11px] text-zinc-500 truncate">{selectedConvEmail}</div> : null}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                    {onlineMap[String(selectedUserId)] ? t('staff.peerOnline') : t('staff.peerOffline')}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 px-2 py-1 rounded-lg bg-brand-100/80 dark:bg-brand-950/50">
                {t('common.user')}
              </span>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-zinc-50/50 dark:bg-zinc-950/20">
              {rendered}
              
              <AnimatePresence>
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-start mb-4"
                  >
                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 mr-2 shrink-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{selectedUserId?.[0] || 'U'}</span>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 w-[64px] shadow-sm">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Toolbar */}
            <div className="px-5 py-2.5 bg-brand-50/30 dark:bg-zinc-900 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center gap-3">
              <span className="text-[11px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest bg-brand-100 dark:bg-brand-900/50 px-2 py-1 rounded-md">
                {t('staff.chatPage.giftVoucher')}
              </span>
              <input
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder={t('staff.chatPage.voucherPlaceholder')}
                className="w-[180px] rounded-lg border border-zinc-200/70 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={sendVoucher}
                className="rounded-lg bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 text-xs font-bold shadow-sm"
              >
                {t('staff.chatPage.sendVoucher')}
              </motion.button>
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200/70 dark:border-zinc-800 relative z-10">
              <div className="flex items-end gap-2">
                <button className="p-2.5 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0">
                  <ImageIcon size={22} />
                </button>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border border-zinc-200/70 dark:border-zinc-700 flex items-center pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                  <input
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      emitTyping()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') send()
                    }}
                    placeholder={t('staff.chatPage.messagePlaceholder')}
                    className="flex-1 bg-transparent px-4 py-3 text-[15px] outline-none text-zinc-900 dark:text-zinc-100"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button" 
                    onClick={send} 
                    disabled={!input.trim()}
                    className={`p-2 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      input.trim() 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Send size={18} className="translate-x-0.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950/20">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-24 h-24 rounded-full bg-brand-50 dark:bg-zinc-800 flex items-center justify-center mb-6 shadow-sm border border-brand-100 dark:border-zinc-700"
            >
              <MessageSquare size={40} className="text-brand-500 dark:text-brand-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{t('staff.chatPage.noChatTitle')}</h3>
            <p className="mt-2 text-zinc-500 max-w-sm">
              {t('staff.chatPage.noChatHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


// @ts-nocheck — dynamic API / socket payloads
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Shield, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChat } from '@/hooks/useChat'
import { staffApi } from '@/services/api/staffApi'
import { unwrapApiData, normalizeList } from '@/utils/apiResponse'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export const StaffAdminMessagesPage = () => {
  const { t } = useTranslation()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAdminId, setSelectedAdminId] = useState('')
  const [input, setInput] = useState('')

  const { messages, isTyping, onlineMap, sendMessage, emitTyping, conversationId, myRole } = useChat(
    selectedAdminId,
    { peerRole: 'admin' },
  )
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    staffApi
      .listTeamMembers({ role: 2 })
      .then((body) => {
        if (cancelled) return
        const payload = unwrapApiData(body)
        const { items } = normalizeList(payload, ['items', 'rows', 'users', 'data'])
        setAdmins(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setAdmins([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const selectedAdmin = useMemo(
    () => admins.find((a) => String(a.userId) === String(selectedAdminId)),
    [admins, selectedAdminId],
  )

  const send = () => {
    if (!input.trim()) return
    if (sendMessage(input)) setInput('')
  }

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
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`flex mb-4 ${mine ? 'justify-end' : 'justify-start'}`}
        >
          {!mine && (
            <div className="h-8 w-8 rounded-full bg-violet-600/90 flex items-center justify-center mr-2 shrink-0 text-white text-xs font-bold">
              A
            </div>
          )}
          <div
            className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[15px] shadow-sm leading-relaxed ${
              mine
                ? 'bg-linear-to-br from-brand-600 to-brand-700 text-white rounded-tr-sm border border-brand-500/20'
                : 'bg-white dark:bg-zinc-800 border border-violet-200/80 dark:border-violet-900/50 rounded-tl-sm text-zinc-800 dark:text-zinc-100'
            }`}
          >
            {content}
          </div>
        </motion.div>
      )
    })
  }, [messages, myRole])

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col md:flex-row bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden shadow-sm">
      <div className="md:w-[320px] md:border-r border-b md:border-b-0 border-zinc-200/70 dark:border-zinc-800 flex md:flex-col bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800 h-[72px] flex items-center gap-2 shrink-0 w-full">
          <Shield className="text-violet-600 dark:text-violet-400 shrink-0" size={22} />
          <div>
            <h2 className="text-base font-black tracking-tight leading-tight">
              {t('staff.adminMessages')}
            </h2>
           
          </div>
        </div>
        <div className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-3 space-y-1 w-full">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full cursor-pointer" />
              <Skeleton className="h-14 w-full cursor-pointer" />
              <Skeleton className="h-14 w-full cursor-pointer" />
            </div>
          ) : null}
          {!loading && admins.length === 0 ? (
            <EmptyState
              title={t('staff.adminMessagesEmpty')}
              description={t('staff.adminMessagesHint')}
              className="border-0 bg-transparent"
            />
          ) : null}
          {!loading &&
            admins.map((a) => {
              const id = a.userId
              const active = String(id) === String(selectedAdminId)
              return (
                <motion.button
                  key={id}
                  type="button"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedAdminId(String(id))}
                  className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 border transition-colors ${
                    active
                      ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800'
                      : 'bg-white dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-700/50 hover:border-violet-300/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
                      {(a.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    {onlineMap[String(id)] ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14px] truncate text-zinc-900 dark:text-white">
                      {a.name || t('common.adminWithId', { id })}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{a.email}</div>
                  </div>
                </motion.button>
              )
            })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] dark:bg-zinc-950/50">
        {selectedAdminId ? (
          <>
            <div className="h-16 px-6 border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  {(selectedAdmin?.name?.[0] ?? selectedAdminId?.[0] ?? 'A').toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-[15px] text-zinc-900 dark:text-white leading-tight">
                    {selectedAdmin?.name || t('common.adminWithId', { id: selectedAdminId })}
                  </div>
                  {conversationId != null && (
                    <div className="text-[10px] text-zinc-400 font-mono">#{conversationId}</div>
                  )}
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                    {onlineMap[String(selectedAdminId)] ? t('staff.peerOnline') : t('staff.peerOffline')}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg bg-violet-100/80 dark:bg-violet-950/50">
                {t('common.admin')}
              </span>
            </div>

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
                    <div className="h-8 w-8 rounded-full bg-violet-600/90 mr-2 shrink-0 flex items-center justify-center text-white text-xs font-bold">
                      A
                    </div>
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 w-[64px]">
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200/70 dark:border-zinc-800">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <Input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    emitTyping()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send()
                  }}
                  placeholder={t('staff.adminMessagesPlaceholder')}
                />
                <Button type="button" onClick={send} disabled={!input.trim()} className="sm:w-auto w-full">
                  <Send size={18} />
                  {t('common.send')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950/20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-24 h-24 rounded-full bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center mb-6 shadow-sm border border-violet-100 dark:border-violet-900"
            >
              <MessageSquare size={40} className="text-violet-600 dark:text-violet-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{t('staff.adminMessagesPick')}</h3>
            <p className="mt-2 text-zinc-500 max-w-sm text-sm">{t('staff.adminMessagesHint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

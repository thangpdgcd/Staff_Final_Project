// @ts-nocheck — chart + dashboard metrics
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Ticket, MessageSquare, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/services/api/staffApi'


const AnimatedCounter = ({ value, duration = 1.5 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const end = parseInt(String(value), 10)
    if (isNaN(end)) return

    const totalFrames = Math.round(duration * 60)
    let frame = 0

    const counter = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const easeProgress = 1 - Math.pow(1 - progress, 3) // cubic ease out
      setCount(Math.round(end * easeProgress))

      if (frame === totalFrames) {
        clearInterval(counter)
        setCount(end)
      }
    }, 1000 / 60)

    return () => clearInterval(counter)
  }, [value, duration])

  return <span>{count.toLocaleString()}</span>
}

const StatCard = ({ title, value, hint, hintLabel, icon: Icon, delay }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
      className="relative overflow-hidden rounded-3xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all group"
    >
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={100} className="text-brand-600 dark:text-brand-400 rotate-12 translate-x-4 -translate-y-4" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
          <Icon size={24} />
        </div>
        <div className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </div>
      </div>
      
      <div className="mt-4 text-4xl font-black text-zinc-900 dark:text-white relative z-10">
        <AnimatedCounter value={value} />
      </div>
      {hint && (
        <div className="mt-2 text-sm font-medium flex items-center gap-1 relative z-10">
          <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">↑ 12%</span> 
          <span className="text-zinc-500 dark:text-zinc-400">{hintLabel}</span>
        </div>
      )}
    </motion.div>
  )
}

const FilterButton = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-1.5 text-sm font-bold transition-colors duration-200 ${
      active ? 'text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
    }`}
  >
    {active && (
      <motion.div
        layoutId="activeFilter"
        className="absolute inset-0 bg-brand-600 rounded-full"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
    <span className="relative z-10">{label}</span>
  </button>
)

export const StaffDashboardPage = () => {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState('week')
  const [analyticsData, setAnalyticsData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const res = await staffApi.getAnalytics({ range: timeRange })
        setAnalyticsData(res?.data ?? [])
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [timeRange])
  
  const getPeriodLabel = () => {
    switch (timeRange) {
      case 'week':
        return t('staff.dashboardPage.period.week')
      case 'month':
        return t('staff.dashboardPage.period.month')
      case 'year':
        return t('staff.dashboardPage.period.year')
      default: return ''
    }
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
          {t('staff.dashboardPage.title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          {t('staff.dashboardPage.subtitle')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard delay={0.1} icon={Users} title={t('staff.dashboardPage.stats.activeUsers')} value={timeRange === 'year' ? "12480" : timeRange === 'month' ? "2450" : "842"} hint hintLabel={t('staff.dashboardPage.sinceLastPeriod')} />
        <StatCard delay={0.2} icon={MessageSquare} title={t('staff.dashboardPage.stats.totalOrders')} value={timeRange === 'year' ? "4850" : timeRange === 'month' ? "420" : "128"} hint hintLabel={t('staff.dashboardPage.sinceLastPeriod')} />
        <StatCard delay={0.3} icon={Ticket} title={t('staff.dashboardPage.stats.activeVouchers')} value="56" hint hintLabel={t('staff.dashboardPage.sinceLastPeriod')} />
        <StatCard delay={0.4} icon={ShieldCheck} title={t('staff.dashboardPage.stats.staffMembers')} value="12" hint hintLabel={t('staff.dashboardPage.sinceLastPeriod')} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="rounded-3xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold">{t('staff.dashboardPage.analyticsTitle')}</h2>
            <p className="text-sm text-zinc-500">{t('staff.dashboardPage.analyticsSubtitle', { period: getPeriodLabel() })}</p>
          </div>
          
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full w-fit">
            <FilterButton 
              active={timeRange === 'week'} 
              label={t('staff.dashboardPage.filters.week')} 
              onClick={() => setTimeRange('week')} 
            />
            <FilterButton 
              active={timeRange === 'month'} 
              label={t('staff.dashboardPage.filters.month')} 
              onClick={() => setTimeRange('month')} 
            />
            <FilterButton 
              active={timeRange === 'year'} 
              label={t('staff.dashboardPage.filters.year')} 
              onClick={() => setTimeRange('year')} 
            />
          </div>
        </div>
        
        <div className="h-[350px] w-full relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 z-20 backdrop-blur-sm">
               <div className="flex flex-col items-center gap-2">
                 <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-xs font-bold text-zinc-500">{t('staff.dashboardPage.loadingMetrics')}</span>
               </div>
            </div>
          )}
          
          {!loading && analyticsData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-zinc-400">{t('staff.dashboardPage.noData')}</span>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c026d3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'var(--tw-prose-bg, #fff)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="messages" 
                name={t('staff.dashboardPage.chart.orders')}
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorMessages)" 
                animationDuration={1000}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                name={t('staff.dashboardPage.chart.newUsers')}
                stroke="#c026d3" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorUsers)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  )
}




import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users, ChevronRight, CheckCircle, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import AppointmentDetailModal, { type AppointmentDetail } from '../components/AppointmentDetailModal'

interface TodayAppointment extends AppointmentDetail {}

interface StaffMember {
  id: string
  name: string
}

interface BirthdayClient {
  id: string
  name: string
  birth_date: string
  loyalty_points: number | null
}

interface TopStaff {
  name: string
  revenue: number
  appointments: number
}

interface RevenueSummary {
  today: number
  week: number
  month: number
  year: number
}

const statusStyle: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

function getWeekStart(now: Date): Date {
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
}

export default function DashboardHome() {
  const navigate = useNavigate()

  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<TodayAppointment | null>(null)

  // New card state
  const [servicesCompletedToday, setServicesCompletedToday] = useState(0)
  const [clientsSeenToday, setClientsSeenToday] = useState(0)
  const [topStaff, setTopStaff] = useState<TopStaff | null>(null)
  const [revenue, setRevenue] = useState<RevenueSummary>({ today: 0, week: 0, month: 0, year: 0 })

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      const weekStart  = getWeekStart(now).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString()
      const nowIso     = now.toISOString()

      const [apptRes, staffRes, birthdayRes, yearlyRes] = await Promise.all([
        // Today's full appointments (for staff cards + today stats)
        supabase
          .from('appointments')
          .select('id, start_time, end_time, status, client_id, service_id, staff_id, notes, clients(id, name), services(name, duration_mins, price), staff(id, name)')
          .gte('start_time', todayStart)
          .lt('start_time', todayEnd)
          .order('start_time', { ascending: true }),

        // Staff list
        supabase.from('staff').select('id, name').order('name'),

        // Birthdays
        supabase
          .from('clients')
          .select('id, name, birth_date, loyalty_points')
          .not('birth_date', 'is', null),

        // Year-to-date non-cancelled (for all revenue + top staff)
        supabase
          .from('appointments')
          .select('staff_id, staff(name), services(price), status, start_time, client_id')
          .gte('start_time', yearStart)
          .lte('start_time', nowIso)
          .neq('status', 'cancelled'),
      ])

      // ── Today's appointments ─────────────────────────────────────────────
      const appts = (apptRes.data as unknown as TodayAppointment[]) ?? []
      setTodayAppointments(appts)
      setServicesCompletedToday(appts.filter(a => a.status === 'completed').length)
      setClientsSeenToday(new Set(appts.filter(a => a.status !== 'cancelled').map(a => a.client_id)).size)

      // ── Staff list ───────────────────────────────────────────────────────
      setStaffList((staffRes.data as StaffMember[]) ?? [])

      // ── Birthdays ────────────────────────────────────────────────────────
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const in30 = new Date(today)
      in30.setDate(today.getDate() + 30)

      const upcoming = ((birthdayRes.data ?? []) as BirthdayClient[])
        .map((c) => {
          const bday = new Date(c.birth_date)
          const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
          if (next < today) next.setFullYear(today.getFullYear() + 1)
          return { client: c, next }
        })
        .filter(({ next }) => next >= today && next <= in30)
        .sort((a, b) => a.next.getTime() - b.next.getTime())
        .map(({ client }) => client)
      setBirthdayClients(upcoming)

      // ── Revenue + top staff from yearly dataset ──────────────────────────
      const yearly = (yearlyRes.data ?? []) as any[]

      const sumRevenue = (rows: any[]) =>
        rows.reduce((s: number, r: any) => s + (r.services?.price ?? 0), 0)

      const todayRows  = yearly.filter(r => r.start_time >= todayStart && r.start_time < todayEnd)
      const weekRows   = yearly.filter(r => r.start_time >= weekStart)
      const monthRows  = yearly.filter(r => r.start_time >= monthStart)

      setRevenue({
        today: sumRevenue(todayRows),
        week:  sumRevenue(weekRows),
        month: sumRevenue(monthRows),
        year:  sumRevenue(yearly),
      })

      // Top revenue staff this week
      const staffMap: Record<string, { name: string; revenue: number; appointments: number }> = {}
      for (const r of weekRows) {
        const sid = r.staff_id ?? 'unknown'
        const sname = (r.staff as any)?.name ?? 'Unknown'
        if (!staffMap[sid]) staffMap[sid] = { name: sname, revenue: 0, appointments: 0 }
        staffMap[sid].revenue += r.services?.price ?? 0
        staffMap[sid].appointments++
      }
      const top = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue)[0] ?? null
      setTopStaff(top)

      setLoading(false)
    }

    fetchAll()
  }, [])

  const handleApptUpdated = (updated: AppointmentDetail) => {
    setTodayAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? (updated as TodayAppointment) : a))
    )
    setSelectedAppt(updated as TodayAppointment)
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading...</div>
  }

  const todayCount = todayAppointments.length

  return (
    <div className="space-y-8">

      {/* ── Three summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Card 1 — Today's Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: '#2E86AB' }}>
              <CalendarDays size={16} />
            </div>
            <p className="text-sm font-bold text-gray-700">Today's Summary</p>
          </div>
          <div className="space-y-3">
            <MetricRow
              icon={<CalendarDays size={14} className="text-blue-400" />}
              label="Appointments"
              value={String(todayCount)}
            />
            <MetricRow
              icon={<CheckCircle size={14} className="text-green-500" />}
              label="Services Completed"
              value={String(servicesCompletedToday)}
            />
            <MetricRow
              icon={<Users size={14} className="text-purple-400" />}
              label="Clients Seen"
              value={String(clientsSeenToday)}
            />
          </div>
        </div>

        {/* Card 2 — Top Revenue Generator This Week */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: '#1E3A5F' }}>
              <TrendingUp size={16} />
            </div>
            <p className="text-sm font-bold text-gray-700">Top This Week</p>
          </div>
          {topStaff ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl leading-none">🏆</span>
                <p className="text-base font-bold" style={{ color: '#1E3A5F' }}>{topStaff.name}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Revenue</span>
                  <span className="text-sm font-bold" style={{ color: '#2a9d5c' }}>
                    AED {topStaff.revenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Appointments</span>
                  <span className="text-sm font-semibold text-gray-700">{topStaff.appointments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Avg / Appt</span>
                  <span className="text-sm font-semibold text-gray-700">
                    AED {(topStaff.appointments > 0 ? topStaff.revenue / topStaff.appointments : 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-gray-400">
              <span className="text-2xl mb-1">🏆</span>
              <p className="text-xs">No data yet this week</p>
            </div>
          )}
        </div>

        {/* Card 3 — Revenue Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: '#2a9d5c' }}>
              <span className="text-[10px] font-bold leading-none">AED</span>
            </div>
            <p className="text-sm font-bold text-gray-700">Revenue Summary</p>
          </div>
          <div className="space-y-2.5">
            <RevenueRow label="Today"      amount={revenue.today} />
            <RevenueRow label="This Week"  amount={revenue.week} />
            <RevenueRow label="This Month" amount={revenue.month} highlight />
            <div className="border-t border-gray-100 pt-2.5">
              <RevenueRow label="This Year"  amount={revenue.year} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Appointments by Staff ── */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1E3A5F' }}>
          Today's Appointments by Staff
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {staffList.map((staff) => {
            const appts = todayAppointments.filter((a) => a.staff_id === staff.id)
            const staffRevenue = appts
              .filter(a => a.status !== 'cancelled')
              .reduce((s, a) => s + (a.services?.price ?? 0), 0)

            return (
              <div
                key={staff.id}
                onClick={() => navigate(`/dashboard/staff/${staff.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 group-hover:text-[#1E3A5F] transition-colors">
                    {staff.name}
                  </h3>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-[#2E86AB] transition-colors" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                    <CalendarDays size={12} />
                    {appts.length} appt{appts.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
                    <span className="text-[9px] font-bold leading-none">AED</span>
                    {staffRevenue.toFixed(2)}
                  </div>
                </div>

                {appts.length === 0 ? (
                  <p className="text-sm text-gray-400">No appointments today</p>
                ) : (
                  <div className="space-y-2">
                    {appts.map((appt) => {
                      const time = new Date(appt.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric', minute: '2-digit',
                      })
                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedAppt(appt) }}
                          className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/clients/${appt.client_id}`) }}
                              className="text-sm font-semibold hover:underline truncate block text-left"
                              style={{ color: '#2E86AB' }}
                            >
                              {appt.clients?.name ?? 'Unknown'}
                            </button>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {appt.services?.name ?? '—'} · {time}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusStyle[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {appt.status}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Upcoming Birthdays ── */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1E3A5F' }}>
          Upcoming Birthdays
        </h2>
        {birthdayClients.length === 0 ? (
          <p className="text-sm text-gray-400">No birthdays in the next 30 days.</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {birthdayClients.map((client) => {
              const bday = new Date(client.birth_date)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
              if (next < today) next.setFullYear(today.getFullYear() + 1)
              return (
                <div key={client.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">🎂</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{client.name}</p>
                      <p className="text-xs text-gray-400">
                        {next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {client.loyalty_points != null && (
                    <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <span>⭐</span>
                      <span>{client.loyalty_points} pts</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdated={handleApptUpdated}
        />
      )}
    </div>
  )
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  )
}

function RevenueRow({ label, amount, highlight = false }: {
  label: string; amount: number; highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between ${highlight ? 'py-1.5 px-2.5 rounded-lg' : ''}`}
      style={highlight ? { backgroundColor: '#F0F7FF' } : {}}>
      <span className={`text-xs ${highlight ? 'font-bold text-gray-700' : 'text-gray-500'}`}>{label}</span>
      <span className={`${highlight ? 'text-base font-bold' : 'text-sm font-semibold text-gray-700'}`}
        style={highlight ? { color: '#1E3A5F' } : {}}>
        AED {amount.toFixed(2)}
      </span>
    </div>
  )
}

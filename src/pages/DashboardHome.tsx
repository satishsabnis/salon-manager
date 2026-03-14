import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
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

type PerfTab = 'appointments' | 'revenue'
type Period = 'today' | 'week' | 'month' | 'year'

interface StaffPerfRow {
  staffId: string
  staffName: string
  appointmentCount: number
  servicesExecuted: number
  mostPopularService: string
  revenue: number
}

function getPeriodRange(period: Period): { start: string; end: string } {
  const now = new Date()
  let start: Date
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
  }
  return { start: start.toISOString(), end: now.toISOString() }
}

export default function DashboardHome() {
  const navigate = useNavigate()

  const [todayCount, setTodayCount] = useState(0)
  const [clientCount, setClientCount] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppt, setSelectedAppt] = useState<TodayAppointment | null>(null)

  // ── Performance Overview state ──────────────────────────────────────────
  const [perfTab, setPerfTab] = useState<PerfTab>('appointments')
  const [apptPeriod, setApptPeriod] = useState<Period>('month')
  const [revPeriod, setRevPeriod] = useState<Period>('month')
  const [perfRows, setPerfRows] = useState<StaffPerfRow[]>([])
  const [perfLoading, setPerfLoading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      const [apptRes, clientCountRes, monthApptRes, staffRes, birthdayRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, start_time, end_time, status, client_id, service_id, staff_id, notes, clients(id, name), services(name, duration_mins, price), staff(id, name)')
          .gte('start_time', todayStart)
          .lt('start_time', todayEnd)
          .order('start_time', { ascending: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase
          .from('appointments')
          .select('services(price)')
          .gte('start_time', monthStart)
          .lt('start_time', monthEnd)
          .neq('status', 'cancelled'),
        supabase.from('staff').select('id, name').order('name'),
        supabase
          .from('clients')
          .select('id, name, birth_date, loyalty_points')
          .not('birth_date', 'is', null),
      ])

      const appts = (apptRes.data as unknown as TodayAppointment[]) ?? []
      setTodayCount(appts.length)
      setTodayAppointments(appts)
      setClientCount(clientCountRes.count ?? 0)

      const revenue = (monthApptRes.data ?? []).reduce((sum: number, row: any) => {
        return sum + (row.services?.price ?? 0)
      }, 0)
      setMonthRevenue(revenue)

      setStaffList((staffRes.data as StaffMember[]) ?? [])

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
      setLoading(false)
    }

    fetchAll()
  }, [])

  // ── Fetch performance data when tab or period changes ───────────────────
  useEffect(() => {
    const period = perfTab === 'appointments' ? apptPeriod : revPeriod
    const fetchPerformance = async () => {
      setPerfLoading(true)
      const { start, end } = getPeriodRange(period)

      const { data } = await supabase
        .from('appointments')
        .select('staff_id, staff(name), services(name, price), status')
        .gte('start_time', start)
        .lte('start_time', end)

      const staffMap: Record<string, {
        name: string
        appointments: number
        serviceNames: string[]
        revenue: number
      }> = {}

      for (const appt of (data ?? []) as any[]) {
        if (appt.status === 'cancelled') continue
        const sid = appt.staff_id ?? 'unknown'
        const sname = appt.staff?.name ?? 'Unknown'
        const svcName = appt.services?.name as string | undefined
        const svcPrice: number = appt.services?.price ?? 0

        if (!staffMap[sid]) staffMap[sid] = { name: sname, appointments: 0, serviceNames: [], revenue: 0 }
        staffMap[sid].appointments++
        if (svcName) staffMap[sid].serviceNames.push(svcName)
        if (appt.status === 'completed') staffMap[sid].revenue += svcPrice
      }

      const rows: StaffPerfRow[] = Object.entries(staffMap).map(([staffId, d]) => {
        const counts: Record<string, number> = {}
        for (const n of d.serviceNames) counts[n] = (counts[n] ?? 0) + 1
        const mostPopular = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
        return {
          staffId,
          staffName: d.name,
          appointmentCount: d.appointments,
          servicesExecuted: d.serviceNames.length,
          mostPopularService: mostPopular,
          revenue: d.revenue,
        }
      }).sort((a, b) => b.appointmentCount - a.appointmentCount)

      setPerfRows(rows)
      setPerfLoading(false)
    }

    fetchPerformance()
  }, [perfTab, apptPeriod, revPeriod])

  const handleApptUpdated = (updated: AppointmentDetail) => {
    setTodayAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? (updated as TodayAppointment) : a))
    )
    setSelectedAppt(updated as TodayAppointment)
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading...</div>
  }

  const maxRevenue = Math.max(...perfRows.map(r => r.revenue), 1)

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year',  label: 'This Year' },
  ]

  const activePeriod = perfTab === 'appointments' ? apptPeriod : revPeriod
  const setActivePeriod = perfTab === 'appointments' ? setApptPeriod : setRevPeriod

  return (
    <div className="space-y-8">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<CalendarDays size={20} />}
          label="Today's Appointments"
          value={String(todayCount)}
          color="#2E86AB"
        />
        <SummaryCard
          icon={<Users size={20} />}
          label="Total Clients"
          value={String(clientCount)}
          color="#1E3A5F"
        />
        <SummaryCard
          icon={<span className="text-[10px] font-bold text-white leading-none">AED</span>}
          label="This Month's Revenue"
          value={`AED ${monthRevenue.toFixed(2)}`}
          color="#2a9d5c"
        />
      </div>

      {/* ── Performance Overview ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Section header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold" style={{ color: '#1E3A5F' }}>Performance Overview</h2>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {(['appointments', 'revenue'] as PerfTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setPerfTab(tab)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                style={perfTab === tab
                  ? { backgroundColor: '#1E3A5F', color: 'white' }
                  : { background: 'transparent', color: '#6B7280' }}
              >
                {tab === 'appointments' ? 'Appointments & Services' : 'Revenue by Staff'}
              </button>
            ))}
          </div>
        </div>

        {/* Period buttons */}
        <div className="px-5 pt-4 pb-3 flex gap-2 flex-wrap">
          {periods.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActivePeriod(key)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all"
              style={activePeriod === key
                ? { backgroundColor: '#2E86AB', color: 'white', borderColor: '#2E86AB' }
                : { backgroundColor: 'white', color: '#374151', borderColor: '#E5E7EB' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table area */}
        <div className="px-5 pb-5">
          {perfLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : perfRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No data for this period.</div>
          ) : perfTab === 'appointments' ? (

            /* ── TAB 1: Appointments & Services ── */
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#1E3A5F' }} className="text-white text-left">
                    <th className="px-4 py-3 font-semibold">Staff Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Appointments</th>
                    <th className="px-4 py-3 font-semibold text-right">Services Executed</th>
                    <th className="px-4 py-3 font-semibold">Most Popular Service</th>
                  </tr>
                </thead>
                <tbody>
                  {perfRows.map((row, i) => (
                    <tr key={row.staffId}
                      className="border-t border-gray-100"
                      style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F9FAFB' }}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-800">{row.staffName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: '#2E86AB' }}>
                          {row.appointmentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{row.servicesExecuted}</td>
                      <td className="px-4 py-3">
                        {row.mostPopularService !== '—' ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                            {row.mostPopularService}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200" style={{ backgroundColor: '#F0F7FF' }}>
                    <td className="px-4 py-3 font-bold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                      {perfRows.reduce((s, r) => s + r.appointmentCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                      {perfRows.reduce((s, r) => s + r.servicesExecuted, 0)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

          ) : (

            /* ── TAB 2: Revenue by Staff ── */
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#1E3A5F' }} className="text-white text-left">
                    <th className="px-4 py-3 font-semibold">Staff Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Revenue (AED)</th>
                    <th className="px-4 py-3 font-semibold text-right">Appointments</th>
                    <th className="px-4 py-3 font-semibold text-right">Avg / Appointment</th>
                    <th className="px-4 py-3 font-semibold w-40">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {perfRows
                    .slice()
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((row, i) => {
                      const avg = row.appointmentCount > 0 ? row.revenue / row.appointmentCount : 0
                      const barPct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0
                      return (
                        <tr key={row.staffId}
                          className="border-t border-gray-100"
                          style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F9FAFB' }}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-800">{row.staffName}</td>
                          <td className="px-4 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                            AED {row.revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">{row.appointmentCount}</td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            AED {avg.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${barPct}%`, backgroundColor: i === 0 ? '#1E3A5F' : '#2E86AB' }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">
                                {Math.round(barPct)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-gray-200" style={{ backgroundColor: '#F0F7FF' }}>
                    <td className="px-4 py-3 font-bold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                      AED {perfRows.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                      {perfRows.reduce((s, r) => s + r.appointmentCount, 0)}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

          )}
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
            return (
              <div key={staff.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  {staff.name}
                </h3>
                {appts.length === 0 ? (
                  <p className="text-sm text-gray-400">No appointments today</p>
                ) : (
                  <div className="space-y-2">
                    {appts.map((appt) => (
                      <AppointmentRow
                        key={appt.id}
                        appt={appt}
                        onClientClick={() => navigate(`/dashboard/clients/${appt.client_id}`)}
                        onRowClick={() => setSelectedAppt(appt)}
                      />
                    ))}
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

      {/* Appointment detail modal */}
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

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function AppointmentRow({ appt, onClientClick, onRowClick }: {
  appt: TodayAppointment
  onClientClick: () => void
  onRowClick: () => void
}) {
  const time = new Date(appt.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })

  return (
    <div
      onClick={onRowClick}
      className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <button
          onClick={(e) => { e.stopPropagation(); onClientClick() }}
          className="text-sm font-semibold hover:underline truncate block text-left"
          style={{ color: '#2E86AB' }}
        >
          {appt.clients?.name ?? 'Unknown client'}
        </button>
        <p className="text-xs text-gray-500 mt-0.5">
          {appt.services?.name ?? '—'} · {time}
        </p>
      </div>
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
        appt.status === 'confirmed'
          ? 'bg-green-100 text-green-700'
          : appt.status === 'completed'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-red-100 text-red-600'
      }`}>
        {appt.status}
      </span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface TodayAppointment {
  id: string
  start_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  client_id: string
  staff_id: string
  clients: { name: string } | null
  services: { name: string } | null
  staff: { id: string; name: string } | null
}

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

export default function DashboardHome() {
  const navigate = useNavigate()

  const [todayCount, setTodayCount] = useState(0)
  const [clientCount, setClientCount] = useState(0)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      const [apptRes, clientCountRes, monthApptRes, staffRes, birthdayRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, start_time, status, client_id, staff_id, clients(name), services(name), staff(id, name)')
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

      const appts = (apptRes.data as TodayAppointment[]) ?? []
      setTodayCount(appts.length)
      setTodayAppointments(appts)
      setClientCount(clientCountRes.count ?? 0)

      const revenue = (monthApptRes.data ?? []).reduce((sum: number, row: any) => {
        return sum + (row.services?.price ?? 0)
      }, 0)
      setMonthRevenue(revenue)

      setStaffList((staffRes.data as StaffMember[]) ?? [])

      // Filter clients whose birthday falls within the next 30 days
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

  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* ── TOP ROW: Summary cards ── */}
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

      {/* ── MAIN: Today's Appointments by Staff ── */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1E3A5F' }}>
          Today's Appointments by Staff
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {staffList.map((staff) => {
            const appts = todayAppointments.filter((a) => a.staff_id === staff.id)
            return (
              <div
                key={staff.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
              >
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
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── BOTTOM: Upcoming Birthdays ── */}
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
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function AppointmentRow({
  appt,
  onClientClick,
}: {
  appt: TodayAppointment
  onClientClick: () => void
}) {
  const time = new Date(appt.start_time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <button
          onClick={onClientClick}
          className="text-sm font-semibold hover:underline truncate block text-left"
          style={{ color: '#2E86AB' }}
        >
          {appt.clients?.name ?? 'Unknown client'}
        </button>
        <p className="text-xs text-gray-500 mt-0.5">
          {appt.services?.name ?? '—'} · {time}
        </p>
      </div>
      <span
        className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
          appt.status === 'confirmed'
            ? 'bg-green-100 text-green-700'
            : appt.status === 'completed'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-red-100 text-red-600'
        }`}
      >
        {appt.status}
      </span>
    </div>
  )
}

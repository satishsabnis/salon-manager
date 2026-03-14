import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'

type Period = 'today' | 'week' | 'month' | 'year'

interface StaffInfo {
  id: string
  name: string
  role: string | null
  specialisation: string | null
}

interface ApptRow {
  id: string
  start_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  clients: { name: string } | null
  services: { name: string; price: number | null } | null
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

const statusStyle: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

const periodLabels: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
]

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [staff, setStaff] = useState<StaffInfo | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [appointments, setAppointments] = useState<ApptRow[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadingAppts, setLoadingAppts] = useState(false)

  // Load staff info once
  useEffect(() => {
    if (!id) return
    supabase
      .from('staff')
      .select('id, name, role, specialisation')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setStaff(data as StaffInfo | null)
        setLoadingStaff(false)
      })
  }, [id])

  // Reload appointments when period changes
  useEffect(() => {
    if (!id) return
    setLoadingAppts(true)
    const { start, end } = getPeriodRange(period)
    supabase
      .from('appointments')
      .select('id, start_time, status, clients(name), services(name, price)')
      .eq('staff_id', id)
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time', { ascending: false })
      .then(({ data }) => {
        setAppointments((data as unknown as ApptRow[]) ?? [])
        setLoadingAppts(false)
      })
  }, [id, period])

  if (loadingStaff) {
    return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading...</div>
  }
  if (!staff) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
        Staff member not found.
      </div>
    )
  }

  const nonCancelled = appointments.filter(a => a.status !== 'cancelled')
  const completed    = appointments.filter(a => a.status === 'completed')
  const totalRevenue = completed.reduce((s, a) => s + (a.services?.price ?? 0), 0)
  const avgRevenue   = completed.length > 0 ? totalRevenue / completed.length : 0

  const fmt = (iso: string) => {
    try { return format(parseISO(iso), 'MMM d, yyyy · h:mm a') } catch { return iso }
  }

  return (
    <div className="space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Dashboard
      </button>

      {/* Staff header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ backgroundColor: '#1E3A5F' }}
          >
            {staff.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1E3A5F' }}>{staff.name}</h1>
            {(staff.role || staff.specialisation) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[staff.role, staff.specialisation].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap">
        {periodLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className="px-4 py-2 text-sm font-semibold rounded-lg border transition-all"
            style={period === key
              ? { backgroundColor: '#1E3A5F', color: 'white', borderColor: '#1E3A5F' }
              : { backgroundColor: 'white', color: '#374151', borderColor: '#E5E7EB' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Appointments" value={String(nonCancelled.length)} color="#2E86AB" />
        <StatCard label="Completed"          value={String(completed.length)}    color="#16a34a" />
        <StatCard label="Revenue (AED)"      value={`AED ${totalRevenue.toFixed(2)}`} color="#1E3A5F" />
        <StatCard label="Avg / Appointment"  value={`AED ${avgRevenue.toFixed(2)}`}  color="#7C3AED" />
      </div>

      {/* Appointments table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold" style={{ color: '#1E3A5F' }}>
            Appointments
            {!loadingAppts && (
              <span className="ml-2 text-sm font-normal text-gray-400">({appointments.length})</span>
            )}
          </h2>
        </div>

        {loadingAppts ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No appointments for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1E3A5F' }} className="text-white text-left">
                  <th className="px-5 py-3 font-semibold">Date & Time</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold text-right">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt, i) => (
                  <tr
                    key={appt.id}
                    className="border-t border-gray-100"
                    style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F9FAFB' }}
                  >
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmt(appt.start_time)}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {appt.clients?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{appt.services?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: '#1E3A5F' }}>
                      {appt.services?.price != null ? `AED ${appt.services.price.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Revenue footer — completed only */}
              <tfoot>
                <tr className="border-t-2 border-gray-200" style={{ backgroundColor: '#F0F7FF' }}>
                  <td colSpan={3} className="px-5 py-3 font-bold text-gray-700">
                    Total Revenue (completed)
                  </td>
                  <td className="px-5 py-3 text-right font-bold" style={{ color: '#1E3A5F' }}>
                    AED {totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-lg font-bold truncate" style={{ color }}>{value}</p>
    </div>
  )
}

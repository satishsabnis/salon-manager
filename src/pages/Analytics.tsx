import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CalendarDays, Users, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface ServiceCount {
  name: string
  count: number
}

interface TopClient {
  id: string
  name: string
  visit_count: number
  total_spent: number | null
}

interface SummaryStats {
  totalAppointments: number
  totalRevenue: number
  totalClients: number
  mostPopularService: string
}

export default function Analytics() {
  const [stats, setStats] = useState<SummaryStats>({
    totalAppointments: 0,
    totalRevenue: 0,
    totalClients: 0,
    mostPopularService: '—',
  })
  const [serviceChartData, setServiceChartData] = useState<ServiceCount[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [appointmentsRes, clientsRes, topClientsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, services(name, price)')
          .neq('status', 'cancelled'),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('clients')
          .select('id, name, visit_count, total_spent')
          .order('visit_count', { ascending: false })
          .limit(5),
      ])

      if (appointmentsRes.error) { setError(appointmentsRes.error.message); setLoading(false); return }
      if (clientsRes.error)      { setError(clientsRes.error.message);      setLoading(false); return }
      if (topClientsRes.error)   { setError(topClientsRes.error.message);   setLoading(false); return }

      const appointments = appointmentsRes.data ?? []

      // Total revenue: sum prices from joined service
      const totalRevenue = appointments.reduce((sum, appt) => {
        const price = (appt.services as { price?: number } | null)?.price ?? 0
        return sum + price
      }, 0)

      // Appointments per service
      const serviceCounts: Record<string, number> = {}
      for (const appt of appointments) {
        const name = (appt.services as { name?: string } | null)?.name ?? 'Unknown'
        serviceCounts[name] = (serviceCounts[name] ?? 0) + 1
      }

      const chartData = Object.entries(serviceCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      const mostPopularService = chartData[0]?.name ?? '—'

      setStats({
        totalAppointments: appointments.length,
        totalRevenue,
        totalClients: clientsRes.count ?? 0,
        mostPopularService,
      })
      setServiceChartData(chartData)
      setTopClients(topClientsRes.data ?? [])
      setLoading(false)
    }

    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-400 text-sm">
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
        Analytics
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Appointments"
          value={stats.totalAppointments.toString()}
          icon={<CalendarDays size={20} />}
          accent="#2E86AB"
        />
        <SummaryCard
          label="Total Revenue"
          value={`AED ${stats.totalRevenue.toFixed(2)}`}
          icon={<span className="text-[11px] font-bold leading-none">AED</span>}
          accent="#2E86AB"
        />
        <SummaryCard
          label="Total Clients"
          value={stats.totalClients.toString()}
          icon={<Users size={20} />}
          accent="#2E86AB"
        />
        <SummaryCard
          label="Most Popular Service"
          value={stats.mostPopularService}
          icon={<Scissors size={20} />}
          accent="#1E3A5F"
          small
        />
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-6">
          Appointments by Service
        </h2>
        {serviceChartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No appointment data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={serviceChartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={32}
              />
              <Tooltip
                contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(value) => [value, 'Appointments']}
              />
              <Bar dataKey="count" fill="#2E86AB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Clients */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Top Clients by Visits
        </h2>
        {topClients.length === 0 ? (
          <p className="text-sm text-gray-400">No client data yet.</p>
        ) : (
          <div className="space-y-3">
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center gap-4">
                {/* Rank */}
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: i === 0 ? '#1E3A5F' : '#2E86AB' }}
                >
                  {i + 1}
                </span>
                {/* Name */}
                <span className="flex-1 text-sm font-medium text-gray-800">{client.name}</span>
                {/* Visits */}
                <span className="text-sm text-gray-500">{client.visit_count ?? 0} visits</span>
                {/* Spent */}
                <span className="text-sm font-semibold" style={{ color: '#1E3A5F' }}>
                  AED {(client.total_spent ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
  small = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
  small?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p
          className={`font-bold text-gray-800 mt-0.5 truncate ${small ? 'text-base' : 'text-2xl'}`}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

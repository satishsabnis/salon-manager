import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import NewAppointmentModal from '../components/NewAppointmentModal'
import AppointmentDetailModal, { type AppointmentDetail } from '../components/AppointmentDetailModal'

// Lightweight type for the list (detail fields piggyback via AppointmentDetail)
type Appointment = AppointmentDetail

const statusBadge: Record<Appointment['status'], string> = {
  confirmed: 'bg-green-100 text-green-700 border border-green-200',
  cancelled: 'bg-red-100 text-red-700 border border-red-200',
  completed: 'bg-blue-100 text-blue-700 border border-blue-200',
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, client_id, service_id, staff_id, start_time, end_time, status, notes,
        clients(id, name),
        services(name, duration_mins, price),
        staff(name)
      `)
      .order('start_time', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setAppointments((data ?? []) as unknown as Appointment[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const handleSaved = () => {
    setShowNewModal(false)
    fetchAppointments()
  }

  // Update the appointment in-place so the list reflects changes without refetch
  const handleUpdated = (updated: AppointmentDetail) => {
    setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setSelectedAppt(updated)
  }

  const formatDate = (datetime: string) => {
    try { return format(parseISO(datetime), 'MMM d, yyyy') } catch { return datetime }
  }

  const formatTime = (datetime: string) => {
    try { return format(parseISO(datetime), 'h:mm a') } catch { return datetime }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
          Appointments
        </h1>
        <button
          onClick={() => setShowNewModal(true)}
          style={{ backgroundColor: '#2E86AB' }}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity min-h-[44px]"
        >
          <Plus size={16} />
          New Appointment
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20 text-gray-400 text-sm">
          Loading appointments...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-base">No appointments yet</p>
          <p className="text-sm mt-1">Click "New Appointment" to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1E3A5F' }} className="text-white text-left">
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Staff</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt, i) => (
                  <tr
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50/60 transition-colors ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">{appt.clients?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{appt.services?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{appt.staff?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{formatDate(appt.start_time)}</td>
                    <td className="px-5 py-3 text-gray-600">{formatTime(appt.start_time)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                onClick={() => setSelectedAppt(appt)}
                className="bg-white rounded-xl shadow-sm p-4 space-y-2 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{appt.clients?.name ?? '—'}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {appt.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{appt.services?.name ?? '—'} &mdash; {appt.staff?.name ?? '—'}</p>
                <p className="text-sm text-gray-400">{formatDate(appt.start_time)} at {formatTime(appt.start_time)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* New appointment modal */}
      {showNewModal && (
        <NewAppointmentModal
          onClose={() => setShowNewModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Detail modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}

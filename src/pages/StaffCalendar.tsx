import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import NewAppointmentModal from '../components/NewAppointmentModal'

const SLOT_HEIGHT = 64  // px per 30-min slot
const START_HOUR = 9    // 9 AM
const END_HOUR = 19     // 7 PM
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2  // 20 slots

interface Staff {
  id: string
  name: string
  specialisation: string | null
}

interface Appointment {
  id: string
  staff_id: string
  client_id: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  clients: { name: string } | null
  services: { name: string } | null
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function slotLabel(slotIndex: number): string {
  // Only called for even slots (on the hour)
  const h = START_HOUR + slotIndex / 2
  const ampm = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h
  return `${display}:00 ${ampm}`
}

function slotTimeValue(slotIndex: number): string {
  const totalMins = START_HOUR * 60 + slotIndex * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function apptTop(appt: Appointment): number {
  const d = new Date(appt.start_time)
  const startMins = d.getHours() * 60 + d.getMinutes()
  return ((startMins - START_HOUR * 60) / 30) * SLOT_HEIGHT
}

function apptHeight(appt: Appointment): number {
  const durationMins =
    (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000
  return Math.max((durationMins / 30) * SLOT_HEIGHT, SLOT_HEIGHT * 0.75)
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-blue-100 border-blue-300 text-blue-900',
  completed: 'bg-green-100 border-green-300 text-green-900',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500',
}

export default function StaffCalendar() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()))
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [prefill, setPrefill] = useState<{ staffId: string; date: string; time: string } | null>(null)
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  useEffect(() => {
    supabase
      .from('staff')
      .select('id, name, specialisation')
      .order('name')
      .then(({ data }) => setStaffList((data as Staff[]) ?? []))
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('appointments')
      .select('id, staff_id, client_id, start_time, end_time, status, clients(name), services(name)')
      .gte('start_time', `${selectedDate}T00:00:00`)
      .lte('start_time', `${selectedDate}T23:59:59`)
    setAppointments((data as unknown as Appointment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  function isSlotOccupied(staffId: string, slotIndex: number): boolean {
    const slotStart = START_HOUR * 60 + slotIndex * 30
    const slotEnd = slotStart + 30
    return appointments
      .filter((a) => a.staff_id === staffId)
      .some((a) => {
        const s = new Date(a.start_time)
        const e = new Date(a.end_time)
        const aStart = s.getHours() * 60 + s.getMinutes()
        const aEnd = e.getHours() * 60 + e.getMinutes()
        return aStart < slotEnd && aEnd > slotStart
      })
  }

  function handleSlotClick(staff: Staff, slotIndex: number) {
    if (isSlotOccupied(staff.id, slotIndex)) return
    setPrefill({ staffId: staff.id, date: selectedDate, time: slotTimeValue(slotIndex) })
    setShowModal(true)
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(toLocalDateStr(d))
  }

  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
          Staff Calendar
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
          />
          <button
            onClick={() => shiftDay(1)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setSelectedDate(toLocalDateStr(new Date()))}
            className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Staff header */}
        <div className="flex border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="w-16 shrink-0 border-r border-gray-100" />
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className="flex-1 px-4 py-3 border-l border-gray-100 text-center min-w-0"
            >
              <p className="font-bold text-sm text-gray-800 truncate">{staff.name}</p>
              {staff.specialisation && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{staff.specialisation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: '72vh' }}>
          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="flex">
              {/* Time gutter */}
              <div className="w-16 shrink-0 relative border-r border-gray-100" style={{ height: totalHeight }}>
                {Array.from({ length: TOTAL_SLOTS }).map((_, i) =>
                  i % 2 === 0 ? (
                    <div
                      key={i}
                      className="absolute right-2 text-[11px] text-gray-400 -translate-y-2.5 text-right leading-none"
                      style={{ top: i * SLOT_HEIGHT }}
                    >
                      {slotLabel(i)}
                    </div>
                  ) : null
                )}
              </div>

              {/* Staff columns */}
              {staffList.map((staff) => {
                const staffAppts = appointments.filter((a) => a.staff_id === staff.id)
                return (
                  <div
                    key={staff.id}
                    className="flex-1 relative border-l border-gray-100 min-w-0"
                    style={{ height: totalHeight }}
                  >
                    {/* Slot cells */}
                    {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                      const occupied = isSlotOccupied(staff.id, i)
                      return (
                        <div
                          key={i}
                          style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                          className={`absolute w-full transition-colors ${
                            i % 2 === 0
                              ? 'border-b border-gray-100'
                              : 'border-b border-dashed border-gray-100'
                          } ${occupied ? '' : 'hover:bg-blue-50 cursor-pointer'}`}
                          onClick={() => !occupied && handleSlotClick(staff, i)}
                        />
                      )
                    })}

                    {/* Appointment blocks */}
                    {staffAppts.map((appt) => {
                      const top = apptTop(appt)
                      const height = apptHeight(appt)
                      if (top < 0 || top >= totalHeight) return null
                      return (
                        <div
                          key={appt.id}
                          style={{ top: top + 1, height: height - 2, left: 3, right: 3 }}
                          className={`absolute rounded-md border px-2 py-1 cursor-pointer overflow-hidden z-10 ${
                            STATUS_STYLE[appt.status] ?? 'bg-gray-100 border-gray-300'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAppt(appt)
                          }}
                        >
                          <p className="text-xs font-semibold truncate leading-tight">
                            {appt.clients?.name ?? '—'}
                          </p>
                          {height >= SLOT_HEIGHT * 0.9 && (
                            <p className="text-xs truncate opacity-70 leading-tight mt-0.5">
                              {appt.services?.name ?? '—'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Appointment detail */}
      {selectedAppt && (
        <AppointmentDetail appt={selectedAppt} onClose={() => setSelectedAppt(null)} />
      )}

      {/* New appointment modal */}
      {showModal && prefill && (
        <NewAppointmentModal
          prefill={prefill}
          onClose={() => { setShowModal(false); setPrefill(null) }}
          onSaved={() => { setShowModal(false); setPrefill(null); fetchAppointments() }}
        />
      )}
    </div>
  )
}

function AppointmentDetail({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const start = new Date(appt.start_time)
  const end = new Date(appt.end_time)
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const timeStr = `${fmt(start)} – ${fmt(end)}`
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const statusBadge: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-gray-800 text-base">{appt.clients?.name ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{appt.services?.name ?? '—'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-1">{dateStr}</p>
        <p className="text-sm font-medium text-gray-700 mb-3">{timeStr}</p>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
            statusBadge[appt.status] ?? 'bg-gray-100 text-gray-500'
          }`}
        >
          {appt.status}
        </span>
      </div>
    </div>
  )
}

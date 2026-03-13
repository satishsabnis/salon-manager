import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckCircle, Clock, Calendar, User, Scissors, FileText, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'

export interface AppointmentDetail {
  id: string
  client_id: string
  service_id: string
  staff_id: string
  start_time: string
  end_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  clients: { id: string; name: string } | null
  services: { name: string; duration_mins: number; price: number | null } | null
  staff: { name: string } | null
}

interface Props {
  appt: AppointmentDetail
  onClose: () => void
  onUpdated: (updated: AppointmentDetail) => void
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1'

// ── Star rating sub-component ──────────────────────────────────────────────
function StarRating({
  value,
  hover,
  onHover,
  onLeave,
  onClick,
}: {
  value: number
  hover: number
  onHover: (n: number) => void
  onLeave: () => void
  onClick: (n: number) => void
}) {
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || value)
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => onHover(n)}
            onMouseLeave={onLeave}
            onClick={() => onClick(n)}
            className="text-4xl leading-none transition-transform hover:scale-110 focus:outline-none"
            style={{ color: filled ? '#F59E0B' : '#D1D5DB' }}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

// ── Rating popup ───────────────────────────────────────────────────────────
function RatingPopup({
  appt,
  onDone,
}: {
  appt: AppointmentDetail
  onDone: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    await supabase.from('reviews').insert({
      appointment_id: appt.id,
      client_id: appt.client_id,
      rating,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop (darker to sit above the detail modal) */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-2xl">✨</p>
          <h3 className="text-base font-bold" style={{ color: '#1E3A5F' }}>
            How was your experience?
          </h3>
          <p className="text-sm text-gray-500">New Look Beauty Salon</p>
        </div>

        {/* Stars */}
        <StarRating
          value={rating}
          hover={hover}
          onHover={setHover}
          onLeave={() => setHover(0)}
          onClick={setRating}
        />
        {rating > 0 && (
          <p className="text-center text-xs text-gray-400">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}

        {/* Comment */}
        <div>
          <label className={labelClass}>Comment <span className="text-gray-300">(optional)</span></label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDone}
            className="flex-1 border border-gray-300 text-gray-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#1E3A5F' }}
          >
            {submitting ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function AppointmentDetailModal({ appt, onClose, onUpdated }: Props) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(
    format(parseISO(appt.start_time), 'yyyy-MM-dd')
  )
  const [rescheduleTime, setRescheduleTime] = useState(
    format(parseISO(appt.start_time), 'HH:mm')
  )

  const fmt = (iso: string, pattern: string) => {
    try { return format(parseISO(iso), pattern) } catch { return iso }
  }

  const handleComplete = async () => {
    setBusy(true)
    setError('')

    const { error: apptErr } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appt.id)

    if (apptErr) { setError(apptErr.message); setBusy(false); return }

    const price = appt.services?.price ?? 0
    const { data: clientData } = await supabase
      .from('clients')
      .select('total_spent, visit_count')
      .eq('id', appt.client_id)
      .single()

    await supabase
      .from('clients')
      .update({
        total_spent: (clientData?.total_spent ?? 0) + price,
        visit_count: (clientData?.visit_count ?? 0) + 1,
      })
      .eq('id', appt.client_id)

    onUpdated({ ...appt, status: 'completed' })
    setBusy(false)
    setShowRating(true)
  }

  const handleCancel = async () => {
    setBusy(true)
    setError('')
    const { error: apptErr } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appt.id)

    if (apptErr) { setError(apptErr.message); setBusy(false); return }

    onUpdated({ ...appt, status: 'cancelled' })
    setConfirmCancel(false)
    setBusy(false)
  }

  const handleReschedule = async () => {
    setBusy(true)
    setError('')
    const startTime = new Date(`${rescheduleDate}T${rescheduleTime}`)
    const durationMs = (appt.services?.duration_mins ?? 60) * 60 * 1000
    const endTime = new Date(startTime.getTime() + durationMs)

    const { error: apptErr } = await supabase
      .from('appointments')
      .update({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .eq('id', appt.id)

    if (apptErr) { setError(apptErr.message); setBusy(false); return }

    onUpdated({ ...appt, start_time: startTime.toISOString(), end_time: endTime.toISOString() })
    setRescheduling(false)
    setBusy(false)
  }

  const statusBadge = {
    confirmed: 'bg-green-100 text-green-700 border border-green-200',
    cancelled:  'bg-red-100 text-red-700 border border-red-200',
    completed:  'bg-blue-100 text-blue-700 border border-blue-200',
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal — flex column so footer stays pinned */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

          {/* Header */}
          <div
            style={{ backgroundColor: '#1E3A5F' }}
            className="flex items-center justify-between px-6 py-4 rounded-t-2xl shrink-0"
          >
            <h2 className="text-white font-semibold text-base">Appointment Detail</h2>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

            {/* Status badge */}
            <div className="flex justify-end">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[appt.status]}`}>
                {appt.status}
              </span>
            </div>

            {/* Detail rows */}
            <div className="space-y-4">

              {/* Client */}
              <div className="flex items-start gap-3">
                <User size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className={labelClass}>Client</p>
                  <button
                    onClick={() => navigate(`/dashboard/clients/${appt.client_id}`)}
                    className="text-sm font-semibold hover:underline flex items-center gap-1"
                    style={{ color: '#2E86AB' }}
                  >
                    {appt.clients?.name ?? '—'}
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Service */}
              <div className="flex items-start gap-3">
                <Scissors size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className={labelClass}>Service</p>
                  <p className="text-sm font-medium text-gray-800">{appt.services?.name ?? '—'}</p>
                  <div className="flex gap-3 mt-0.5">
                    {appt.services?.duration_mins != null && (
                      <span className="text-xs text-gray-500">{appt.services.duration_mins} min</span>
                    )}
                    {appt.services?.price != null && (
                      <span className="text-xs font-semibold" style={{ color: '#1E3A5F' }}>
                        AED {appt.services.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff */}
              <div className="flex items-start gap-3">
                <User size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className={labelClass}>Staff</p>
                  <p className="text-sm text-gray-800">{appt.staff?.name ?? '—'}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className={labelClass}>Date & Time</p>
                  {rescheduling ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="date"
                        className={inputClass}
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                      />
                      <input
                        type="time"
                        className={inputClass}
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800">
                      {fmt(appt.start_time, 'MMMM d, yyyy')} at {fmt(appt.start_time, 'h:mm a')}
                    </p>
                  )}
                </div>
              </div>

              {/* End time */}
              {!rescheduling && (
                <div className="flex items-start gap-3">
                  <Clock size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className={labelClass}>End Time</p>
                    <p className="text-sm text-gray-800">{fmt(appt.end_time, 'h:mm a')}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="flex items-start gap-3">
                <FileText size={15} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={labelClass}>Notes</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {appt.notes?.trim() || <span className="text-gray-400">—</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {/* Status banners */}
            {appt.status === 'cancelled' && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 font-medium">
                <X size={16} className="text-gray-400 shrink-0" />
                Appointment Cancelled
              </div>
            )}

            {appt.status === 'completed' && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                <CheckCircle size={16} className="text-green-500 shrink-0" />
                Job Completed by {appt.staff?.name ?? 'staff'}
              </div>
            )}
          </div>

          {/* ── Fixed footer with action buttons ── */}
          {appt.status === 'confirmed' && (
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
              {rescheduling ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setRescheduling(false)}
                    disabled={busy}
                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={busy || !rescheduleDate || !rescheduleTime}
                    className="flex-1 text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#2E86AB' }}
                  >
                    {busy ? 'Saving...' : 'Confirm Reschedule'}
                  </button>
                </div>
              ) : confirmCancel ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center font-medium">Cancel this appointment?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmCancel(false)}
                      disabled={busy}
                      className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Keep It
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={busy}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {busy ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleComplete}
                    disabled={busy}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Complete
                  </button>
                  <button
                    onClick={() => setRescheduling(true)}
                    disabled={busy}
                    className="flex-1 text-white text-sm font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#2E86AB' }}
                  >
                    📅 Reschedule
                  </button>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    disabled={busy}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Rating popup — rendered on top of the detail modal */}
      {showRating && (
        <RatingPopup appt={appt} onDone={() => { setShowRating(false); onClose() }} />
      )}
    </>
  )
}

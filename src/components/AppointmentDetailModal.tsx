import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
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

// ── Star rating ────────────────────────────────────────────────────────────
function StarRating({ value, hover, onHover, onLeave, onClick }: {
  value: number; hover: number
  onHover: (n: number) => void; onLeave: () => void; onClick: (n: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onMouseEnter={() => onHover(n)} onMouseLeave={onLeave} onClick={() => onClick(n)}
          style={{ fontSize: 36, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer',
            color: n <= (hover || value) ? '#F59E0B' : '#D1D5DB' }}>
          ★
        </button>
      ))}
    </div>
  )
}

// ── Rating popup ───────────────────────────────────────────────────────────
function RatingPopup({ appt, onDone }: { appt: AppointmentDetail; onDone: () => void }) {
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
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 60, background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28 }}>✨</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', margin: '4px 0' }}>How was your experience?</h3>
          <p style={{ fontSize: 14, color: '#6B7280' }}>New Look Beauty Salon</p>
        </div>
        <StarRating value={rating} hover={hover} onHover={setHover} onLeave={() => setHover(0)} onClick={setRating} />
        {rating > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Comment (optional)</label>
          <textarea rows={3} placeholder="Share your experience..."
            value={comment} onChange={(e) => setComment(e.target.value)}
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px',
              fontSize: 14, resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={onDone}
            style={{ flex: 1, border: '1px solid #D1D5DB', background: 'white', color: '#374151',
              padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Skip
          </button>
          <button onClick={handleSubmit} disabled={!rating || submitting}
            style={{ flex: 1, backgroundColor: '#1E3A5F', color: 'white', padding: '10px',
              borderRadius: 8, fontWeight: 600, border: 'none', cursor: rating ? 'pointer' : 'not-allowed',
              opacity: !rating || submitting ? 0.5 : 1, fontSize: 14 }}>
            {submitting ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment popup ──────────────────────────────────────────────────────────
function PaymentPopup({ appt, onDone }: { appt: AppointmentDetail; onDone: () => void }) {
  const fullPrice = appt.services?.price ?? 0
  const [partialAmount, setPartialAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const savePayment = async (type: 'full' | 'partial', amount: number) => {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('appointments')
      .update({ payment_status: type === 'full' ? 'paid_full' : 'paid_partial', amount_paid: amount })
      .eq('id', appt.id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onDone()
  }

  const handlePartial = () => {
    const amt = parseFloat(partialAmount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    savePayment('partial', amt)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 60, background: 'rgba(0,0,0,0.65)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>💰 Record Payment</h3>
          <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20 }}>✕</button>
        </div>
        {fullPrice > 0 && (
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
            Service total: <strong style={{ color: '#111827' }}>AED {fullPrice.toFixed(2)}</strong>
          </p>
        )}
        <button onClick={() => savePayment('full', fullPrice)} disabled={saving}
          style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', padding: '12px',
            borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16,
            opacity: saving ? 0.6 : 1 }}>
          ✓ Full Payment{fullPrice > 0 ? ` — AED ${fullPrice.toFixed(2)}` : ''}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>or partial</span>
          <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        </div>
        <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 4 }}>Partial Amount (AED)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" min="0" step="0.01" placeholder="0.00"
            value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
            style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px',
              fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          <button onClick={handlePartial} disabled={saving || !partialAmount}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 8,
              fontWeight: 700, border: 'none', cursor: 'pointer', opacity: !partialAmount || saving ? 0.5 : 1 }}>
            Save
          </button>
        </div>
        {error && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{error}</p>}
        <button onClick={onDone}
          style={{ width: '100%', border: '1px solid #E5E7EB', background: 'white', color: '#6B7280',
            padding: '10px', borderRadius: 8, cursor: 'pointer', marginTop: 16, fontSize: 14 }}>
          Cancel
        </button>
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
  const [showPayment, setShowPayment] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(format(parseISO(appt.start_time), 'yyyy-MM-dd'))
  const [rescheduleTime, setRescheduleTime] = useState(format(parseISO(appt.start_time), 'HH:mm'))

  const fmt = (iso: string, pattern: string) => {
    try { return format(parseISO(iso), pattern) } catch { return iso }
  }

  const handleComplete = async () => {
    setBusy(true); setError('')
    const { error: apptErr } = await supabase
      .from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    if (apptErr) { setError(apptErr.message); setBusy(false); return }
    const price = appt.services?.price ?? 0
    const { data: clientData } = await supabase
      .from('clients').select('total_spent, visit_count').eq('id', appt.client_id).single()
    await supabase.from('clients').update({
      total_spent: (clientData?.total_spent ?? 0) + price,
      visit_count: (clientData?.visit_count ?? 0) + 1,
    }).eq('id', appt.client_id)
    onUpdated({ ...appt, status: 'completed' })
    setBusy(false); setShowRating(true)
  }

  const handleReschedule = () => setRescheduling(true)

  const saveReschedule = async () => {
    setBusy(true); setError('')
    const startTime = new Date(`${rescheduleDate}T${rescheduleTime}`)
    const durationMs = (appt.services?.duration_mins ?? 60) * 60 * 1000
    const endTime = new Date(startTime.getTime() + durationMs)
    const { error: apptErr } = await supabase
      .from('appointments')
      .update({ start_time: startTime.toISOString(), end_time: endTime.toISOString() })
      .eq('id', appt.id)
    if (apptErr) { setError(apptErr.message); setBusy(false); return }
    onUpdated({ ...appt, start_time: startTime.toISOString(), end_time: endTime.toISOString() })
    setRescheduling(false); setBusy(false)
  }

  const handleCancel = () => setConfirmCancel(true)

  const doCancel = async () => {
    setBusy(true); setError('')
    const { error: apptErr } = await supabase
      .from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
    if (apptErr) { setError(apptErr.message); setBusy(false); return }
    onUpdated({ ...appt, status: 'cancelled' })
    setConfirmCancel(false); setBusy(false)
  }

  const handlePayment = () => setShowPayment(true)

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #D1D5DB', borderRadius: 8,
    padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        {/* Click outside to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal box */}
        <div className="bg-white rounded-xl w-96 max-h-screen flex flex-col" style={{ position: 'relative', maxHeight: '90vh' }}>

          {/* Header */}
          <div className="bg-blue-900 text-white p-4 rounded-t-xl flex justify-between items-center" style={{ flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Appointment Detail</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', lineHeight: 1 }}>
              <X size={20} />
            </button>
          </div>

          {/* Content area */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3" style={{ minHeight: 0 }}>

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{
                padding: '2px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                textTransform: 'capitalize',
                backgroundColor: appt.status === 'completed' ? '#DBEAFE' : appt.status === 'cancelled' ? '#FEE2E2' : '#DCFCE7',
                color: appt.status === 'completed' ? '#1D4ED8' : appt.status === 'cancelled' ? '#DC2626' : '#16A34A',
              }}>
                {appt.status}
              </span>
            </div>

            {/* Client */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>CLIENT</p>
              <button onClick={() => navigate(`/dashboard/clients/${appt.client_id}`)}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600,
                  fontSize: 15, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                {appt.clients?.name ?? '—'}
              </button>
            </div>

            {/* Service */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>SERVICE</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{appt.services?.name ?? '—'}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                {appt.services?.duration_mins != null && (
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{appt.services.duration_mins} min</span>
                )}
                {appt.services?.price != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>
                    AED {appt.services.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Staff */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>STAFF</p>
              <p style={{ fontSize: 14, color: '#111827' }}>{appt.staff?.name ?? '—'}</p>
            </div>

            {/* Date & Time */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>DATE & TIME</p>
              {rescheduling ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input type="date" value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)} style={inputStyle} />
                  <input type="time" value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)} style={inputStyle} />
                </div>
              ) : (
                <p style={{ fontSize: 14, color: '#111827' }}>
                  {fmt(appt.start_time, 'MMMM d, yyyy')} at {fmt(appt.start_time, 'h:mm a')}
                  {' '}→{' '}{fmt(appt.end_time, 'h:mm a')}
                </p>
              )}
            </div>

            {/* Notes */}
            {appt.notes?.trim() && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 2 }}>NOTES</p>
                <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{appt.notes}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{error}</p>
            )}

            {/* Completed banner */}
            {appt.status === 'completed' && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
                padding: '10px 14px', color: '#15803D', fontWeight: 600, fontSize: 14 }}>
                ✓ Job Completed by {appt.staff?.name ?? 'staff'}
              </div>
            )}

            {/* Cancelled banner */}
            {appt.status === 'cancelled' && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
                padding: '10px 14px', color: '#6B7280', fontWeight: 600, fontSize: 14 }}>
                ✕ Appointment Cancelled
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 grid grid-cols-2 gap-3 border-t border-gray-200" style={{ flexShrink: 0 }}>
            {rescheduling ? (
              <>
                <button onClick={() => setRescheduling(false)} disabled={busy}
                  style={{ backgroundColor: '#6B7280', color: 'white', padding: '12px', borderRadius: '8px',
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  Discard
                </button>
                <button onClick={saveReschedule} disabled={busy || !rescheduleDate || !rescheduleTime}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px',
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Saving...' : 'Confirm'}
                </button>
              </>
            ) : confirmCancel ? (
              <>
                <button onClick={() => setConfirmCancel(false)} disabled={busy}
                  style={{ backgroundColor: '#6B7280', color: 'white', padding: '12px', borderRadius: '8px',
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  Keep It
                </button>
                <button onClick={doCancel} disabled={busy}
                  style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px', borderRadius: '8px',
                    fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleComplete}
                  style={{ backgroundColor: '#16a34a', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Complete
                </button>
                <button onClick={handleReschedule}
                  style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Reschedule
                </button>
                <button onClick={handlePayment}
                  style={{ backgroundColor: '#ca8a04', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Payment
                </button>
                <button onClick={handleCancel}
                  style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {showRating && (
        <RatingPopup appt={appt} onDone={() => { setShowRating(false); onClose() }} />
      )}
      {showPayment && (
        <PaymentPopup appt={appt} onDone={() => setShowPayment(false)} />
      )}
    </>
  )
}

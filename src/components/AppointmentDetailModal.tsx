import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
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
  service_ids?: string[] | null
  service_staff?: Record<string, string> | null
  total_price?: number | null
}

interface ServiceOption {
  id: string
  name: string
  duration_mins: number
  price: number
}

interface StaffOption {
  id: string
  name: string
}

interface Props {
  appt: AppointmentDetail
  onClose: () => void
  onUpdated: (updated: AppointmentDetail) => void
}

// ── Star rating ─────────────────────────────────────────────────────────────
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

// ── Rating popup ────────────────────────────────────────────────────────────
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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A0505', margin: '4px 0' }}>How was your experience?</h3>
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
            style={{ flex: 1, backgroundColor: '#1A0505', color: 'white', padding: '10px',
              borderRadius: 8, fontWeight: 600, border: 'none', cursor: rating ? 'pointer' : 'not-allowed',
              opacity: !rating || submitting ? 0.5 : 1, fontSize: 14 }}>
            {submitting ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment popup ───────────────────────────────────────────────────────────
function PaymentPopup({ appt, totalPrice, onDone }: { appt: AppointmentDetail; totalPrice: number; onDone: () => void }) {
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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A0505', margin: 0 }}>💰 Record Payment</h3>
          <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20 }}>✕</button>
        </div>
        {totalPrice > 0 && (
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
            Total: <strong style={{ color: '#111827' }}>AED {totalPrice.toFixed(2)}</strong>
          </p>
        )}
        <button onClick={() => savePayment('full', totalPrice)} disabled={saving}
          style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', padding: '12px',
            borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15, marginBottom: 16,
            opacity: saving ? 0.6 : 1 }}>
          ✓ Full Payment{totalPrice > 0 ? ` — AED ${totalPrice.toFixed(2)}` : ''}
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

// ── Main modal ──────────────────────────────────────────────────────────────
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

  const [allServices, setAllServices] = useState<ServiceOption[]>([])
  const [allStaff, setAllStaff] = useState<StaffOption[]>([])
  const [addedServices, setAddedServices] = useState<ServiceOption[]>([])
  const [serviceStaff, setServiceStaff] = useState<Record<string, string>>(appt.service_staff ?? {})
  const [showServicePicker, setShowServicePicker] = useState(false)
  const [addingService, setAddingService] = useState(false)

  // Editable prices per service
  const [primaryPrice, setPrimaryPrice] = useState(appt.services?.price ?? 0)
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({})

  const isReadOnly = appt.status === 'completed' || appt.status === 'cancelled'

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('id, name, duration_mins, price').eq('is_active', true).order('name'),
      supabase.from('staff').select('id, name').order('name'),
    ]).then(([svcRes, staffRes]) => {
      setAllServices((svcRes.data ?? []) as ServiceOption[])
      setAllStaff((staffRes.data ?? []) as StaffOption[])
    })

    const ids = appt.service_ids?.filter(Boolean) ?? []
    if (ids.length > 0) {
      supabase.from('services').select('id, name, duration_mins, price').in('id', ids)
        .then(({ data }) => {
          if (data) {
            setAddedServices(data as ServiceOption[])
            const prices: Record<string, number> = {}
            ;(data as ServiceOption[]).forEach(s => { prices[s.id] = s.price })
            setServicePrices(prices)
          }
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const computedTotal = primaryPrice + Object.values(servicePrices).reduce((s, p) => s + p, 0)

  const fmt = (iso: string, pattern: string) => {
    try { return format(parseISO(iso), pattern) } catch { return iso }
  }

  // Save total_price to DB (called on price input blur)
  const saveTotalPrice = async (total: number) => {
    await supabase.from('appointments').update({ total_price: total }).eq('id', appt.id)
    onUpdated({ ...appt, total_price: total })
  }

  // ── Add service ───────────────────────────────────────────────────────────
  const addService = async (svc: ServiceOption) => {
    setAddingService(true)
    const newServiceIds = [...(appt.service_ids ?? []), svc.id]
    const newEndTime = new Date(new Date(appt.end_time).getTime() + svc.duration_mins * 60 * 1000)
    const newPrices = { ...servicePrices, [svc.id]: svc.price }
    const newTotal = primaryPrice + Object.values(newPrices).reduce((s, p) => s + p, 0)

    const { error: err } = await supabase.from('appointments').update({
      service_ids: newServiceIds,
      end_time: newEndTime.toISOString(),
      total_price: newTotal,
    }).eq('id', appt.id)

    if (err) {
      setError(err.message)
    } else {
      setAddedServices(prev => [...prev, svc])
      setServicePrices(newPrices)
      onUpdated({ ...appt, service_ids: newServiceIds, end_time: newEndTime.toISOString(), total_price: newTotal })
    }
    setShowServicePicker(false)
    setAddingService(false)
  }

  // ── Remove service ────────────────────────────────────────────────────────
  const removeService = async (svcId: string) => {
    const newServiceIds = (appt.service_ids ?? []).filter(id => id !== svcId)
    const newPrices = { ...servicePrices }
    delete newPrices[svcId]
    const newTotal = primaryPrice + Object.values(newPrices).reduce((s, p) => s + p, 0)

    await supabase.from('appointments').update({
      service_ids: newServiceIds,
      total_price: newTotal,
    }).eq('id', appt.id)

    setAddedServices(prev => prev.filter(s => s.id !== svcId))
    setServicePrices(newPrices)
    onUpdated({ ...appt, service_ids: newServiceIds, total_price: newTotal })
  }

  // ── Assign staff to added service ─────────────────────────────────────────
  const assignStaff = async (serviceId: string, staffId: string) => {
    const updated = { ...serviceStaff, [serviceId]: staffId }
    setServiceStaff(updated)
    await supabase.from('appointments').update({ service_staff: updated }).eq('id', appt.id)
    onUpdated({ ...appt, service_staff: updated })
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  const handleComplete = async () => {
    setBusy(true); setError('')
    const { error: apptErr } = await supabase
      .from('appointments').update({ status: 'completed' }).eq('id', appt.id)
    if (apptErr) { setError(apptErr.message); setBusy(false); return }
    const { data: clientData } = await supabase
      .from('clients').select('total_spent, visit_count').eq('id', appt.client_id).single()
    await supabase.from('clients').update({
      total_spent: (clientData?.total_spent ?? 0) + computedTotal,
      visit_count: (clientData?.visit_count ?? 0) + 1,
    }).eq('id', appt.client_id)
    onUpdated({ ...appt, status: 'completed' })
    setBusy(false); setShowRating(true)
  }

  // ── Reschedule ────────────────────────────────────────────────────────────
  const handleReschedule = () => setRescheduling(true)

  const saveReschedule = async () => {
    setBusy(true); setError('')
    const startTime = new Date(`${rescheduleDate}T${rescheduleTime}`)
    const totalDurationMins =
      (appt.services?.duration_mins ?? 60) +
      addedServices.reduce((sum, s) => sum + s.duration_mins, 0)
    const endTime = new Date(startTime.getTime() + totalDurationMins * 60 * 1000)
    const { error: apptErr } = await supabase
      .from('appointments')
      .update({ start_time: startTime.toISOString(), end_time: endTime.toISOString() })
      .eq('id', appt.id)
    if (apptErr) { setError(apptErr.message); setBusy(false); return }
    onUpdated({ ...appt, start_time: startTime.toISOString(), end_time: endTime.toISOString() })
    setRescheduling(false); setBusy(false)
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
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
    border: '1px solid #D1D5DB', borderRadius: 8,
    padding: '7px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%',
  }

  const statusColors = {
    confirmed: { bg: '#FEF3C7', color: '#92400E' },
    completed: { bg: '#D1FAE5', color: '#065F46' },
    cancelled: { bg: '#FEE2E2', color: '#DC2626' },
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3">
        <div className="absolute inset-0" onClick={onClose} />

        {/* Wide modal box */}
        <div style={{
          position: 'relative', background: 'white', borderRadius: 16,
          width: '100%', maxWidth: 760, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>

          {/* Header */}
          <div style={{
            backgroundColor: '#1A0505', color: 'white', padding: '14px 20px',
            borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Appointment Detail</span>
              <span style={{
                padding: '2px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                textTransform: 'capitalize',
                backgroundColor: statusColors[appt.status].bg,
                color: statusColors[appt.status].color,
              }}>
                {appt.status}
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Two-column body */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* LEFT: Client info, datetime, notes */}
            <div style={{
              flex: '0 0 42%', padding: '20px 16px 20px 20px',
              overflowY: 'auto', borderRight: '1px solid #F3F4F6',
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>

              {/* Client */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client</p>
                <button onClick={() => navigate(`/dashboard/clients/${appt.client_id}`)}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 600,
                    fontSize: 15, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  {appt.clients?.name ?? '—'}
                </button>
              </div>

              {/* Staff */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primary Staff</p>
                <p style={{ fontSize: 14, color: '#111827', margin: 0, fontWeight: 500 }}>{appt.staff?.name ?? '—'}</p>
              </div>

              {/* Date & Time */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date & Time</p>
                {rescheduling ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)} style={inputStyle} />
                    <input type="time" value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)} style={inputStyle} />
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: '#111827', margin: 0, lineHeight: 1.6 }}>
                    {fmt(appt.start_time, 'MMMM d, yyyy')}<br />
                    <span style={{ color: '#6B7280', fontSize: 13 }}>
                      {fmt(appt.start_time, 'h:mm a')} → {fmt(appt.end_time, 'h:mm a')}
                    </span>
                  </p>
                )}
              </div>

              {/* Notes */}
              {appt.notes?.trim() && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</p>
                  <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{appt.notes}</p>
                </div>
              )}

              {/* Status banners */}
              {appt.status === 'completed' && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', color: '#15803D', fontWeight: 600, fontSize: 14 }}>
                  ✓ Appointment Completed
                </div>
              )}
              {appt.status === 'cancelled' && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontWeight: 600, fontSize: 14 }}>
                  ✕ Appointment Cancelled
                </div>
              )}

              {/* Error */}
              {error && (
                <p style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                  {error}
                </p>
              )}
            </div>

            {/* RIGHT: Services */}
            <div style={{
              flex: 1, padding: '20px 20px 20px 16px',
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Services
              </p>

              {/* Primary service row */}
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {appt.services?.name ?? '—'}
                  </p>
                  <span style={{ fontSize: 11, color: '#374151', background: '#E5E7EB', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                    {appt.staff?.name ?? '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {appt.services?.duration_mins != null ? `${appt.services.duration_mins} min` : ''}
                  </span>
                  <span style={{ fontSize: 12, color: '#D1D5DB' }}>·</span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>AED</span>
                  {isReadOnly ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1A0505' }}>{primaryPrice.toFixed(2)}</span>
                  ) : (
                    <input
                      type="number" min="0" step="0.01"
                      value={primaryPrice || ''}
                      onChange={e => setPrimaryPrice(parseFloat(e.target.value) || 0)}
                      onBlur={() => saveTotalPrice(computedTotal)}
                      style={{ width: 80, border: '1px solid #D1D5DB', borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none', textAlign: 'right' }}
                    />
                  )}
                </div>
              </div>

              {/* Added service rows */}
              {addedServices.map(svc => {
                const assignedStaffId = serviceStaff[svc.id]
                const price = servicePrices[svc.id] ?? svc.price
                return (
                  <div key={svc.id} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#065F46', margin: 0 }}>{svc.name}</p>
                      {!isReadOnly && (
                        <button
                          onClick={() => removeService(svc.id)}
                          title="Remove service"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '0 2px', fontSize: 16, lineHeight: 1 }}>
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isReadOnly ? 0 : 8 }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{svc.duration_mins} min</span>
                      <span style={{ fontSize: 12, color: '#D1D5DB' }}>·</span>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>AED</span>
                      {isReadOnly ? (
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A0505' }}>{price.toFixed(2)}</span>
                      ) : (
                        <input
                          type="number" min="0" step="0.01"
                          value={price || ''}
                          onChange={e => setServicePrices(prev => ({ ...prev, [svc.id]: parseFloat(e.target.value) || 0 }))}
                          onBlur={() => saveTotalPrice(computedTotal)}
                          style={{ width: 80, border: '1px solid #BBF7D0', borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none', textAlign: 'right' }}
                        />
                      )}
                    </div>

                    {/* Staff dropdown — only when active */}
                    {!isReadOnly ? (
                      <select
                        value={assignedStaffId ?? ''}
                        onChange={e => assignStaff(svc.id, e.target.value)}
                        style={{ width: '100%', border: '1px solid #BBF7D0', borderRadius: 6, padding: '5px 8px', fontSize: 13, background: 'white', outline: 'none', cursor: 'pointer' }}>
                        <option value="">— Assign staff —</option>
                        {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    ) : assignedStaffId ? (
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>
                        Staff: {allStaff.find(s => s.id === assignedStaffId)?.name ?? '—'}
                      </p>
                    ) : null}
                  </div>
                )
              })}

              {/* Add Service button — only when active */}
              {!isReadOnly && (
                <button
                  onClick={() => setShowServicePicker(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                    border: '1px dashed #D4A847', background: showServicePicker ? '#FFFBEB' : 'white',
                    color: '#92400E', borderRadius: 8, padding: '7px 12px', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer',
                  }}>
                  <Plus size={14} />
                  Add Service
                </button>
              )}

              {/* Service picker dropdown */}
              {showServicePicker && !isReadOnly && (
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                  {allServices
                    .filter(s => s.id !== appt.service_id && !addedServices.some(a => a.id === s.id))
                    .map((svc, i, arr) => (
                      <button
                        key={svc.id}
                        onClick={() => addService(svc)}
                        disabled={addingService}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          width: '100%', padding: '9px 12px', background: 'white', border: 'none',
                          borderBottom: i < arr.length - 1 ? '1px solid #E5E7EB' : 'none',
                          cursor: addingService ? 'wait' : 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{svc.name}</p>
                          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{svc.duration_mins} min</p>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A0505', whiteSpace: 'nowrap' }}>
                          AED {svc.price.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  {allServices.filter(s => s.id !== appt.service_id && !addedServices.some(a => a.id === s.id)).length === 0 && (
                    <p style={{ fontSize: 13, color: '#9CA3AF', padding: '12px', margin: 0, textAlign: 'center' }}>
                      All services already added
                    </p>
                  )}
                </div>
              )}

              {/* Total bar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#1A0505', color: 'white', borderRadius: 8, padding: '10px 14px', marginTop: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Total · {1 + addedServices.length} service{1 + addedServices.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>AED {computedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer — only for active appointments */}
          {!isReadOnly && (
            <div style={{
              borderTop: '1px solid #E5E7EB', padding: '12px 20px', flexShrink: 0,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            }}>
              {rescheduling ? (
                <>
                  <button onClick={() => setRescheduling(false)} disabled={busy}
                    style={{ backgroundColor: '#6B7280', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    Discard
                  </button>
                  <button onClick={saveReschedule} disabled={busy || !rescheduleDate || !rescheduleTime}
                    style={{ backgroundColor: '#2563eb', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Saving...' : 'Confirm Reschedule'}
                  </button>
                </>
              ) : confirmCancel ? (
                <>
                  <button onClick={() => setConfirmCancel(false)} disabled={busy}
                    style={{ backgroundColor: '#6B7280', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    Keep It
                  </button>
                  <button onClick={doCancel} disabled={busy}
                    style={{ backgroundColor: '#dc2626', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleComplete} disabled={busy}
                    style={{ backgroundColor: '#16a34a', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Complete
                  </button>
                  <button onClick={handleReschedule}
                    style={{ backgroundColor: '#2563eb', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Reschedule
                  </button>
                  <button onClick={handlePayment}
                    style={{ backgroundColor: '#D4A847', color: '#1A0505', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Payment
                  </button>
                  <button onClick={handleCancel}
                    style={{ backgroundColor: '#dc2626', color: 'white', padding: '11px', borderRadius: 8, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {showRating && (
        <RatingPopup appt={appt} onDone={() => { setShowRating(false); onClose() }} />
      )}
      {showPayment && (
        <PaymentPopup appt={appt} totalPrice={computedTotal} onDone={() => setShowPayment(false)} />
      )}
    </>
  )
}

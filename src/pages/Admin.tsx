import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SALON_ID = '11111111-1111-1111-1111-111111111111'
const DARK = '#1E3A5F'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'

// ── Types ──────────────────────────────────────────────────────────────────
interface StaffRow {
  id: string
  name: string
  email: string | null
  role: string | null
  specialisation: string | null
}

interface ServiceRow {
  id: string
  name: string
  duration_mins: number | null
  price: number | null
  category: string | null
  is_active: boolean | null
}

interface OfferRow {
  id: string
  salon_id: string
  title: string
  description: string | null
  discount_type: string
  discount_value: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

interface SettingsRow {
  id: string
  salon_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  opening_hours: string | null
}

type Tab = 'staff' | 'services' | 'offers' | 'settings'

// ── Reusable inline-style helpers ──────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: MUTED,
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
}
const btnPrimary: React.CSSProperties = {
  backgroundColor: DARK, color: 'white', border: 'none',
  padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  backgroundColor: 'white', color: '#374151', border: `1px solid ${BORDER}`,
  padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
}
const btnEdit: React.CSSProperties = {
  backgroundColor: '#2563EB', color: 'white', border: 'none',
  padding: '5px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer',
}
const btnDelete: React.CSSProperties = {
  backgroundColor: '#DC2626', color: 'white', border: 'none',
  padding: '5px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer',
}
const btnSave: React.CSSProperties = {
  backgroundColor: '#16A34A', color: 'white', border: 'none',
  padding: '5px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer',
}
const th: React.CSSProperties = {
  padding: '11px 16px', color: 'white', fontWeight: 600,
  fontSize: 13, textAlign: 'left', whiteSpace: 'nowrap',
}
const td = (i: number): React.CSSProperties => ({
  padding: '11px 16px', fontSize: 14, color: '#374151',
  backgroundColor: i % 2 === 0 ? 'white' : '#F9FAFB',
  borderTop: `1px solid ${BORDER}`,
})
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}
const modal: React.CSSProperties = {
  background: 'white', borderRadius: 16, width: '100%',
  maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
}
const modalHead: React.CSSProperties = {
  background: DARK, padding: '16px 20px', borderRadius: '16px 16px 0 0',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const modalBody: React.CSSProperties = { padding: 24, overflowY: 'auto', flex: 1 }
const modalFoot: React.CSSProperties = {
  padding: '16px 24px', borderTop: `1px solid ${BORDER}`,
  display: 'flex', gap: 12, justifyContent: 'flex-end',
}
const fg: React.CSSProperties = { marginBottom: 16 }
const tableCard: React.CSSProperties = {
  background: 'white', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden',
}

// ── Staff Tab ──────────────────────────────────────────────────────────────
interface StaffForm { name: string; email: string; role: string; specialisation: string }
const emptyStaff: StaffForm = { name: '', email: '', role: '', specialisation: '' }

function StaffTab() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyStaff)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = async () => {
    setFetchErr('')
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, email, role, specialisation')
        .eq('salon_id', SALON_ID)
        .order('name')
      if (error) setFetchErr(error.message)
      else setStaff((data ?? []) as StaffRow[])
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(emptyStaff); setFormErr(''); setShowModal(true) }
  const openEdit = (s: StaffRow) => {
    setEditing(s)
    setForm({ name: s.name, email: s.email ?? '', role: s.role ?? '', specialisation: s.specialisation ?? '' })
    setFormErr('')
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const save = async () => {
    if (!form.name.trim()) { setFormErr('Name is required'); return }
    setSaving(true); setFormErr('')
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      role: form.role.trim() || null,
      specialisation: form.specialisation.trim() || null,
      salon_id: SALON_ID,
    }
    try {
      const { error } = editing
        ? await supabase.from('staff').update(payload).eq('id', editing.id)
        : await supabase.from('staff').insert(payload)
      if (error) { setFormErr(error.message); setSaving(false); return }
      closeModal(); load()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this staff member?')) return
    await supabase.from('staff').delete().eq('id', id)
    load()
  }

  const f = (key: keyof StaffForm, val: string) => setForm(p => ({ ...p, [key]: val }))

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>Loading...</div>
  if (fetchErr) return <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '12px 16px', fontSize: 14 }}>Error: {fetchErr}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: MUTED }}>{staff.length} staff member{staff.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={openAdd}>+ Add Staff</button>
      </div>

      <div style={tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: DARK }}>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Specialisation</th>
              <th style={{ ...th, width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: MUTED, fontSize: 14 }}>No staff added yet.</td></tr>
            ) : staff.map((s, i) => (
              <tr key={s.id}>
                <td style={{ ...td(i), fontWeight: 600 }}>{s.name}</td>
                <td style={td(i)}>{s.email ?? '—'}</td>
                <td style={td(i)}>{s.role ?? '—'}</td>
                <td style={td(i)}>{s.specialisation ?? '—'}</td>
                <td style={td(i)}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnEdit} onClick={() => openEdit(s)}>Edit</button>
                    <button style={btnDelete} onClick={() => del(s.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHead}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Staff' : 'Add Staff'}</span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={modalBody}>
              <div style={fg}><label style={lbl}>Name *</label><input style={inp} value={form.name} onChange={e => f('name', e.target.value)} placeholder="Full name" /></div>
              <div style={fg}><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" /></div>
              <div style={fg}><label style={lbl}>Role</label><input style={inp} value={form.role} onChange={e => f('role', e.target.value)} placeholder="e.g. Senior Stylist" /></div>
              <div style={fg}><label style={lbl}>Specialisation</label><input style={inp} value={form.specialisation} onChange={e => f('specialisation', e.target.value)} placeholder="e.g. Hair Colouring, Nails" /></div>
              {formErr && <div style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{formErr}</div>}
            </div>
            <div style={modalFoot}>
              <button style={btnSecondary} onClick={closeModal}>Cancel</button>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Services Tab ───────────────────────────────────────────────────────────
interface ServiceForm { name: string; duration_mins: string; price: string; category: string }
const emptySvc: ServiceForm = { name: '', duration_mins: '', price: '', category: '' }

function ServicesTab() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ServiceRow | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptySvc)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  // Inline edit state per row: maps service id → { price, duration }
  const [inlineEdit, setInlineEdit] = useState<Record<string, { price: string; duration: string } | null>>({})

  const load = async () => {
    setFetchErr('')
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_mins, price, category, is_active')
        .order('name')
      if (error) setFetchErr(error.message)
      else setServices((data ?? []) as ServiceRow[])
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(emptySvc); setFormErr(''); setShowModal(true) }
  const openEdit = (s: ServiceRow) => {
    setEditing(s)
    setForm({ name: s.name, duration_mins: s.duration_mins != null ? String(s.duration_mins) : '', price: s.price != null ? String(s.price) : '', category: s.category ?? '' })
    setFormErr(''); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const save = async () => {
    if (!form.name.trim()) { setFormErr('Name is required'); return }
    setSaving(true); setFormErr('')
    const payload = {
      name: form.name.trim(),
      duration_mins: form.duration_mins ? parseInt(form.duration_mins, 10) : null,
      price: form.price ? parseFloat(form.price) : null,
      category: form.category.trim() || null,
    }
    try {
      const { error } = editing
        ? await supabase.from('services').update(payload).eq('id', editing.id)
        : await supabase.from('services').insert(payload)
      if (error) { setFormErr(error.message); setSaving(false); return }
      closeModal(); load()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this service?')) return
    await supabase.from('services').delete().eq('id', id)
    load()
  }

  const startInline = (s: ServiceRow) => {
    setInlineEdit(p => ({ ...p, [s.id]: { price: s.price != null ? String(s.price) : '', duration: s.duration_mins != null ? String(s.duration_mins) : '' } }))
  }
  const cancelInline = (id: string) => setInlineEdit(p => ({ ...p, [id]: null }))
  const saveInline = async (s: ServiceRow) => {
    const ie = inlineEdit[s.id]
    if (!ie) return
    await supabase.from('services').update({
      price: ie.price ? parseFloat(ie.price) : null,
      duration_mins: ie.duration ? parseInt(ie.duration, 10) : null,
    }).eq('id', s.id)
    cancelInline(s.id)
    load()
  }

  const toggleActive = async (s: ServiceRow) => {
    await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
    load()
  }

  const f = (key: keyof ServiceForm, val: string) => setForm(p => ({ ...p, [key]: val }))

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>Loading...</div>
  if (fetchErr) return <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '12px 16px', fontSize: 14 }}>Error: {fetchErr}</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: MUTED }}>{services.length} service{services.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={openAdd}>+ Add Service</button>
      </div>

      <div style={tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: DARK }}>
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Duration (mins)</th>
              <th style={th}>Price (AED)</th>
              <th style={th}>Active</th>
              <th style={{ ...th, width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: MUTED, fontSize: 14 }}>No services added yet.</td></tr>
            ) : services.map((s, i) => {
              const ie = inlineEdit[s.id]
              return (
                <tr key={s.id}>
                  <td style={{ ...td(i), fontWeight: 600 }}>{s.name}</td>
                  <td style={td(i)}>{s.category ?? '—'}</td>
                  {/* Inline-editable Duration */}
                  <td style={td(i)}>
                    {ie ? (
                      <input value={ie.duration} type="number" min="0"
                        onChange={e => setInlineEdit(p => ({ ...p, [s.id]: { ...p[s.id]!, duration: e.target.value } }))}
                        style={{ width: 80, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none' }} />
                    ) : s.duration_mins != null ? `${s.duration_mins} min` : '—'}
                  </td>
                  {/* Inline-editable Price */}
                  <td style={td(i)}>
                    {ie ? (
                      <input value={ie.price} type="number" min="0" step="0.01"
                        onChange={e => setInlineEdit(p => ({ ...p, [s.id]: { ...p[s.id]!, price: e.target.value } }))}
                        style={{ width: 90, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none' }} />
                    ) : s.price != null ? `${s.price.toFixed(2)}` : '—'}
                  </td>
                  <td style={td(i)}>
                    <button onClick={() => toggleActive(s)}
                      style={{ backgroundColor: s.is_active ? '#16A34A' : '#9CA3AF', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={td(i)}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {ie ? (
                        <>
                          <button style={btnSave} onClick={() => saveInline(s)}>Save</button>
                          <button style={{ ...btnSecondary, padding: '5px 10px', fontSize: 12 }} onClick={() => cancelInline(s.id)}>✕</button>
                        </>
                      ) : (
                        <>
                          <button style={btnEdit} onClick={() => startInline(s)}>Edit $</button>
                          <button style={{ ...btnEdit, backgroundColor: '#7C3AED' }} onClick={() => openEdit(s)}>Edit</button>
                          <button style={btnDelete} onClick={() => del(s.id)}>Del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHead}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Service' : 'Add Service'}</span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={modalBody}>
              <div style={fg}><label style={lbl}>Service Name *</label><input style={inp} value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Haircut & Style" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Duration (mins)</label><input style={inp} type="number" min="0" value={form.duration_mins} onChange={e => f('duration_mins', e.target.value)} placeholder="60" /></div>
                <div><label style={lbl}>Price (AED)</label><input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={e => f('price', e.target.value)} placeholder="0.00" /></div>
              </div>
              <div style={fg}><label style={lbl}>Category</label><input style={inp} value={form.category} onChange={e => f('category', e.target.value)} placeholder="e.g. Hair, Nails, Skin" /></div>
              {formErr && <div style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>{formErr}</div>}
            </div>
            <div style={modalFoot}>
              <button style={btnSecondary} onClick={closeModal}>Cancel</button>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Offers Tab ─────────────────────────────────────────────────────────────
interface OfferForm {
  title: string; description: string; discount_type: string
  discount_value: string; start_date: string; end_date: string; is_active: boolean
}
const emptyOffer: OfferForm = {
  title: '', description: '', discount_type: 'percentage',
  discount_value: '', start_date: '', end_date: '', is_active: true,
}

function OffersTab() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<OfferRow | null>(null)
  const [form, setForm] = useState<OfferForm>(emptyOffer)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = async () => {
    setFetchErr('')
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('salon_id', SALON_ID)
        .order('created_at', { ascending: false })
      if (error) setFetchErr(error.message)
      else setOffers((data ?? []) as OfferRow[])
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load offers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(emptyOffer); setFormErr(''); setShowModal(true) }
  const openEdit = (o: OfferRow) => {
    setEditing(o)
    setForm({
      title: o.title, description: o.description ?? '', discount_type: o.discount_type,
      discount_value: o.discount_value != null ? String(o.discount_value) : '',
      start_date: o.start_date ?? '', end_date: o.end_date ?? '', is_active: o.is_active,
    })
    setFormErr(''); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const save = async () => {
    if (!form.title.trim()) { setFormErr('Title is required'); return }
    setSaving(true); setFormErr('')
    const payload = {
      salon_id: SALON_ID,
      title: form.title.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      is_active: form.is_active,
    }
    try {
      const { error } = editing
        ? await supabase.from('offers').update(payload).eq('id', editing.id)
        : await supabase.from('offers').insert(payload)
      if (error) { setFormErr(error.message); setSaving(false); return }
      closeModal(); load()
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this offer?')) return
    await supabase.from('offers').delete().eq('id', id)
    load()
  }

  const toggleActive = async (o: OfferRow) => {
    await supabase.from('offers').update({ is_active: !o.is_active }).eq('id', o.id)
    load()
  }

  const f = (key: keyof OfferForm, val: string | boolean) => setForm(p => ({ ...p, [key]: val }))

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>Loading...</div>
  if (fetchErr) return <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '12px 16px', fontSize: 14 }}>Error: {fetchErr}<br /><small>Make sure you've created the offers table in Supabase.</small></div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: MUTED }}>{offers.length} offer{offers.length !== 1 ? 's' : ''}</span>
        <button style={btnPrimary} onClick={openAdd}>+ Add Offer</button>
      </div>

      <div style={tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: DARK }}>
              <th style={th}>Title</th>
              <th style={th}>Type</th>
              <th style={th}>Discount</th>
              <th style={th}>Valid Until</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: MUTED, fontSize: 14 }}>No offers yet. Create your first offer!</td></tr>
            ) : offers.map((o, i) => (
              <tr key={o.id}>
                <td style={{ ...td(i), fontWeight: 600 }}>
                  {o.title}
                  {o.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 2, fontWeight: 400 }}>{o.description}</div>}
                </td>
                <td style={td(i)}>
                  <span style={{
                    backgroundColor: o.discount_type === 'percentage' ? '#EEF2FF' : '#FEF3C7',
                    color: o.discount_type === 'percentage' ? '#4338CA' : '#92400E',
                    padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  }}>
                    {o.discount_type === 'percentage' ? '%' : 'AED'}
                  </span>
                </td>
                <td style={{ ...td(i), fontWeight: 700, color: DARK }}>
                  {o.discount_value != null ? (o.discount_type === 'percentage' ? `${o.discount_value}%` : `AED ${o.discount_value.toFixed(2)}`) : '—'}
                </td>
                <td style={td(i)}>{o.end_date ? new Date(o.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td style={td(i)}>
                  <button onClick={() => toggleActive(o)}
                    style={{ backgroundColor: o.is_active ? '#16A34A' : '#9CA3AF', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {o.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={td(i)}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnEdit} onClick={() => openEdit(o)}>Edit</button>
                    <button style={btnDelete} onClick={() => del(o.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={modalHead}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit Offer' : 'New Offer'}</span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={modalBody}>
              <div style={fg}><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Summer Special 20% Off" /></div>
              <div style={fg}><label style={lbl}>Description</label><textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="Short description of the offer..." rows={2} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Discount Type</label>
                  <select value={form.discount_type} onChange={e => f('discount_type', e.target.value)} style={{ ...inp }}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (AED)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Discount Value</label>
                  <input style={inp} type="number" min="0" step="0.01" value={form.discount_value} onChange={e => f('discount_value', e.target.value)} placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 50'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>Start Date</label><input style={inp} type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} /></div>
                <div><label style={lbl}>End Date</label><input style={inp} type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="offer-active" checked={form.is_active} onChange={e => f('is_active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="offer-active" style={{ fontSize: 14, cursor: 'pointer', color: '#374151' }}>Active (visible to clients)</label>
              </div>
              {formErr && <div style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>{formErr}</div>}
            </div>
            <div style={modalFoot}>
              <button style={btnSecondary} onClick={closeModal}>Cancel</button>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Offer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab() {
  const [row, setRow] = useState<SettingsRow | null>(null)
  const [form, setForm] = useState({ salon_name: '', address: '', phone: '', email: '', opening_hours: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle()
        if (data) {
          const r = data as SettingsRow
          setRow(r)
          setForm({
            salon_name: r.salon_name ?? '',
            address: r.address ?? '',
            phone: r.phone ?? '',
            email: r.email ?? '',
            opening_hours: r.opening_hours ?? '',
          })
        }
      } catch (e) {
        console.warn('Settings load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const { error: err } = row
        ? await supabase.from('settings').update(form).eq('id', row.id)
        : await supabase.from('settings').insert(form)
      if (err) { setError(err.message); setSaving(false); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const f = (key: keyof typeof form, val: string) => setForm(p => ({ ...p, [key]: val }))

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED }}>Loading...</div>

  const fields: { key: keyof typeof form; label: string; placeholder: string; type?: string }[] = [
    { key: 'salon_name', label: 'Salon Name', placeholder: 'New Look Beauty Salon' },
    { key: 'address', label: 'Address', placeholder: '123 Main St, Dubai' },
    { key: 'phone', label: 'Phone', placeholder: '+971 4 000 0000', type: 'tel' },
    { key: 'email', label: 'Email', placeholder: 'info@salon.com', type: 'email' },
    { key: 'opening_hours', label: 'Opening Hours', placeholder: 'Mon–Sat 9am–8pm, Sun 10am–6pm' },
  ]

  return (
    <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24, maxWidth: 520 }}>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Salon Settings</h3>
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key} style={fg}>
          <label style={lbl}>{label}</label>
          <input style={inp} type={type ?? 'text'} value={form[key]} onChange={e => f(key, e.target.value)} placeholder={placeholder} />
        </div>
      ))}
      {error && <div style={{ color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>{error}</div>}
      {saved && <div style={{ color: '#15803D', fontSize: 13, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>✓ Settings saved</div>}
      <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
    </div>
  )
}

// ── Admin Page ─────────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('staff')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'staff', label: 'Staff' },
    { key: 'services', label: 'Services' },
    { key: 'offers', label: 'Offers' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: DARK, marginBottom: 24, marginTop: 0 }}>Admin</h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F3F4F6', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '8px 20px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              borderRadius: 8, transition: 'all 0.15s',
              background: activeTab === key ? 'white' : 'transparent',
              color: activeTab === key ? '#111827' : MUTED,
              boxShadow: activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'offers' && <OffersTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  )
}

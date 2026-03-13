import { useEffect, useState } from 'react'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────
interface StaffRow {
  id: string
  name: string
  email: string | null
  role: string | null
  specialisation: string | null
  working_hours: string | null
}

interface ServiceRow {
  id: string
  name: string
  duration_mins: number | null
  price: number | null
  category: string | null
}

interface Settings {
  salon_name: string
  address: string
  phone: string
  email: string
  opening_hours: string
}

type Tab = 'staff' | 'services' | 'settings'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide'

// ── Staff Modal ────────────────────────────────────────────────────────────
function StaffModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: StaffRow
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [role, setRole] = useState(initial?.role ?? '')
  const [specialisation, setSpecialisation] = useState(initial?.specialisation ?? '')
  const [workingHours, setWorkingHours] = useState(initial?.working_hours ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      role: role.trim() || null,
      specialisation: specialisation.trim() || null,
      working_hours: workingHours.trim() || null,
    }
    try {
      const { error: err } = initial
        ? await supabase.from('staff').update(payload).eq('id', initial.id)
        : await supabase.from('staff').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-xl" style={{ backgroundColor: '#1E3A5F' }}>
          <h2 className="text-white font-bold text-base">{initial ? 'Edit Staff' : 'Add Staff'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={email ?? ''} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <input className={inputClass} value={role ?? ''} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Stylist" />
          </div>
          <div>
            <label className={labelClass}>Specialisation</label>
            <input className={inputClass} value={specialisation ?? ''} onChange={(e) => setSpecialisation(e.target.value)} placeholder="e.g. Hair Colouring, Nails" />
          </div>
          <div>
            <label className={labelClass}>Working Hours</label>
            <input className={inputClass} value={workingHours ?? ''} onChange={(e) => setWorkingHours(e.target.value)} placeholder="e.g. Mon–Fri 9am–6pm" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#1E3A5F' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Service Modal ──────────────────────────────────────────────────────────
function ServiceModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ServiceRow
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [duration, setDuration] = useState(initial?.duration_mins != null ? String(initial.duration_mins) : '')
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const payload = {
      name: name.trim(),
      duration_mins: duration ? parseInt(duration, 10) : null,
      price: price ? parseFloat(price) : null,
      category: category.trim() || null,
    }
    try {
      const { error: err } = initial
        ? await supabase.from('services').update(payload).eq('id', initial.id)
        : await supabase.from('services').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 rounded-t-xl" style={{ backgroundColor: '#1E3A5F' }}>
          <h2 className="text-white font-bold text-base">{initial ? 'Edit Service' : 'Add Service'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Service Name *</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haircut & Style" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Duration (mins)</label>
              <input type="number" min="0" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
            </div>
            <div>
              <label className={labelClass}>Price (AED)</label>
              <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Hair, Nails, Skin" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 text-white text-sm font-bold py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1E3A5F' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-base">Delete {label}?</h3>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Staff Tab ──────────────────────────────────────────────────────────────
function StaffTab() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffRow | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null)

  const fetchStaff = async () => {
    setFetchError('')
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, email, role, specialisation, working_hours')
        .order('name')
      if (error) {
        setFetchError(error.message)
      } else {
        setStaff((data as StaffRow[]) ?? [])
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStaff() }, [])

  const openAdd = () => { setEditTarget(undefined); setModalOpen(true) }
  const openEdit = (s: StaffRow) => { setEditTarget(s); setModalOpen(true) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await supabase.from('staff').delete().eq('id', deleteTarget.id)
    } catch {
      // ignore delete errors silently
    }
    setDeleteTarget(null)
    fetchStaff()
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>

  if (fetchError) return (
    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
      Error loading staff: {fetchError}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Plus size={15} /> Add Staff
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white text-left text-xs" style={{ backgroundColor: '#1E3A5F' }}>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold hidden sm:table-cell">Email</th>
              <th className="px-5 py-3 font-semibold hidden md:table-cell">Role</th>
              <th className="px-5 py-3 font-semibold hidden lg:table-cell">Specialisation</th>
              <th className="px-5 py-3 font-semibold hidden lg:table-cell">Hours</th>
              <th className="px-5 py-3 font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No staff added yet.</td></tr>
            ) : staff.map((s, i) => (
              <tr key={s.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{s.email ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{s.role ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{s.specialisation ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500 hidden lg:table-cell">{s.working_hours ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteTarget(s)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <StaffModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchStaff() }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── Services Tab ───────────────────────────────────────────────────────────
function ServicesTab() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ServiceRow | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null)

  const fetchServices = async () => {
    setFetchError('')
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_mins, price, category')
        .order('name')
      if (error) {
        setFetchError(error.message)
      } else {
        setServices((data as ServiceRow[]) ?? [])
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServices() }, [])

  const openAdd = () => { setEditTarget(undefined); setModalOpen(true) }
  const openEdit = (s: ServiceRow) => { setEditTarget(s); setModalOpen(true) }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await supabase.from('services').delete().eq('id', deleteTarget.id)
    } catch {
      // ignore delete errors silently
    }
    setDeleteTarget(null)
    fetchServices()
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>

  if (fetchError) return (
    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
      Error loading services: {fetchError}
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{services.length} service{services.length !== 1 ? 's' : ''}</p>
        <button onClick={openAdd}
          className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Plus size={15} /> Add Service
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white text-left text-xs" style={{ backgroundColor: '#1E3A5F' }}>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold hidden sm:table-cell">Category</th>
              <th className="px-5 py-3 font-semibold">Duration</th>
              <th className="px-5 py-3 font-semibold">Price (AED)</th>
              <th className="px-5 py-3 font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No services added yet.</td></tr>
            ) : services.map((s, i) => (
              <tr key={s.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{s.category ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500">{s.duration_mins != null ? `${s.duration_mins} min` : '—'}</td>
                <td className="px-5 py-3 font-semibold text-gray-700">{s.price != null ? s.price.toFixed(2) : '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => setDeleteTarget(s)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ServiceModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchServices() }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ── Settings Tab ───────────────────────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({
    salon_name: '', address: '', phone: '', email: '', opening_hours: '',
  })
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Use maybeSingle() — returns null (not an error) when 0 rows exist
        const { data, error: fetchErr } = await supabase
          .from('settings')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (fetchErr) {
          // Table may not exist yet — silently ignore, start with blank form
          console.warn('Settings fetch error:', fetchErr.message)
        } else if (data) {
          setSettingsId((data as { id: string }).id ?? null)
          setSettings({
            salon_name: (data as Settings & { id: string }).salon_name ?? '',
            address: (data as Settings & { id: string }).address ?? '',
            phone: (data as Settings & { id: string }).phone ?? '',
            email: (data as Settings & { id: string }).email ?? '',
            opening_hours: (data as Settings & { id: string }).opening_hours ?? '',
          })
        }
      } catch (e) {
        console.warn('Settings fetch exception:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const { error: err } = settingsId
        ? await supabase.from('settings').update(settings).eq('id', settingsId)
        : await supabase.from('settings').insert(settings)
      if (err) { setError(err.message); setSaving(false); return }
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>

  const fields: { key: keyof Settings; label: string; placeholder: string; type?: string }[] = [
    { key: 'salon_name', label: 'Salon Name', placeholder: 'New Look Beauty Salon' },
    { key: 'address', label: 'Address', placeholder: '123 Main St, Dubai' },
    { key: 'phone', label: 'Phone', placeholder: '+971 4 000 0000', type: 'tel' },
    { key: 'email', label: 'Email', placeholder: 'info@salon.com', type: 'email' },
    { key: 'opening_hours', label: 'Opening Hours', placeholder: 'Mon–Sat 9am–8pm, Sun 10am–6pm' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg space-y-5">
      <h3 className="font-bold text-gray-800 text-base">Salon Settings</h3>
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <label className={labelClass}>{label}</label>
          <input
            type={type ?? 'text'}
            className={inputClass}
            placeholder={placeholder}
            value={settings[key]}
            onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Settings saved</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#1E3A5F' }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}

// ── Admin Page ─────────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('staff')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'staff', label: 'Staff' },
    { key: 'services', label: 'Services' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1E3A5F' }}>Admin</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && <StaffTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  )
}

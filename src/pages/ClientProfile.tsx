import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Plus, X, Scissors } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  first_name: string | null
  last_name: string | null
  name: string
  email: string | null
  residence_area: string | null
  mobile_numbers: string[] | null
  birth_date: string | null
  loyalty_points: number | null
  notes: string | null
  avatar_url: string | null
  visit_count: number | null
  total_spent: number | null
}

interface Appointment {
  id: string
  start_time: string
  status: 'confirmed' | 'cancelled' | 'completed'
  services: { name: string } | null
  staff: { name: string } | null
}

interface AppointmentPhoto {
  id: string
  appointment_id: string
  photo_type: 'before' | 'after'
  photo_url: string
}

interface VisitNote {
  id: string
  note: string
  created_at: string
}

type Tab = 'appointments' | 'upcoming' | 'notes'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1'

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [apptPhotos, setApptPhotos] = useState<Record<string, AppointmentPhoto[]>>({})
  const [visitNotes, setVisitNotes] = useState<VisitNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('appointments')

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [residenceArea, setResidenceArea] = useState('')
  const [mobileNumbers, setMobileNumbers] = useState<string[]>([])
  const [birthDate, setBirthDate] = useState('')
  const [preferences, setPreferences] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [photoUploading, setPhotoUploading] = useState<Record<string, 'before' | 'after' | null>>({})

  useEffect(() => {
    const fetchAll = async () => {
      const [clientRes, apptRes, notesRes, photosRes] = await Promise.all([
        supabase
          .from('clients')
          .select(
            'id, first_name, last_name, name, email, residence_area, mobile_numbers, birth_date, loyalty_points, notes, avatar_url, visit_count, total_spent'
          )
          .eq('id', id)
          .single(),
        supabase
          .from('appointments')
          .select('id, start_time, status, services(name), staff(name)')
          .eq('client_id', id)
          .order('start_time', { ascending: false }),
        supabase
          .from('visit_notes')
          .select('id, note, created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('appointment_photos')
          .select('id, appointment_id, photo_type, photo_url')
          .eq('client_id', id),
      ])

      if (clientRes.error) {
        setError(clientRes.error.message)
        setLoading(false)
        return
      }

      const c = clientRes.data as Client
      setClient(c)
      setFirstName(c.first_name ?? '')
      setLastName(c.last_name ?? '')
      setEmail(c.email ?? '')
      setResidenceArea(c.residence_area ?? '')
      setMobileNumbers(c.mobile_numbers ?? [])
      setBirthDate(c.birth_date ?? '')
      setPreferences(c.notes ?? '')
      setAvatarUrl(c.avatar_url ?? null)
      setAppointments((apptRes.data as unknown as Appointment[]) ?? [])
      setVisitNotes(notesRes.data ?? [])

      // Group photos by appointment_id
      const grouped: Record<string, AppointmentPhoto[]> = {}
      for (const photo of (photosRes.data ?? []) as AppointmentPhoto[]) {
        if (!grouped[photo.appointment_id]) grouped[photo.appointment_id] = []
        grouped[photo.appointment_id].push(photo)
      }
      setApptPhotos(grouped)

      setLoading(false)
    }

    fetchAll()
  }, [id])

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('salon-photos')
      .upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('salon-photos').getPublicUrl(path)
      await supabase.from('clients').update({ avatar_url: publicUrl }).eq('id', id!)
      setAvatarUrl(publicUrl)
    }
    setUploadingAvatar(false)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || client!.name
    await supabase
      .from('clients')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        name: fullName,
        email: email || null,
        residence_area: residenceArea || null,
        mobile_numbers: mobileNumbers.filter(Boolean),
        birth_date: birthDate || null,
        notes: preferences || null,
      })
      .eq('id', id!)
    setSavingProfile(false)
    setIsEditing(false)
  }

  const handlePhotoUpload = async (apptId: string, type: 'before' | 'after', file: File) => {
    setPhotoUploading((prev) => ({ ...prev, [apptId]: type }))
    const ext = file.name.split('.').pop()
    const path = `appointments/${apptId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('salon-photos')
      .upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('salon-photos').getPublicUrl(path)
      const { data: inserted } = await supabase
        .from('appointment_photos')
        .insert({
          appointment_id: apptId,
          client_id: id,
          photo_type: type,
          photo_url: publicUrl,
        })
        .select('id, appointment_id, photo_type, photo_url')
        .single()
      if (inserted) {
        setApptPhotos((prev) => ({
          ...prev,
          [apptId]: [...(prev[apptId] ?? []), inserted as AppointmentPhoto],
        }))
      }
    }
    setPhotoUploading((prev) => ({ ...prev, [apptId]: null }))
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading...</div>
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
        {error}
      </div>
    )
  }
  if (!client) return null

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || client.name
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const now = new Date().toISOString()
  const upcomingAppointments = appointments.filter((a) => a.start_time > now)
  const pastAppointments = appointments.filter((a) => a.start_time <= now)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'appointments', label: 'Appointment History' },
    { key: 'upcoming', label: 'Upcoming Appointments' },
    { key: 'notes', label: 'Visit Notes' },
  ]

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard/clients')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Clients
      </button>

      <div className="flex gap-6 items-start">
        {/* ── LEFT SIDE ── */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Edit / Save button */}
            <div className="flex justify-end mb-4">
              {isEditing ? (
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  style={{ backgroundColor: '#2E86AB' }}
                  className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: '#1E3A5F' }}
                  >
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <svg
                      className="animate-spin text-gray-400"
                      width={13}
                      height={13}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <Camera size={13} className="text-gray-500" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAvatarUpload(file)
                    e.target.value = ''
                  }}
                />
              </div>
              <p className="mt-2 text-base font-bold text-gray-800">{displayName}</p>
              {client.loyalty_points != null && (
                <div className="mt-2 flex items-center gap-1 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span>⭐</span>
                  <span>{client.loyalty_points} pts</span>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input
                        className={inputClass}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input
                        className={inputClass}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Residence Area</label>
                    <input
                      className={inputClass}
                      value={residenceArea}
                      onChange={(e) => setResidenceArea(e.target.value)}
                      placeholder="e.g. Downtown, JBR..."
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Mobile Numbers</label>
                    <div className="space-y-2">
                      {mobileNumbers.map((num, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            className={inputClass}
                            value={num}
                            onChange={(e) => {
                              const updated = [...mobileNumbers]
                              updated[i] = e.target.value
                              setMobileNumbers(updated)
                            }}
                            placeholder="+971 50 000 0000"
                          />
                          <button
                            onClick={() => setMobileNumbers(mobileNumbers.filter((_, j) => j !== i))}
                            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setMobileNumbers([...mobileNumbers, ''])}
                        className="flex items-center gap-1 text-xs font-medium text-[#2E86AB] hover:opacity-80 transition-opacity"
                      >
                        <Plus size={13} />
                        Add Number
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Special Preferences</label>
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={3}
                      value={preferences}
                      onChange={(e) => setPreferences(e.target.value)}
                      placeholder="Allergies, style preferences, notes..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <ReadField label="Email" value={email} />
                  <ReadField label="Residence Area" value={residenceArea} />
                  <div>
                    <p className={labelClass}>Mobile Numbers</p>
                    {mobileNumbers.length === 0 ? (
                      <p className="text-sm text-gray-400">—</p>
                    ) : (
                      <div className="space-y-0.5">
                        {mobileNumbers.map((num, i) => (
                          <p key={i} className="text-sm text-gray-800">{num}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <ReadField
                    label="Date of Birth"
                    value={
                      birthDate
                        ? new Date(birthDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : ''
                    }
                  />
                  <ReadField label="Special Preferences" value={preferences} />
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                <Scissors size={12} />
                <span>Visits</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
                {client.visit_count ?? 0}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs mb-1">
                <span className="text-[10px] font-bold leading-none">AED</span>
                <span>Spent</span>
              </div>
              <p className="text-xl font-bold" style={{ color: '#1E3A5F' }}>
                AED {(client.total_spent ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE ── */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Appointment History */}
          {activeTab === 'appointments' && (
            <div className="space-y-3">
              {pastAppointments.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No past appointments.</div>
              ) : (
                pastAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    photos={apptPhotos[appt.id] ?? []}
                    uploading={photoUploading[appt.id] ?? null}
                    onPhotoUpload={handlePhotoUpload}
                  />
                ))
              )}
            </div>
          )}

          {/* Upcoming Appointments */}
          {activeTab === 'upcoming' && (
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No upcoming appointments.</div>
              ) : (
                upcomingAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    photos={apptPhotos[appt.id] ?? []}
                    uploading={photoUploading[appt.id] ?? null}
                    onPhotoUpload={handlePhotoUpload}
                  />
                ))
              )}
            </div>
          )}

          {/* Visit Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {visitNotes.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No visit notes recorded.</div>
              ) : (
                visitNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                  >
                    <p className="text-xs text-gray-400 mb-1.5">
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="block text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

function AppointmentCard({
  appt,
  photos,
  uploading,
  onPhotoUpload,
}: {
  appt: Appointment
  photos: AppointmentPhoto[]
  uploading: 'before' | 'after' | null
  onPhotoUpload: (apptId: string, type: 'before' | 'after', file: File) => void
}) {
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const date = new Date(appt.start_time)

  const beforePhotos = photos.filter((p) => p.photo_type === 'before')
  const afterPhotos = photos.filter((p) => p.photo_type === 'after')

  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <div className="text-center w-12 shrink-0">
            <p className="text-xs text-gray-400 uppercase">
              {date.toLocaleDateString('en-US', { month: 'short' })}
            </p>
            <p className="text-xl font-bold" style={{ color: '#1E3A5F' }}>
              {date.getDate()}
            </p>
            <p className="text-xs text-gray-400">{date.getFullYear()}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm">
              {appt.services?.name ?? 'Unknown service'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              with {appt.staff?.name ?? 'Unknown staff'}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
              appt.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : appt.status === 'cancelled'
                ? 'bg-red-100 text-red-600'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {appt.status}
          </span>
        </div>

        {/* Photo section */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {/* Upload buttons */}
          <div className="flex gap-2 mb-3">
            {(['before', 'after'] as const).map((type) => {
              const ref = type === 'before' ? beforeInputRef : afterInputRef
              const isUploading = uploading === type
              return (
                <button
                  key={type}
                  onClick={() => ref.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-[#2E86AB] hover:text-[#2E86AB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <svg
                      className="animate-spin text-current"
                      width={12}
                      height={12}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <Camera size={12} />
                  )}
                  {isUploading ? 'Uploading...' : `📷 ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </button>
              )
            })}
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPhotoUpload(appt.id, 'before', file)
                e.target.value = ''
              }}
            />
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onPhotoUpload(appt.id, 'after', file)
                e.target.value = ''
              }}
            />
          </div>

          {/* Thumbnails */}
          {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
            <div className="space-y-2">
              {([['before', beforePhotos], ['after', afterPhotos]] as const).map(([type, list]) =>
                list.length === 0 ? null : (
                  <div key={type}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      {type}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {list.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => setLightboxUrl(photo.photo_url)}
                          className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100 hover:border-[#2E86AB] hover:ring-2 hover:ring-[#2E86AB]/30 transition-all shrink-0 focus:outline-none"
                        >
                          <img
                            src={photo.photo_url}
                            alt={type}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Plus, Search, X, Mail, Phone, Scissors, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SALON_ID = '11111111-1111-1111-1111-111111111111'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  visit_count: number | null
  total_spent: number | null
}

interface FormValues {
  name: string
  email: string
  phone: string
  notes: string
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, phone, visit_count, total_spent')
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setClients(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
          Clients
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{ backgroundColor: '#2E86AB' }}
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity min-h-[44px]"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20 text-gray-400 text-sm">
          Loading clients...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-base">{search ? 'No clients match your search.' : 'No clients yet.'}</p>
          {!search && <p className="text-sm mt-1">Click "Add Client" to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/dashboard/clients/${client.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Name */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3"
                style={{ backgroundColor: '#2E86AB' }}
              >
                {client.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-semibold text-gray-800 text-base mb-3">{client.name}</h3>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-gray-500">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="shrink-0 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="shrink-0 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div
                className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm"
              >
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Scissors size={13} className="text-gray-400" />
                  <span>{client.visit_count ?? 0} visits</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <DollarSign size={13} className="text-gray-400" />
                  <span>AED {(client.total_spent ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            fetchClients()
          }}
        />
      )}
    </div>
  )
}

function AddClientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saveError, setSaveError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (values: FormValues) => {
    setSaveError('')
    const { error } = await supabase.from('clients').insert({
      salon_id: SALON_ID,
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      notes: values.notes || null,
    })
    if (error) {
      setSaveError(error.message)
    } else {
      onSaved()
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const errorClass = 'text-xs text-red-500 mt-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div
          style={{ backgroundColor: '#1E3A5F' }}
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
        >
          <h2 className="text-white font-semibold text-base">Add Client</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              placeholder="Full name"
              className={inputClass}
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="email"
              {...register('email')}
              placeholder="email@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              {...register('phone')}
              placeholder="+1 234 567 8900"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Preferences, allergies, etc."
              className={`${inputClass} resize-none`}
            />
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {saveError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: '#2E86AB' }}
              className="flex-1 text-white text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

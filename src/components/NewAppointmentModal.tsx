import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Client {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
  duration_mins: number
}

interface Staff {
  id: string
  name: string
}

interface FormValues {
  client_id: string
  service_id: string
  staff_id: string
  date: string
  time: string
  notes: string
}

interface Props {
  onClose: () => void
  onSaved: () => void
  prefill?: {
    staffId?: string
    date?: string
    time?: string
  }
}

export default function NewAppointmentModal({ onClose, onSaved, prefill }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saveError, setSaveError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      staff_id: prefill?.staffId ?? '',
      date: prefill?.date ?? '',
      time: prefill?.time ?? '',
    },
  })

  useEffect(() => {
    const fetchOptions = async () => {
      const [clientsRes, servicesRes, staffRes] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('services').select('id, name, duration_mins').order('name'),
        supabase.from('staff').select('id, name').order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (servicesRes.data) setServices(servicesRes.data)
      if (staffRes.data) setStaffList(staffRes.data)
      setLoadingOptions(false)
    }
    fetchOptions()
  }, [])

  const onSubmit = async (values: FormValues) => {
    setSaveError('')

    const service = services.find((s) => s.id === values.service_id)

    const startTime = new Date(`${values.date}T${values.time}`)
    const durationMs = (service?.duration_mins ?? 60) * 60 * 1000
    const endTime = new Date(startTime.getTime() + durationMs)

    const { error } = await supabase.from('appointments').insert({
      client_id: values.client_id,
      service_id: values.service_id,
      staff_id: values.staff_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: values.notes || null,
      status: 'confirmed',
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          style={{ backgroundColor: '#1E3A5F' }}
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
        >
          <h2 className="text-white font-semibold text-base">New Appointment</h2>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {loadingOptions ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading options...</p>
          ) : (
            <>
              {/* Client */}
              <div>
                <label className={labelClass}>Client</label>
                <select
                  {...register('client_id', { required: 'Please select a client' })}
                  className={inputClass}
                  defaultValue=""
                >
                  <option value="" disabled>Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.client_id && <p className={errorClass}>{errors.client_id.message}</p>}
              </div>

              {/* Service */}
              <div>
                <label className={labelClass}>Service</label>
                <select
                  {...register('service_id', { required: 'Please select a service' })}
                  className={inputClass}
                  defaultValue=""
                >
                  <option value="" disabled>Select service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.service_id && <p className={errorClass}>{errors.service_id.message}</p>}
              </div>

              {/* Staff */}
              <div>
                <label className={labelClass}>Staff</label>
                <select
                  {...register('staff_id', { required: 'Please select a staff member' })}
                  className={inputClass}
                  defaultValue=""
                >
                  <option value="" disabled>Select staff</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.staff_id && <p className={errorClass}>{errors.staff_id.message}</p>}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    {...register('date', { required: 'Date is required' })}
                    className={inputClass}
                  />
                  {errors.date && <p className={errorClass}>{errors.date.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input
                    type="time"
                    {...register('time', { required: 'Time is required' })}
                    className={inputClass}
                  />
                  {errors.time && <p className={errorClass}>{errors.time.message}</p>}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="Any special requests or notes..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {saveError}
                </p>
              )}

              {/* Actions */}
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
                  {isSubmitting ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

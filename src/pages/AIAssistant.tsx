import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Plus, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'


interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// ── Fetch relevant salon data based on keywords in the query ──────────────
async function fetchSalonContext(query: string): Promise<string> {
  const q = query.toLowerCase()
  const parts: string[] = []

  if (
    q.includes('staff') || q.includes('performance') ||
    q.includes('employee') || q.includes('stylist') || q.includes('who')
  ) {
    const { data } = await supabase
      .from('appointments')
      .select('status, staff(name), services(price)')
    if (data) {
      const byStaff: Record<string, { total: number; completed: number; revenue: number }> = {}
      for (const a of data as any[]) {
        const name = a.staff?.name ?? 'Unknown'
        if (!byStaff[name]) byStaff[name] = { total: 0, completed: 0, revenue: 0 }
        byStaff[name].total++
        if (a.status === 'completed') {
          byStaff[name].completed++
          byStaff[name].revenue += a.services?.price ?? 0
        }
      }
      const lines = Object.entries(byStaff)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([n, s]) =>
          `  ${n}: ${s.total} appointments, ${s.completed} completed, AED ${s.revenue.toFixed(2)} revenue`
        )
      parts.push(`STAFF PERFORMANCE:\n${lines.join('\n')}`)
    }
  }

  if (
    q.includes('client') || q.includes('customer') ||
    q.includes('top') || q.includes('loyal') || q.includes('best')
  ) {
    const { data } = await supabase
      .from('clients')
      .select('name, visit_count, total_spent')
      .order('total_spent', { ascending: false })
      .limit(20)
    if (data) {
      const lines = (data as any[]).map(c =>
        `  ${c.name}: ${c.visit_count ?? 0} visits, AED ${(c.total_spent ?? 0).toFixed(2)} total spent`
      )
      parts.push(`CLIENTS (sorted by spend):\n${lines.join('\n')}`)
    }
  }

  if (
    q.includes('appointment') || q.includes('booking') || q.includes('today') ||
    q.includes('schedule') || q.includes('upcoming') || q.includes('recent') ||
    q.includes('this week') || q.includes('yesterday')
  ) {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    const { data } = await supabase
      .from('appointments')
      .select('start_time, status, clients(name), services(name, price), staff(name)')
      .gte('start_time', from.toISOString())
      .order('start_time', { ascending: false })
      .limit(30)
    if (data) {
      const lines = (data as any[]).map(a =>
        `  ${a.start_time?.slice(0, 16).replace('T', ' ')}: ${a.clients?.name ?? '?'} — ${a.services?.name ?? '?'} with ${a.staff?.name ?? '?'} [${a.status}]`
      )
      parts.push(`APPOINTMENTS (last 7 days):\n${lines.join('\n')}`)
    }
  }

  if (
    q.includes('revenue') || q.includes('sales') || q.includes('income') ||
    q.includes('money') || q.includes('earn') || q.includes('paid') ||
    q.includes('profit') || q.includes('how much')
  ) {
    const { data } = await supabase
      .from('appointments')
      .select('status, start_time, services(price)')
      .eq('status', 'completed')
    if (data) {
      const total = (data as any[]).reduce((s, a) => s + (a.services?.price ?? 0), 0)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const monthRev = (data as any[])
        .filter(a => new Date(a.start_time) >= monthStart)
        .reduce((s, a) => s + (a.services?.price ?? 0), 0)
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const weekRev = (data as any[])
        .filter(a => new Date(a.start_time) >= weekStart)
        .reduce((s, a) => s + (a.services?.price ?? 0), 0)
      parts.push(
        `REVENUE:\n  All-time total: AED ${total.toFixed(2)}\n  This month: AED ${monthRev.toFixed(2)}\n  Last 7 days: AED ${weekRev.toFixed(2)}\n  Completed appointments counted: ${data.length}`
      )
    }
  }

  if (
    q.includes('service') || q.includes('treatment') ||
    q.includes('price list') || q.includes('menu') || q.includes('offer')
  ) {
    const { data } = await supabase
      .from('services')
      .select('name, duration_mins, price, category, is_active')
      .order('category')
      .order('name')
    if (data) {
      const lines = (data as any[]).map(s =>
        `  ${s.name} (${s.category ?? 'uncategorized'}): ${s.duration_mins ?? '?'} min, AED ${s.price?.toFixed(2) ?? '?'} [${s.is_active ? 'active' : 'inactive'}]`
      )
      parts.push(`SERVICES:\n${lines.join('\n')}`)
    }
  }

  if (q.includes('discount') || q.includes('promo') || q.includes('deal') || q.includes('special')) {
    const { data } = await supabase.from('offers').select('*')
    if (data) {
      const lines = (data as any[]).map(o =>
        `  ${o.title}: ${o.discount_type === 'percentage' ? `${o.discount_value}% off` : `AED ${o.discount_value} off`} — ${o.is_active ? 'ACTIVE' : 'inactive'}, valid until ${o.end_date ?? 'no expiry'}`
      )
      parts.push(`OFFERS & PROMOTIONS:\n${lines.join('\n') || '  None found'}`)
    }
  }

  // Default fallback — general overview
  if (parts.length === 0) {
    const [apptRes, clientRes, staffRes, serviceRes] = await Promise.all([
      supabase.from('appointments').select('id, status'),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('staff').select('name, role'),
      supabase.from('services').select('id', { count: 'exact', head: true }),
    ])
    const appts = apptRes.data ?? []
    const confirmed = appts.filter((a: any) => a.status === 'confirmed').length
    const completed = appts.filter((a: any) => a.status === 'completed').length
    const cancelled = appts.filter((a: any) => a.status === 'cancelled').length
    const staffList = (staffRes.data ?? []).map((s: any) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')
    parts.push(
      `SALON OVERVIEW — New Look Beauty Salon:\n  Total appointments: ${appts.length} (${confirmed} upcoming, ${completed} completed, ${cancelled} cancelled)\n  Total clients: ${clientRes.count ?? 0}\n  Total services: ${serviceRes.count ?? 0}\n  Staff team: ${staffList || 'none listed'}`
    )
  }

  return parts.join('\n\n')
}

// ── Call Claude via Supabase Edge Function proxy ─────────────────────────
async function callClaude(
  history: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('claude-proxy', {
    body: { messages: history.slice(-10), systemPrompt },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  return data?.text ?? 'Sorry, I could not generate a response.'
}

const WELCOME = "Hi! I'm your salon AI assistant. Ask me anything about your appointments, clients, staff performance, revenue, services, or promotions."

// ── Component ─────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const context = await fetchSalonContext(text)
      const systemPrompt = `You are a helpful AI assistant for New Look Beauty Salon. You have access to live salon data below to answer questions accurately and concisely. Be friendly, professional, and give specific data-driven answers. Format currency as AED. If asked something not in the data, say you don't have that information.\n\n${context}`
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const reply = await callClaude(history, systemPrompt)
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }
    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? `${prev} ${transcript}` : transcript))
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const newChat = () => {
    setMessages([{ id: '0', role: 'assistant', content: WELCOME }])
    setInput('')
  }

  return (
    // Negative margins cancel parent padding; height fills viewport minus top bar (~48px)
    <div className="-m-4 md:-m-8 flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 48px)' }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: '#2E86AB' }} />
          <h1 className="text-base font-bold" style={{ color: '#1E3A5F' }}>AI Assistant</h1>
          <span className="hidden sm:inline text-xs text-gray-400 ml-1">— powered by Claude</span>
        </div>
        <button
          onClick={newChat}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-5 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {/* AI avatar */}
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: '#1E3A5F' }}
              >
                <Sparkles size={13} color="white" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[78%] md:max-w-[62%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'rounded-tr-sm text-white'
                  : 'rounded-tl-sm bg-white text-gray-800 shadow-sm border border-gray-100'
              }`}
              style={msg.role === 'user' ? { backgroundColor: '#2E86AB' } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex items-start gap-2 justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <Sparkles size={13} color="white" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 md:px-8 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about clients, staff, revenue, appointments…"
            rows={1}
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent resize-none leading-relaxed"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />

          {/* Mic */}
          <button
            onClick={toggleListening}
            title={listening ? 'Stop listening' : 'Voice input'}
            className={`shrink-0 p-3 rounded-xl border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
              listening
                ? 'border-red-300 bg-red-50 text-red-500 animate-pulse'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            title="Send (Enter)"
            className="shrink-0 p-3 rounded-xl text-white transition-all min-h-[44px] min-w-[44px] flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2E86AB' }}
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line · Mic for voice
        </p>
      </div>
    </div>
  )
}

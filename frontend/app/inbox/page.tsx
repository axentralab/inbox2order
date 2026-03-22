'use client'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Conversation, Message, ExtractedData } from '@/types'
import { Send, Zap, CheckCheck, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import CreateOrderModal from '@/components/orders/CreateOrderModal'

export default function InboxPage() {
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [replyText, setReplyText] = useState('')
  const [convertTarget, setConvertTarget] = useState<{ prefill: any } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: convData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/api/messages/conversations').then(r => r.data),
    refetchInterval: 10_000,
  })

  const { data: msgData, isLoading: msgLoading } = useQuery({
    queryKey: ['messages', activeConv?.platform, activeConv?.sender_id],
    queryFn: () => api.get(`/api/messages/${activeConv!.platform}/${activeConv!.sender_id}`).then(r => r.data),
    enabled: !!activeConv,
    refetchInterval: 8_000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgData])

  const sendMsg = useMutation({
    mutationFn: () => api.post('/api/messages/send', {
      platform: activeConv?.platform,
      sender_id: activeConv?.sender_id,
      text: replyText
    }),
    onSuccess: () => {
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send'),
  })

  const conversations: Conversation[] = convData?.conversations || []
  const messages: Message[] = msgData?.messages || []

  // Get the latest extracted data from inbound messages
  const latestExtracted = messages
    .filter(m => m.direction === 'inbound' && m.extracted_data?.confidence && m.extracted_data.confidence > 20)
    .slice(-1)[0]?.extracted_data

  const handleConvertToOrder = () => {
    if (!latestExtracted && !activeConv) return
    setConvertTarget({
      prefill: {
        customer_name: latestExtracted?.name || activeConv?.sender_name || '',
        customer_phone: latestExtracted?.phone || activeConv?.sender_phone || '',
        customer_address: latestExtracted?.address || '',
        product_name: latestExtracted?.product || '',
        product_variant: [latestExtracted?.size, latestExtracted?.color].filter(Boolean).join(', '),
        quantity: latestExtracted?.quantity || 1,
        source: activeConv?.platform || 'facebook',
      }
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 106px)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

      {/* CHAT LIST */}
      <div style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>💬 Conversations</span>
          <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Live
          </span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {convLoading ? Array(5).fill(0).map((_, i) => (
            <div key={i} style={{ padding: 14 }}><div className="skeleton" style={{ height: 48 }} /></div>
          )) : conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              <MessageSquare size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p>No conversations yet</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Connect FB or WhatsApp in Settings</p>
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConv(conv)}
              style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, background: activeConv?.id === conv.id ? 'var(--surface2)' : 'transparent', transition: 'background 0.1s' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: conv.platform === 'facebook' ? 'linear-gradient(135deg,#1877f2,#4f6ef7)' : 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {(conv.sender_name || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.sender_name || conv.sender_phone || conv.sender_id}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0, marginLeft: 4 }}>
                    {format(new Date(conv.last_message_at), 'HH:mm')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.last_message}</span>
                  {conv.unread_count > 0 && (
                    <span style={{ background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, flexShrink: 0, marginLeft: 4 }}>{conv.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WINDOW */}
      {!activeConv ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 8 }}>
          <MessageSquare size={48} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: 14, fontWeight: 600 }}>Select a conversation</p>
          <p style={{ fontSize: 12 }}>Click any chat on the left to start</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: activeConv.platform === 'facebook' ? 'linear-gradient(135deg,#1877f2,#4f6ef7)' : 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
              {(activeConv.sender_name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{activeConv.sender_name || activeConv.sender_id}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 700, background: activeConv.platform === 'facebook' ? 'rgba(24,119,242,0.12)' : 'rgba(37,211,102,0.12)', color: activeConv.platform === 'facebook' ? '#60a5fa' : '#4ade80' }}>
                  {activeConv.platform === 'facebook' ? 'Facebook' : 'WhatsApp'}
                </span>
                {activeConv.sender_phone && <span style={{ marginLeft: 8, fontFamily: "'JetBrains Mono'", fontSize: 11 }}>{activeConv.sender_phone}</span>}
              </div>
            </div>
            <button onClick={handleConvertToOrder}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora' }}>
              <Zap size={13} /> Convert to Order
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12, width: i % 2 === 0 ? '55%' : '40%', alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end' }} />
                ))}
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.direction === 'inbound' ? 'flex-start' : 'flex-end' }}>
                <div style={{
                  maxWidth: '65%', padding: '10px 14px', borderRadius: msg.direction === 'inbound' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                  background: msg.direction === 'inbound' ? 'var(--surface)' : 'var(--accent)',
                  color: msg.direction === 'inbound' ? 'var(--text)' : 'white',
                  fontSize: 13, lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {format(new Date(msg.received_at), 'HH:mm')}
                  {msg.direction === 'outbound' && <CheckCheck size={11} color="var(--accent)" />}
                  {msg.converted_to_order && <span style={{ color: 'var(--green)', fontWeight: 600 }}>· Converted ✓</span>}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Extract Card */}
          {latestExtracted && latestExtracted.confidence && latestExtracted.confidence > 20 && (
            <div style={{ margin: '0 16px 12px', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 10, padding: 14, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                🤖 AI Detected Order Info
                <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(79,110,247,0.12)', padding: '2px 8px', borderRadius: 20 }}>{latestExtracted.confidence}% confidence</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                {latestExtracted.name && <ExtractRow label="👤 Name" value={latestExtracted.name} />}
                {latestExtracted.phone && <ExtractRow label="📞 Phone" value={latestExtracted.phone} mono />}
                {latestExtracted.address && <ExtractRow label="📍 Address" value={latestExtracted.address} span />}
                {latestExtracted.product && <ExtractRow label="📦 Product" value={latestExtracted.product} />}
                {latestExtracted.size && <ExtractRow label="📐 Size" value={latestExtracted.size} />}
                {latestExtracted.color && <ExtractRow label="🎨 Color" value={latestExtracted.color} />}
              </div>
              <button onClick={handleConvertToOrder}
                style={{ marginTop: 12, width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Zap size={14} /> Convert to Order →
              </button>
            </div>
          )}

          {/* Reply input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) sendMsg.mutate() } }}
              placeholder="Type a reply... (Enter to send)"
              rows={2}
              style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora', outline: 'none', resize: 'none' }}
            />
            <button onClick={() => replyText.trim() && sendMsg.mutate()}
              disabled={!replyText.trim() || sendMsg.isPending}
              style={{ width: 40, height: 40, background: replyText.trim() ? 'var(--accent)' : 'var(--surface3)', border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}>
              <Send size={16} color={replyText.trim() ? 'white' : 'var(--text3)'} />
            </button>
          </div>
        </div>
      )}

      {/* Convert to order modal */}
      {convertTarget && (
        <CreateOrderModal onClose={() => setConvertTarget(null)} prefill={convertTarget.prefill} />
      )}
    </div>
  )
}

function ExtractRow({ label, value, mono, span }: { label: string; value: string; mono?: boolean; span?: boolean }) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <span style={{ color: 'var(--text3)', fontSize: 11 }}>{label}: </span>
      <span style={{ fontWeight: 600, fontFamily: mono ? "'JetBrains Mono'" : 'Sora', color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

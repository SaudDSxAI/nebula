'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { COLORS } from '@/lib/theme';
import { Bot, ArrowLeft, Send, Sparkles } from 'lucide-react';

import { API_BASE_URL } from '@/lib/api/base';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ClientInfo {
    company_name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    company_description: string | null;
}

export default function AssistantPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => `ast_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/portal/${slug}`)
            .then(r => r.json())
            .then(data => {
                setClient(data);
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hi! I'm the AI Assistant for **${data.company_name}**. Ask me anything about the company — our services, culture, job openings, benefits, and more!`,
                    timestamp: new Date(),
                }]);
            })
            .catch(() => router.push('/'));
    }, [slug]);

    useEffect(() => {
        messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg: Message = {
            id: `u_${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/portal/${slug}/assistant/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMsg.content }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, {
                id: `a_${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date()
            }]);
        } catch {
            setMessages(prev => [...prev, {
                id: `e_${Date.now()}`, role: 'assistant',
                content: 'Sorry, I couldn\'t process your message. Please try again.',
                timestamp: new Date()
            }]);
        }
        setLoading(false);
        inputRef.current?.focus();
    };

    if (!client) return <LoadingSkeleton />;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.background, fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <header style={{
                background: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}`,
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <button
                    onClick={() => router.push(`/c/${slug}`)}
                    style={{
                        width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`,
                        background: COLORS.background, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary,
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{
                    width: 40, height: 40, borderRadius: 12, background: COLORS.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
                    boxShadow: `0 4px 12px ${COLORS.primary}40`,
                }}>
                    <Bot size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>{client.company_name} AI Assistant</h1>
                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>Ask anything about the company</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.success.text }} />
                    <span style={{ fontSize: 12, color: COLORS.success.text, fontWeight: 500 }}>Online</span>
                </div>
            </header>


            {/* Messages */}
            <div ref={messagesRef} style={{ flex: 1, overflow: 'auto', padding: '20px 16px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: 16, animation: 'fadeInUp 0.3s ease-out',
                        }}>
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10, background: COLORS.primary,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', marginRight: 10, flexShrink: 0, marginTop: 4,
                                }}><Bot size={16} /></div>
                            )}

                            <div style={{
                                maxWidth: '75%', padding: '12px 16px', borderRadius: 16,
                                background: msg.role === 'user' ? COLORS.primary : '#FFFFFF',
                                color: msg.role === 'user' ? '#FFFFFF' : COLORS.textPrimary,
                                fontSize: 14, lineHeight: 1.6,
                                boxShadow: msg.role === 'user'
                                    ? `0 4px 12px ${COLORS.primary}40`
                                    : '0 1px 4px rgba(0,0,0,0.06)',
                                border: msg.role === 'assistant' ? `1px solid ${COLORS.border}` : 'none',
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>

                                {renderMarkdown(msg.content)}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10, background: COLORS.primary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}><Bot size={16} /></div>
                            <div style={{
                                padding: '12px 20px', borderRadius: 16, borderTopLeftRadius: 4,
                                background: '#FFFFFF', border: `1px solid ${COLORS.border}`,
                            }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: 8, height: 8, borderRadius: '50%', background: COLORS.textMuted,
                                            animation: `bounce 1.4s ${i * 0.16}s infinite ease-in-out both`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Input */}
            <div style={{
                borderTop: `1px solid ${COLORS.border}`, background: '#FFFFFF', padding: '16px 20px',
            }}>
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10 }}>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder={`Ask about ${client.company_name}...`}
                        disabled={loading}
                        style={{
                            flex: 1, padding: '12px 16px', borderRadius: 14,
                            border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none',
                            transition: 'border-color 0.2s',
                            background: '#FFFFFF', color: COLORS.textPrimary,
                        }}
                        onFocus={e => (e.target.style.borderColor = COLORS.primary)}
                        onBlur={e => (e.target.style.borderColor = COLORS.border)}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        style={{
                            padding: '12px 20px', borderRadius: 14, border: 'none',
                            background: input.trim() ? COLORS.primary : COLORS.background,
                            color: input.trim() ? '#fff' : COLORS.textMuted,
                            fontWeight: 600, fontSize: 14, cursor: input.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        Send <Send size={16} />
                    </button>
                </div>


                {/* Suggestions */}
                {messages.length <= 1 && (
                    <div style={{ maxWidth: 720, margin: '12px auto 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['What does your company do?', 'Any current job openings?', 'What benefits do you offer?', 'Tell me about the culture'].map(q => (
                            <button
                                key={q}
                                onClick={() => { setInput(q); }}
                                style={{
                                    padding: '6px 14px', borderRadius: 99, border: `1px solid ${COLORS.primary}30`,
                                    background: `${COLORS.primary}08`, color: COLORS.primary, fontSize: 12, fontWeight: 500,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.background = `${COLORS.primary}15`; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.background = `${COLORS.primary}08`; }}
                            >
                                <Sparkles size={12} /> {q}
                            </button>
                        ))}
                    </div>
                )}

            </div>

            <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
}

function renderMarkdown(text: string) {
    // Very simple markdown bold handling
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background }}>
            <div style={{
                width: 40, height: 40, border: `3px solid ${COLORS.border}`, borderTop: `3px solid ${COLORS.primary}`,
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}


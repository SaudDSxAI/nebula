'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { COLORS } from '@/lib/theme';
import { FileText, ArrowLeft, Send, Upload, CheckCircle, AlertCircle, Paperclip, ClipboardList } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface MissingField {
    field: string;
    label: string;
    type: string;
    placeholder: string | null;
    options: string[] | null;
}

interface ClientInfo {
    company_name: string;
    slug: string;
    primary_color: string;
    secondary_color: string;
}

export default function CVEvaluatorPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [missingFields, setMissingFields] = useState<MissingField[]>([]);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [completed, setCompleted] = useState(false);
    const [candidateEmail, setCandidateEmail] = useState('');
    const [sessionId] = useState(() => `cv_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const messagesRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`${API}/api/portal/${slug}`)
            .then(r => r.json())
            .then(data => {
                setClient(data);
                setMessages([{
                    id: 'welcome', role: 'assistant',
                    content: `Welcome to the CV Evaluator for **${data.company_name}**!\n\nYou can either:\n• **Upload** your CV file (PDF, DOCX, TXT)\n• **Paste** your CV text below\n\nI'll analyze it and help you complete any missing information.`,
                    timestamp: new Date(),
                }]);
            })
            .catch(() => router.push('/'));
    }, [slug]);

    useEffect(() => {
        messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, missingFields]);

    const handleResponse = (data: any) => {
        setMessages(prev => [...prev, {
            id: `a_${Date.now()}`, role: 'assistant', content: data.response, timestamp: new Date()
        }]);

        if (data.missing_fields && data.missing_fields.length > 0) {
            setMissingFields(data.missing_fields);
            setFieldValues({});
        }

        if (data.status === 'complete') {
            setCompleted(true);
            setMissingFields([]);
            // Extract email so we can pre-fill the auth page
            const email = data.candidate_data?.email || data.candidate_data?.Email || '';
            if (email) setCandidateEmail(email);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const text = input.trim();
        setMessages(prev => [...prev, {
            id: `u_${Date.now()}`, role: 'user', content: text, timestamp: new Date()
        }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/portal/${slug}/cv/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: text }),
            });
            handleResponse(await res.json());
        } catch {
            setMessages(prev => [...prev, {
                id: `e_${Date.now()}`, role: 'assistant',
                content: 'Error processing your message. Please try again.',
                timestamp: new Date()
            }]);
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMessages(prev => [...prev, {
            id: `u_${Date.now()}`, role: 'user', content: `Uploaded: ${file.name}`, timestamp: new Date()
        }]);
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);

        try {
            const res = await fetch(`${API}/api/portal/${slug}/cv/upload`, {
                method: 'POST', body: formData,
            });
            handleResponse(await res.json());
        } catch {
            setMessages(prev => [...prev, {
                id: `e_${Date.now()}`, role: 'assistant',
                content: 'Error uploading file. Please try a different format.',
                timestamp: new Date()
            }]);
        }
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submitFields = async () => {
        // Validate required fields
        const filled = Object.values(fieldValues).filter(v => v.trim()).length;
        if (filled === 0) return;

        setMessages(prev => [...prev, {
            id: `u_${Date.now()}`, role: 'user',
            content: `Submitted ${filled} field${filled > 1 ? 's' : ''}`,
            timestamp: new Date()
        }]);
        setMissingFields([]);
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/portal/${slug}/cv/submit-fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, fields: fieldValues }),
            });
            handleResponse(await res.json());
        } catch {
            setMessages(prev => [...prev, {
                id: `e_${Date.now()}`, role: 'assistant',
                content: 'Error submitting fields. Please try again.',
                timestamp: new Date()
            }]);
        }
        setLoading(false);
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
                <button onClick={() => router.push(`/c/${slug}`)} style={{
                    width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`,
                    background: COLORS.background, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary,
                }}><ArrowLeft size={18} /></button>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: COLORS.secondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
                    boxShadow: `0 4px 12px ${COLORS.secondary}40`,
                }}><FileText size={24} /></div>
                <div>
                    <h1 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>CV Evaluator</h1>
                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: 0 }}>AI-powered CV analysis for {client.company_name}</p>
                </div>

                {/* Upload Button Always Visible */}
                {!completed && (
                    <label style={{
                        marginLeft: 'auto', padding: '8px 16px', borderRadius: 10,
                        background: `${COLORS.primary}10`, color: COLORS.primary, fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        border: `1px solid ${COLORS.primary}30`, transition: 'all 0.2s',
                    }}>
                        <Upload size={14} /> Upload CV
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                    </label>
                )}
            </header>


            {/* Messages Area */}
            <div ref={messagesRef} style={{ flex: 1, overflow: 'auto', padding: '20px 16px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: 16, animation: 'fadeInUp 0.3s ease-out',
                        }}>
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: COLORS.secondary,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', marginRight: 10, flexShrink: 0, marginTop: 4,
                                }}><FileText size={16} /></div>
                            )}

                            <div style={{
                                maxWidth: '75%', padding: '12px 16px', borderRadius: 16,
                                background: msg.role === 'user' ? COLORS.primary : '#FFFFFF',
                                color: msg.role === 'user' ? '#FFFFFF' : COLORS.textPrimary,
                                fontSize: 14, lineHeight: 1.6,
                                boxShadow: msg.role === 'user' ? `0 4px 12px ${COLORS.primary}40` : '0 1px 4px rgba(0,0,0,0.06)',
                                border: msg.role === 'assistant' ? `1px solid ${COLORS.border}` : 'none',
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>

                                {renderMarkdown(msg.content)}
                            </div>
                        </div>
                    ))}

                    {/* Loading Dots */}
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: COLORS.secondary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            }}><FileText size={16} /></div>
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


                    {/* ═══ DYNAMIC FORM FOR MISSING FIELDS ═══ */}
                    {missingFields.length > 0 && (
                        <div style={{
                            background: '#FFFFFF', borderRadius: 16, border: `2px solid ${COLORS.primary}20`,
                            padding: 24, marginBottom: 16, animation: 'fadeInUp 0.4s ease-out',
                            boxShadow: `0 4px 20px ${COLORS.primary}08`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, background: `${COLORS.primary}10`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary,
                                }}><FileText size={18} /></div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Complete Your Profile</h3>
                                    <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>Please fill in the missing information below</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                {missingFields.map(f => (
                                    <div key={f.field}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}>
                                            {f.label}
                                        </label>
                                        {f.type === 'select' && f.options ? (
                                            <select
                                                value={fieldValues[f.field] || ''}
                                                onChange={e => setFieldValues(prev => ({ ...prev, [f.field]: e.target.value }))}
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                                    border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none',
                                                    background: '#FFFFFF', color: COLORS.textPrimary, cursor: 'pointer',
                                                    transition: 'border-color 0.2s',
                                                }}
                                                onFocus={e => (e.target.style.borderColor = COLORS.primary)}
                                                onBlur={e => (e.target.style.borderColor = COLORS.border)}
                                            >
                                                <option value="">Select...</option>
                                                {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                                                value={fieldValues[f.field] || ''}
                                                onChange={e => setFieldValues(prev => ({ ...prev, [f.field]: e.target.value }))}
                                                placeholder={f.placeholder || ''}
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                                    border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none',
                                                    background: '#FFFFFF', color: COLORS.textPrimary,
                                                    transition: 'border-color 0.2s',
                                                }}
                                                onFocus={e => (e.target.style.borderColor = COLORS.primary)}
                                                onBlur={e => (e.target.style.borderColor = COLORS.border)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={submitFields}
                                disabled={Object.values(fieldValues).filter(v => v.trim()).length === 0}
                                style={{
                                    marginTop: 20, width: '100%', padding: '12px 24px', borderRadius: 12,
                                    border: 'none', background: COLORS.primary, color: '#fff',
                                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                    opacity: Object.values(fieldValues).filter(v => v.trim()).length === 0 ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                    boxShadow: `0 4px 16px ${COLORS.primary}30`,
                                }}
                            >
                                <><CheckCircle size={16} /> Submit Information</>
                            </button>
                        </div>
                    )}


                    {completed && (
                        <div style={{
                            background: COLORS.success.bg, borderRadius: 16,
                            border: `2px solid ${COLORS.success.bg}`, padding: 32, textAlign: 'center',
                            animation: 'fadeInUp 0.4s ease-out',
                        }}>
                            <div style={{ marginBottom: 12, color: COLORS.success.text }}><CheckCircle size={48} /></div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: COLORS.success.text, marginBottom: 8 }}>
                                CV Evaluation Complete!
                            </h3>
                            <p style={{ fontSize: 14, color: COLORS.success.text, marginBottom: 20 }}>
                                Your profile has been saved. Create an account or log in to track your application.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => {
                                        const params = candidateEmail ? `?email=${encodeURIComponent(candidateEmail)}&mode=signup` : '?mode=signup';
                                        router.push(`/c/${slug}/auth${params}`);
                                    }}
                                    style={{
                                        padding: '10px 24px', borderRadius: 10, border: 'none',
                                        background: COLORS.success.text, color: '#fff', fontWeight: 600, fontSize: 14,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    Create Account / Login
                                </button>
                                <button
                                    onClick={() => router.push(`/c/${slug}`)}
                                    style={{
                                        padding: '10px 24px', borderRadius: 10,
                                        border: `1px solid ${COLORS.success.text}`, background: 'transparent',
                                        color: COLORS.success.text, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                    }}
                                >
                                    Back to Portal
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Input Bar (only if not completed and no form showing) */}
            {!completed && missingFields.length === 0 && (
                <div style={{ borderTop: `1px solid ${COLORS.border}`, background: '#FFFFFF', padding: '16px 20px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10 }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Paste your CV text here..."
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
                            Analyze <Send size={16} />
                        </button>
                    </div>
                </div>
            )}


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
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
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


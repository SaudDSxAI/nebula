'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { COLORS } from '@/lib/theme';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ClientInfo {
    company_name: string;
    slug: string;
    primary_color: string;
    secondary_color: string;
    company_description: string | null;
    industry: string | null;
    headquarters: string | null;
}

export default function RegisterPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ message: string; status: string } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetch(`${API}/api/portal/${slug}`)
            .then(r => r.json())
            .then(setClient)
            .catch(() => router.push('/'));
    }, [slug]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Name is required';
        if (!form.email.trim()) errs.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/portal/${slug}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            setResult(data);
        } catch {
            setResult({ message: 'Something went wrong. Please try again.', status: 'error' });
        }
        setLoading(false);
    };

    if (!client) {
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

    if (result) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: COLORS.background,
                fontFamily: "'Inter', sans-serif", padding: 20,
            }}>
                <div style={{
                    background: '#FFFFFF', borderRadius: 24, padding: 48, textAlign: 'center',
                    maxWidth: 460, width: '100%',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    animation: 'fadeInUp 0.4s ease-out',
                    border: `1px solid ${COLORS.border}`,
                }}>
                    <div style={{ fontSize: 56, marginBottom: 16, color: result.status === 'created' ? COLORS.success.text : COLORS.warning.text }}>
                        {result.status === 'created' ? <CheckCircle size={56} /> : <AlertCircle size={56} />}
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12 }}>
                        {result.status === 'created' ? 'Registration Successful!' : result.status === 'exists' ? 'Welcome Back!' : 'Oops!'}
                    </h2>
                    <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.6, marginBottom: 28 }}>
                        {result.message}
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button
                            onClick={() => router.push(`/c/${slug}`)}
                            style={{
                                padding: '12px 24px', borderRadius: 12, border: 'none',
                                background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14,
                                cursor: 'pointer', boxShadow: `0 4px 16px ${COLORS.primary}30`,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Portal
                        </button>
                        {result.status === 'created' && (
                            <button
                                onClick={() => router.push(`/c/${slug}/cv-evaluator`)}
                                style={{
                                    padding: '12px 24px', borderRadius: 12,
                                    border: `2px solid ${COLORS.primary}30`, background: `${COLORS.primary}08`,
                                    color: COLORS.primary, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                Submit CV <CheckCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <style jsx global>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: COLORS.background,
            fontFamily: "'Inter', sans-serif", padding: 20,
        }}>
            <div style={{
                background: '#FFFFFF', borderRadius: 24, padding: '40px 36px', maxWidth: 480, width: '100%',
                boxShadow: '0 4px 32px rgba(0,0,0,0.06)', position: 'relative', zIndex: 1,
                animation: 'fadeInUp 0.4s ease-out', border: `1px solid ${COLORS.border}`,
            }}>
                {/* Back Button */}
                <button
                    onClick={() => router.push(`/c/${slug}`)}
                    style={{
                        position: 'absolute', top: 16, left: 16,
                        width: 36, height: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`,
                        background: COLORS.background, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary,
                    }}
                ><ArrowLeft size={18} /></button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16, background: COLORS.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, margin: '0 auto 16px', color: '#FFFFFF',
                        boxShadow: `0 8px 24px ${COLORS.primary}25`,
                    }}><UserPlus size={32} /></div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 8 }}>
                        Join {client.company_name}
                    </h1>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                        Register to get notified about career opportunities
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <FormField
                        label="Full Name" id="name" type="text" placeholder="John Doe"
                        value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))}
                        error={errors.name} color={COLORS.primary}
                    />
                    <FormField
                        label="Email Address" id="email" type="email" placeholder="john@example.com"
                        value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))}
                        error={errors.email} color={COLORS.primary}
                    />
                    <FormField
                        label="Phone Number" id="phone" type="tel" placeholder="+1 234 567 8900 (optional)"
                        value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))}
                        color={COLORS.primary}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px 24px', borderRadius: 14,
                            border: 'none', background: COLORS.primary, color: '#fff',
                            fontWeight: 700, fontSize: 16, cursor: loading ? 'wait' : 'pointer',
                            marginTop: 8, boxShadow: `0 4px 20px ${COLORS.primary}30`,
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {loading ? 'Registering...' : <>Register <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /></>}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 20, lineHeight: 1.5 }}>
                    By registering, you consent to {client.company_name} storing your information for recruitment purposes.
                </p>
            </div>


            <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

function FormField({
    label, id, type, placeholder, value, onChange, error, color
}: {
    label: string; id: string; type: string; placeholder: string;
    value: string; onChange: (v: string) => void; error?: string; color: string;
}) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label
                htmlFor={id}
                style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: 'block', marginBottom: 6 }}
            >
                {label}
            </label>
            <input
                id={id} type={type} placeholder={placeholder}
                value={value} onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    border: `2px solid ${error ? COLORS.warning.border : COLORS.border}`,
                    fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
                    background: '#FFFFFF', color: COLORS.textPrimary,
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = color; }}
                onBlur={e => { if (!error) e.target.style.borderColor = COLORS.border; }}
            />
            {error && <p style={{ fontSize: 12, color: COLORS.warning.text, marginTop: 4 }}>{error}</p>}
        </div>
    );
}


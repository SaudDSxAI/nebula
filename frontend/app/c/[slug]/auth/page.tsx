'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { API_BASE_URL } from '@/lib/api/base';

import { COLORS } from '@/lib/theme';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface ClientInfo {
    company_name: string;
}


export default function CandidateAuthPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [mode, setMode] = useState<'login' | 'signup'>(
        (searchParams.get('mode') as 'login' | 'signup') || 'signup'
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '', email: searchParams.get('email') || '', password: '', confirmPassword: '',
        phone: '', current_title: '', location: '',
    });

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/portal/${slug}`)
            .then(r => r.json())
            .then(setClient)
            .catch(() => router.push('/'));
    }, [slug]);

    // Removed auto-redirect to allow users to sign in with different accounts if needed
    // The portal page will still protect itself, but the auth page should be accessible.


    const validate = () => {
        if (mode === 'signup') {
            if (!form.name.trim()) return 'Name is required';
            if (!form.email.trim()) return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email';
            if (form.password.length < 6) return 'Password must be at least 6 characters';
            if (form.password !== form.confirmPassword) return 'Passwords do not match';
        } else {
            if (!form.email.trim()) return 'Email is required';
            if (!form.password) return 'Password is required';
        }
        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }

        setLoading(true);
        setError('');

        try {
            const endpoint = mode === 'signup'
                ? `${API_BASE_URL}/api/candidate/${slug}/signup`
                : `${API_BASE_URL}/api/candidate/${slug}/login`;

            const body = mode === 'signup'
                ? {
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    phone: form.phone.trim() || undefined,
                    current_title: form.current_title.trim() || undefined,
                    location: form.location.trim() || undefined,
                }
                : {
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    client_slug: slug,
                };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) {
                const detail = Array.isArray(data.detail)
                    ? data.detail.map((e: any) => e.msg || String(e)).join(', ')
                    : (data.detail || 'Something went wrong');
                setError(detail);
                return;
            }


            localStorage.setItem('candidate_token', data.access_token);
            localStorage.setItem('candidate_name', data.candidate.name);
            localStorage.setItem('candidate_slug', slug);
            router.push(`/c/${slug}/portal`);
        } catch (err: any) {
            setError(`Connection error: ${err?.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
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

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: COLORS.background,
            fontFamily: "'Inter', sans-serif", padding: 20,
        }}>
            {/* Background Pattern */}
            <div style={{
                position: 'fixed', inset: 0,
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(74, 107, 80, 0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(224, 168, 0, 0.05) 0%, transparent 50%)`,
                pointerEvents: 'none',
            }} />


            <div style={{
                background: '#FFFFFF', borderRadius: 24, padding: '40px 36px', maxWidth: 520, width: '100%',
                boxShadow: '0 8px 40px rgba(0,0,0,0.08)', position: 'relative', zIndex: 1,
                border: `1px solid ${COLORS.border}`,
                animation: 'fadeIn 0.4s ease-out',
            }}>
                {/* Back to portal */}
                <button
                    onClick={() => router.push(`/c/${slug}`)}
                    style={{
                        position: 'absolute', top: 16, left: 16, background: 'none',
                        border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '6px 12px',
                        fontSize: 13, cursor: 'pointer', color: COLORS.textSecondary,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}
                ><ArrowLeft size={14} /> Portal</button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: 16, background: COLORS.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, margin: '0 auto 14px', color: '#fff', fontWeight: 800,
                        boxShadow: '0 6px 24px rgba(74, 107, 80, 0.3)',
                    }}>
                        {client.company_name.charAt(0)}
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, marginBottom: 6 }}>
                        {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
                    </h1>

                    <p style={{ fontSize: 14, color: COLORS.textSecondary }}>
                        {mode === 'signup'
                            ? `Join ${client.company_name}'s talent network`
                            : `Log in to your ${client.company_name} portal`
                        }
                    </p>

                </div>

                {/* Mode Toggle */}
                <div style={{
                    display: 'flex', background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: 4, marginBottom: 24,
                }}>
                    {(['signup', 'login'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(''); }}
                            style={{
                                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                background: mode === m ? '#FFFFFF' : 'transparent',
                                color: mode === m ? COLORS.primary : COLORS.textSecondary,
                                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {m === 'signup' ? 'Sign Up' : 'Log In'}
                        </button>
                    ))}
                </div>


                {/* Error */}
                {error && (
                    <div style={{
                        padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                        background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}`,
                        color: COLORS.warning.text, fontSize: 13, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}


                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {mode === 'signup' && (
                        <InputField label="Full Name" placeholder="John Doe" required
                            value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))}
                        />
                    )}

                    <InputField label="Email" type="email" placeholder="john@example.com" required
                        value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))}
                    />

                    <InputField label="Password" type="password" placeholder="••••••••" required
                        value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))}
                    />

                    {mode === 'signup' && (
                        <>
                            <InputField label="Confirm Password" type="password" placeholder="••••••••" required
                                value={form.confirmPassword} onChange={v => setForm(p => ({ ...p, confirmPassword: v }))}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <InputField label="Phone" placeholder="+1 234 567 8900"
                                    value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))}
                                />
                                <InputField label="Current Title" placeholder="Software Engineer"
                                    value={form.current_title} onChange={v => setForm(p => ({ ...p, current_title: v }))}
                                />
                            </div>

                            <InputField label="Location" placeholder="Dubai, UAE"
                                value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))}
                            />
                        </>
                    )}


                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px 24px', borderRadius: 14,
                            border: 'none', background: COLORS.primary, color: '#fff',
                            fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer',
                            marginTop: 8, boxShadow: '0 4px 20px rgba(74, 107, 80, 0.3)',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {loading
                            ? 'Please wait...'
                            : mode === 'signup' ? 'Create Account' : 'Log In'
                        }
                    </button>

                </form>

                <p style={{ textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 16, lineHeight: 1.5 }}>
                    {mode === 'signup'
                        ? `By signing up, you consent to ${client.company_name} storing your information for recruitment purposes.`
                        : 'Forgot your password? Contact the recruitment team.'
                    }
                </p>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

function InputField({
    label, type = 'text', placeholder, value, onChange, required
}: {
    label: string; type?: string; placeholder: string;
    value: string; onChange: (v: string) => void; required?: boolean;
}) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: 'block', marginBottom: 5 }}>
                {label} {required && <span style={{ color: COLORS.accent }}>*</span>}
            </label>
            <input
                type={type} placeholder={placeholder} value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10,
                    border: `1px solid ${COLORS.border}`, fontSize: 14, outline: 'none',
                    transition: 'border-color 0.2s',
                    background: '#FFFFFF',
                    color: COLORS.textPrimary,
                    boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = COLORS.primary}
                onBlur={e => e.target.style.borderColor = COLORS.border}
            />
        </div>
    );
}


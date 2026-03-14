'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientSignup } from '@/lib/api/clientPortal';
import { Zap, Mail, Globe, Lock, Eye, EyeOff, CalendarDays, CheckCircle2 } from 'lucide-react';

const PRIMARY = '#4A6B50';
const PRIMARY_D = '#3A5540';
const BG = '#F5F7F5';
const SURFACE = '#FFFFFF';
const TEXT = '#1A241C';
const MUTED = '#526655';
const MUTED_L = '#526655';
const BORDER = 'rgba(74,107,80,0.2)';
const ERROR = '#D64545';
const FONT = "'Nunito', 'Inter', sans-serif";
const HEAD_FONT = "'Varela Round', sans-serif";

const TRIAL_PERKS = [
    'Full access — no restrictions',
    'AI candidate matching & CV parsing',
    'Branded candidate portal',
    'No credit card required',
];

export default function ClientSignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        company_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        website: '',
    });
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
        if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true);
        try {
            const response = await clientSignup({
                company_name: form.company_name,
                email: form.email,
                password: form.password,
                plan: 'trial',
                website: form.website || undefined,
            });
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            localStorage.setItem('client_user', JSON.stringify(response.client));
            router.push('/client/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inp: React.CSSProperties = {
        width: '100%', padding: '9px 12px',
        border: `1.5px solid ${BORDER}`, borderRadius: 8,
        fontSize: 13, fontFamily: FONT, color: TEXT,
        background: '#F8FAF8',
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
    };
    const inpIcon: React.CSSProperties = { ...inp, paddingLeft: 36 };
    const lbl: React.CSSProperties = {
        fontSize: 11, fontWeight: 700, color: MUTED,
        display: 'block', marginBottom: 4,
        textTransform: 'uppercase', letterSpacing: '0.4px',
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto" style={{
            background: BG, fontFamily: FONT,
        }}>
            {/* Global styles — using suppressHydrationWarning to avoid re-render flickers */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito:wght@400;500;600;700;800&display=swap');
                input:focus { border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(74,107,80,0.12) !important; }
                .btn-signup:hover:not(:disabled) { background: ${PRIMARY_D} !important; transform: translateY(-1px); }
                .book-btn:hover { background: rgba(74,107,80,0.06) !important; border-color: ${PRIMARY} !important; color: ${PRIMARY} !important; }
            `}</style>

            <div className="w-full max-w-[820px] flex flex-col md:flex-row gap-6 items-stretch py-8">

                {/* ── Left: Trial info panel ── */}
                <div className="md:w-[260px] shrink-0 p-6 md:p-7 flex flex-col justify-center rounded-[18px]" style={{
                    background: `rgba(74,107,80,0.06)`,
                    border: `1.5px solid ${BORDER}`,
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_D})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(74,107,80,0.3)',
                        }}>
                            <Zap size={18} color="#fff" fill="#fff" />
                        </div>
                        <span style={{ fontFamily: HEAD_FONT, fontSize: 18, fontWeight: 700, color: TEXT }}>Nebula</span>
                    </div>

                    <div style={{ fontFamily: HEAD_FONT, fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                        14-Day Free Trial
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.5 }}>
                        Full access to everything — no credit card needed.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                        {TRIAL_PERKS.map((perk, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={14} color={PRIMARY} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: MUTED }}>{perk}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        borderTop: `1px solid ${BORDER}`, paddingTop: 16,
                        fontSize: 12, color: MUTED_L, lineHeight: 1.6,
                    }}>
                        After 14 days, your account will be paused until you subscribe.
                    </div>
                </div>

                {/* ── Right: Form card ── */}
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center rounded-[18px]" style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    boxShadow: '0 4px 32px rgba(74,107,80,0.08)',
                }}>
                    <h1 style={{ fontFamily: HEAD_FONT, fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>
                        Create your account
                    </h1>
                    <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>
                        Get started in under 2 minutes.
                    </p>

                    {error && (
                        <div style={{
                            background: 'rgba(214,69,69,0.07)', border: '1px solid rgba(214,69,69,0.2)',
                            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: ERROR, marginBottom: 14,
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Company + Email row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label style={lbl}>Company Name</label>
                                <input
                                    type="text" required placeholder="Acme Corp"
                                    value={form.company_name}
                                    onChange={e => set('company_name', e.target.value)}
                                    style={inp}
                                />
                            </div>
                            <div>
                                <label style={lbl}>Work Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                                    <input
                                        type="email" required placeholder="you@company.com"
                                        value={form.email}
                                        onChange={e => set('email', e.target.value)}
                                        style={inpIcon}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Website */}
                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>Website <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                            <div style={{ position: 'relative' }}>
                                <Globe size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                                <input
                                    type="url" placeholder="https://company.com"
                                    value={form.website}
                                    onChange={e => set('website', e.target.value)}
                                    style={inpIcon}
                                />
                            </div>
                        </div>

                        {/* Password row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-[18px]">
                            <div>
                                <label style={lbl}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                                    <input
                                        type={showPw ? 'text' : 'password'} required placeholder="Min 8 chars"
                                        value={form.password}
                                        onChange={e => set('password', e.target.value)}
                                        style={{ ...inpIcon, paddingRight: 34 }}
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED_L, padding: 2 }}>
                                        {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={lbl}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                                    <input
                                        type={showConfirm ? 'text' : 'password'} required placeholder="Repeat"
                                        value={form.confirmPassword}
                                        onChange={e => set('confirmPassword', e.target.value)}
                                        style={{ ...inpIcon, paddingRight: 34 }}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED_L, padding: 2 }}>
                                        {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="btn-signup" style={{
                            width: '100%', padding: '11px',
                            background: loading ? MUTED_L : PRIMARY,
                            border: 'none', borderRadius: 10, color: '#fff',
                            fontFamily: FONT, fontSize: 14, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: `0 4px 14px rgba(74,107,80,0.25)`,
                            marginBottom: 10,
                        }}>
                            {loading ? 'Creating account…' : 'Start Free Trial'}
                        </button>

                        {/* Book a call */}
                        <a
                            href="https://cal.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="book-btn"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                width: '100%', padding: '10px',
                                border: `1.5px solid ${BORDER}`, borderRadius: 10,
                                fontSize: 13, fontWeight: 600, color: MUTED,
                                background: 'transparent', textDecoration: 'none',
                                transition: 'all 0.2s', cursor: 'pointer',
                                boxSizing: 'border-box', fontFamily: FONT,
                            }}
                        >
                            <CalendarDays size={14} />
                            Prefer to talk first? Book a call
                        </a>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: MUTED }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: PRIMARY, fontWeight: 700, textDecoration: 'none' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

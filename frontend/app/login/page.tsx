'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { Zap, Mail, Lock, Eye, EyeOff, CalendarDays } from 'lucide-react';

const PRIMARY = '#4A6B50';
const PRIMARY_D = '#3A5540';
const BG = '#F5F7F5';
const SURFACE = '#FFFFFF';
const TEXT = '#1A241C';
const MUTED = '#526655';
const MUTED_L = '#9ab09e';
const BORDER = 'rgba(74,107,80,0.2)';
const ERROR = '#D64545';
const GOLD = '#E0A800';
const FONT = "'Nunito', 'Inter', sans-serif";
const HEAD_FONT = "'Varela Round', sans-serif";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Try client login
            try {
                const res = await apiClient.post('/api/client/auth/login', { email, password });
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('refresh_token', res.data.refresh_token);
                localStorage.setItem('client_user', JSON.stringify(res.data.client));
                router.push('/client/dashboard');
                return;
            } catch (clientErr: any) {
                const status = clientErr?.response?.status;
                if (status && status !== 401 && status !== 403 && status !== 404 && status !== 422) throw clientErr;
            }

            // 2. Try super admin login
            try {
                const res = await apiClient.post('/api/admin/auth/login', { email, password });
                const userData = res.data.user;
                localStorage.setItem('admin_token', res.data.access_token);
                localStorage.setItem('admin_user', JSON.stringify(userData));
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('refresh_token', res.data.refresh_token || '');
                localStorage.setItem('user', JSON.stringify(userData));
                window.location.href = '/admin/dashboard';
                return;
            } catch {
                setError('Invalid email or password. Please try again.');
            }
        } catch {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inp: React.CSSProperties = {
        width: '100%', padding: '12px 14px 12px 42px',
        border: `1.5px solid ${BORDER}`, borderRadius: 10,
        fontSize: 14, fontFamily: FONT, color: TEXT,
        background: '#F8FAF8',
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: BG, fontFamily: FONT, padding: 24,
        }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito:wght@400;500;600;700;800&display=swap');
                input:focus { border-color: ${PRIMARY} !important; box-shadow: 0 0 0 3px rgba(74,107,80,0.12) !important; }
                .btn-login:hover:not(:disabled) { background: ${PRIMARY_D} !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,107,80,0.35) !important; }
                .book-btn:hover { background: rgba(74,107,80,0.06) !important; border-color: ${PRIMARY} !important; color: ${PRIMARY} !important; }
                .signup-link:hover { text-decoration: underline !important; }
            ` }} />

            {/* Card */}
            <div style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 20,
                padding: '44px 40px',
                width: '100%', maxWidth: 420,
                boxShadow: '0 4px 32px rgba(74,107,80,0.1)',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_D})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(74,107,80,0.3)',
                    }}>
                        <Zap size={20} color="#fff" fill="#fff" />
                    </div>
                    <span style={{ fontFamily: HEAD_FONT, fontSize: 20, fontWeight: 700, color: TEXT }}>Nebula</span>
                </div>

                <h1 style={{ fontFamily: HEAD_FONT, fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>
                    Welcome back
                </h1>
                <p style={{ fontSize: 14, color: MUTED, margin: '0 0 28px' }}>
                    Sign in to your account to continue.
                </p>

                <form onSubmit={handleLogin}>
                    {/* Email */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Email address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                            <input
                                type="email" required autoComplete="email"
                                placeholder="you@company.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                                style={inp}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED_L }} />
                            <input
                                type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                                style={{ ...inp, paddingRight: 44 }}
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{
                                position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: MUTED_L, padding: 2,
                            }}>
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginBottom: 18, padding: '10px 14px',
                            background: 'rgba(214,69,69,0.07)', border: '1px solid rgba(214,69,69,0.2)',
                            borderRadius: 8, fontSize: 13, color: ERROR,
                        }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-login" style={{
                        width: '100%', padding: '13px',
                        background: loading ? MUTED_L : PRIMARY,
                        border: 'none', borderRadius: 10, color: '#fff',
                        fontFamily: FONT, fontSize: 15, fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: `0 4px 16px rgba(74,107,80,0.25)`,
                    }}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                    <span style={{ fontSize: 12, color: MUTED_L }}>or</span>
                    <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>

                {/* Sign up CTA */}
                <p style={{ textAlign: 'center', fontSize: 14, color: MUTED, margin: '0 0 12px' }}>
                    Don't have an account?{' '}
                    <Link href="/client/signup" className="signup-link" style={{ color: PRIMARY, fontWeight: 700, textDecoration: 'none' }}>
                        Start your free 14-day trial →
                    </Link>
                </p>

                {/* Book a call */}
                <a
                    href="https://cal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="book-btn"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        width: '100%', padding: '11px',
                        border: `1.5px solid ${BORDER}`, borderRadius: 10,
                        fontSize: 14, fontWeight: 600, color: MUTED,
                        background: 'transparent', textDecoration: 'none',
                        transition: 'all 0.2s', cursor: 'pointer',
                        boxSizing: 'border-box', fontFamily: FONT,
                    }}
                >
                    <CalendarDays size={16} />
                    Book a call with us
                </a>
            </div>

            {/* Footer */}
            <p style={{ marginTop: 24, fontSize: 12, color: MUTED_L, textAlign: 'center', fontFamily: FONT }}>
                © {new Date().getFullYear()} Nebula. All rights reserved.
            </p>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { Zap, Mail, Lock, Eye, EyeOff, CalendarDays } from 'lucide-react';

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 sm:p-6 md:p-8 font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito:wght@400;500;600;700;800&display=swap');
                .font-heading { font-family: 'Varela Round', sans-serif; }
                `
            }} />

            {/* Card */}
            <div className="w-full max-w-sm sm:max-w-[420px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl md:rounded-[24px] p-5 sm:p-8 md:p-10 shadow-[0_4px_32px_rgba(74,107,80,0.1)] transition-all">
                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-[0_4px_12px_rgba(74,107,80,0.3)]">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="font-heading text-xl font-bold text-[var(--color-text-primary)]">Nebula</span>
                </div>

                <h1 className="font-heading text-2xl font-bold text-[var(--color-text-primary)] mb-1.5">
                    Welcome back
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mb-7">
                    Sign in to your account to continue.
                </p>

                <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                    {/* Email */}
                    <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                            Email address
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                type="email" required autoComplete="email"
                                placeholder="you@company.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full py-3 pl-10 pr-3.5 bg-[var(--color-input-bg)] border-[1.5px] border-[var(--color-input-border)] rounded-lg text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-alpha)]"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full py-3 pl-10 pr-11 bg-[var(--color-input-bg)] border-[1.5px] border-[var(--color-input-border)] rounded-lg text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--color-primary-alpha)]"
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="px-3.5 py-3 bg-[var(--color-info-bg)] border border-[var(--color-info-border)] rounded-lg text-sm text-[var(--color-info-text)]">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white transition-all shadow-[0_4px_16px_rgba(74,107,80,0.25)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(74,107,80,0.35)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none bg-primary hover:bg-primary-hover">
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <span className="text-[11px] uppercase tracking-widest text-[var(--color-text-muted)] mt-0.5">or</span>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>

                {/* Sign up CTA */}
                <p className="text-center text-sm text-[var(--color-text-muted)] mb-4">
                    Don't have an account?{' '}
                    <Link href="/client/signup" className="text-primary font-bold hover:underline">
                        Start your free trial →
                    </Link>
                </p>

                {/* Book a call hover effects using tailwind group or standard hover */}
                <a
                    href="https://cal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 border-[1.5px] border-[var(--color-border)] rounded-xl text-[13px] font-semibold text-[var(--color-text-secondary)] bg-transparent hover:bg-[var(--color-primary-alpha)] hover:border-primary hover:text-primary transition-all duration-200"
                >
                    <CalendarDays size={16} />
                    Book a call with us
                </a>
            </div>

            {/* Footer */}
            <p className="mt-8 text-[11px] sm:text-xs text-[var(--color-text-muted)] text-center tracking-wide">
                © {new Date().getFullYear()} Nebula. All rights reserved.
            </p>
        </div>
    );
}

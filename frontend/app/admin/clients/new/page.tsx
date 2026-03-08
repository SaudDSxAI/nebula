'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import * as adminApi from '@/lib/api/admin';

export default function AddClientPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        company_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        website: '',
        phone: '',
        plan: 'free',
    });

    const update = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!form.company_name.trim()) return setError('Company name is required');
        if (!form.email.trim()) return setError('Email is required');
        if (!form.password) return setError('Password is required');
        if (form.password.length < 8) return setError('Password must be at least 8 characters');
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');

        setSaving(true);
        try {
            await adminApi.createClient({
                company_name: form.company_name.trim(),
                email: form.email.trim(),
                password: form.password,
                website: form.website.trim() || undefined,
                phone: form.phone.trim() || undefined,
                plan: form.plan,
            });
            router.push('/admin/clients');
        } catch (err: any) {
            const msg = err?.response?.data?.detail || 'Failed to create client. Please try again.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setSaving(false);
        }
    }

    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
        backgroundColor: '#fff', color: '#111827',
        transition: 'border-color 0.15s',
    };

    return (
        <AdminLayout>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'none', border: 'none', color: 'var(--color-primary)',
                            fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 8,
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        ← Back to Clients
                    </button>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Add New Client</h1>
                    <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>Create a new client account on the platform</p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 8, marginBottom: 20,
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                        fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Company Info */}
                    <div style={{
                        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                        padding: 28, marginBottom: 20,
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
                            Company Information
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Company Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.company_name}
                                    onChange={e => update('company_name', e.target.value)}
                                    placeholder="e.g. Acme Recruiting"
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        value={form.website}
                                        onChange={e => update('website', e.target.value)}
                                        placeholder="https://example.com"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => update('phone', e.target.value)}
                                        placeholder="+1 (555) 000-0000"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Details */}
                    <div style={{
                        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                        padding: 28, marginBottom: 20,
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
                            Account Credentials
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                    Email <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => update('email', e.target.value)}
                                    placeholder="admin@company.com"
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                        Password <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => update('password', e.target.value)}
                                        placeholder="Min 8 characters"
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                                        Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={e => update('confirmPassword', e.target.value)}
                                        placeholder="Re-enter password"
                                        style={inputStyle}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Plan */}
                    <div style={{
                        background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                        padding: 28, marginBottom: 28,
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
                            Subscription Plan
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            {[
                                { id: 'free', label: 'Free', desc: 'Basic features', icon: '🆓' },
                                { id: 'professional', label: 'Professional', desc: 'Advanced tools', icon: '⭐' },
                                { id: 'enterprise', label: 'Enterprise', desc: 'Full platform', icon: '🏆' },
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => update('plan', p.id)}
                                    style={{
                                        padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                                        border: form.plan === p.id ? '2px solid var(--color-primary)' : '1px solid #e5e7eb',
                                        background: form.plan === p.id ? 'var(--color-primary-alpha)' : '#fff',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{p.label}</div>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={{
                                padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db',
                                background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '10px 28px', borderRadius: 8, border: 'none',
                                background: saving ? '#9ca3af' : 'var(--color-primary)', color: '#fff',
                                fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}
                        >
                            {saving ? 'Creating...' : '+ Create Client'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

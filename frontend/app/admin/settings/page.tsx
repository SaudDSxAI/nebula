'use client';

import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/lib/auth/context';
import { User, Lock, Settings, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/lib/api/client';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: <User size={15} /> },
        { id: 'security', label: 'Security', icon: <Lock size={15} /> },
        { id: 'platform', label: 'Platform', icon: <Settings size={15} /> },
    ];

    const card: React.CSSProperties = { background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 32 };

    return (
        <AdminLayout>
            <div>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Settings</h1>
                    <p style={{ fontSize: 15, color: 'var(--color-text-muted)', marginTop: 4 }}>Manage your account and platform settings</p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid var(--color-border)' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '12px 20px', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 500,
                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'transparent'}`,
                            marginBottom: -1, transition: 'all 0.15s',
                        }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div style={{ ...card, maxWidth: 600 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>Profile Information</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <Field label="Name" value={user?.name || 'Admin'} readOnly />
                            <Field label="Email" value={user?.email || 'admin@trmplatform.com'} readOnly />
                            <Field label="Role" value={user?.role || 'super_admin'} readOnly />
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, padding: '12px 14px', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                                Profile information is managed by the system. Contact a developer to update these details.
                            </p>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
                        <ChangePasswordCard />
                        <div style={card}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Two-Factor Authentication</h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>Add an extra layer of security to your account</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>2FA Status</div>
                                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Currently disabled</div>
                                </div>
                                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>Coming Soon</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Platform Tab */}
                {activeTab === 'platform' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
                        <div style={card}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Platform Configuration</h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>General platform settings</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <ToggleSetting label="AI Features" desc="Enable AI-powered candidate matching and CV parsing" defaultOn />
                                <ToggleSetting label="Email Notifications" desc="Send email alerts for signups and critical events" defaultOn />
                                <ToggleSetting label="Public Job Board" desc="Allow public access to the job board" defaultOn />
                                <ToggleSetting label="Client Self-Signup" desc="Allow new clients to create accounts" defaultOn />
                            </div>
                        </div>

                        <div style={card}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>API Configuration</h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Manage API keys and integrations</p>
                            <div style={{ padding: '14px 20px', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-primary)' }}>
                                API Base URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

// ─── Change Password Card (functional) ────────────────────────────────────────

function ChangePasswordCard() {
    const [form, setForm] = useState({ current: '', newPwd: '', confirm: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const upd = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setResult(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.current) return setResult({ type: 'error', msg: 'Current password is required' });
        if (!form.newPwd) return setResult({ type: 'error', msg: 'New password is required' });
        if (form.newPwd.length < 8) return setResult({ type: 'error', msg: 'New password must be at least 8 characters' });
        if (form.newPwd !== form.confirm) return setResult({ type: 'error', msg: 'Passwords do not match' });
        setSaving(true);
        try {
            await apiClient.post('/api/admin/auth/change-password', { current_password: form.current, new_password: form.newPwd });
            setResult({ type: 'success', msg: 'Password changed successfully' });
            setForm({ current: '', newPwd: '', confirm: '' });
        } catch (e: any) {
            setResult({ type: 'error', msg: e?.response?.data?.detail || 'Failed to change password' });
        } finally { setSaving(false); }
    };

    const card: React.CSSProperties = { background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 32 };
    const inp: React.CSSProperties = { width: '100%', padding: '10px 40px 10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', background: 'var(--color-background)', color: 'var(--color-text-primary)', boxSizing: 'border-box', fontFamily: 'inherit' };
    const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 };

    return (
        <div style={card}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Change Password</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>Update your password to keep your account secure</p>

            {result && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, background: result.type === 'success' ? '#dcfce7' : '#fef2f2', color: result.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${result.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
                    {result.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                    {result.msg}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label style={lbl}>Current Password</label>
                    <div style={{ position: 'relative' }}>
                        <input type={showPwd ? 'text' : 'password'} value={form.current} onChange={e => upd('current', e.target.value)} placeholder="Enter current password" style={inp} />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </div>
                <div>
                    <label style={lbl}>New Password</label>
                    <div style={{ position: 'relative' }}>
                        <input type={showPwd ? 'text' : 'password'} value={form.newPwd} onChange={e => upd('newPwd', e.target.value)} placeholder="Min 8 characters" style={inp} />
                    </div>
                </div>
                <div>
                    <label style={lbl}>Confirm New Password</label>
                    <input type={showPwd ? 'text' : 'password'} value={form.confirm} onChange={e => upd('confirm', e.target.value)} placeholder="Re-enter new password" style={{ ...inp, paddingRight: 14 }} />
                </div>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Updating...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, value, readOnly, type, placeholder }: { label: string; value?: string; readOnly?: boolean; type?: string; placeholder?: string }) {
    return (
        <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
            <input type={type || 'text'} defaultValue={value} readOnly={readOnly} placeholder={placeholder}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', background: readOnly ? 'var(--color-background)' : 'var(--color-card)', color: readOnly ? 'var(--color-text-muted)' : 'var(--color-text-primary)', cursor: readOnly ? 'not-allowed' : 'text', boxSizing: 'border-box' as const }} />
        </div>
    );
}

function ToggleSetting({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn ?? false);
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{desc}</div>
            </div>
            <button onClick={() => setOn(!on)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: on ? 'var(--color-primary)' : 'var(--color-border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: on ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
        </div>
    );
}

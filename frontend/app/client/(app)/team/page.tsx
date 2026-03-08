'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getTeamMembers,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resetTeamMemberPassword,
    getMemberWorkload,
} from '@/lib/api/clientPortal';
import {
    Shield, User, Eye, Edit2, Key, Trash2, Briefcase, X, Check,
    UserPlus, Users, Crown, ChevronDown, Activity,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────
type Role = 'admin' | 'member' | 'viewer';
interface Member {
    id: number; name: string; email: string; role: Role;
    is_active: boolean; is_owner?: boolean;
    created_at: string | null; last_login: string | null;
}

// ─── Role Config ────────────────────────────────────────────────────
const ROLE: Record<Role, { Icon: React.ElementType; label: string; accent: string; bg: string }> = {
    admin: { Icon: Shield, label: 'Admin', accent: '#946D43', bg: 'rgba(148,109,67,0.12)' },
    member: { Icon: User, label: 'Member', accent: '#4a7a14', bg: 'rgba(107,142,35,0.12)' },
    viewer: { Icon: Eye, label: 'Viewer', accent: '#724A24', bg: 'rgba(114,74,36,0.10)' },
};

// ─── Toast ──────────────────────────────────────────────────────────
interface Toast { id: number; type: 'success' | 'error'; message: string; }

const PRIMARY = 'var(--color-primary)';

export default function TeamPage() {
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Modals
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [pwdOpen, setPwdOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [workloadOpen, setWorkloadOpen] = useState(false);

    const [sel, setSel] = useState<Member | null>(null);
    const [workload, setWorkload] = useState<any[]>([]);

    // Create form
    const [cForm, setCForm] = useState({ name: '', email: '', password: '', role: 'member' as Role });
    const [cBusy, setCBusy] = useState(false);

    // Edit form
    const [eForm, setEForm] = useState({ name: '', role: 'member' as Role, is_active: true });
    const [eBusy, setEBusy] = useState(false);

    // Password form
    const [pForm, setPForm] = useState({ password: '', confirm: '' });
    const [pBusy, setPBusy] = useState(false);

    // Delete
    const [dBusy, setDBusy] = useState(false);

    // ── Helpers ────────────────────────────────────────────────────
    const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
    }, []);

    const load = useCallback(async () => {
        try {
            const d = await getTeamMembers();
            setMembers(d.team_members || []);
        } catch { toast('Failed to load team members', 'error'); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setCreateOpen(false); setEditOpen(false);
                setPwdOpen(false); setDeleteOpen(false); setWorkloadOpen(false);
            }
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, []);

    // ── Stats ──────────────────────────────────────────────────────
    const stats = {
        total: members.length,
        admins: members.filter(m => m.role === 'admin').length,
        members: members.filter(m => m.role === 'member').length,
        viewers: members.filter(m => m.role === 'viewer').length,
        active: members.filter(m => m.is_active).length,
    };

    // ── Actions ────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cForm.name.trim() || !cForm.email.trim() || !cForm.password.trim()) { toast('All fields are required', 'error'); return; }
        if (cForm.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
        setCBusy(true);
        try {
            await createTeamMember({ name: cForm.name, email: cForm.email, password: cForm.password, role: cForm.role });
            toast(`User ${cForm.email} created successfully`);
            setCreateOpen(false);
            setCForm({ name: '', email: '', password: '', role: 'member' });
            await load();
        } catch (err: any) {
            toast(err?.response?.data?.detail || 'Failed to create user', 'error');
        } finally { setCBusy(false); }
    };

    const openEdit = (m: Member) => { setSel(m); setEForm({ name: m.name || '', role: m.role, is_active: m.is_active }); setEditOpen(true); };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sel) return;
        setEBusy(true);
        try {
            await updateTeamMember(sel.id, { name: eForm.name, role: eForm.role, is_active: eForm.is_active });
            toast('User updated successfully');
            setEditOpen(false);
            await load();
        } catch (err: any) {
            toast(err?.response?.data?.detail || 'Update failed', 'error');
        } finally { setEBusy(false); }
    };

    const openPwd = (m: Member) => { setSel(m); setPForm({ password: '', confirm: '' }); setPwdOpen(true); };

    const handlePwd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sel) return;
        if (!pForm.password) { toast('Please enter a new password', 'error'); return; }
        if (pForm.password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
        if (pForm.password !== pForm.confirm) { toast('Passwords do not match', 'error'); return; }
        setPBusy(true);
        try {
            await resetTeamMemberPassword(sel.id, pForm.password);
            toast('Password reset successfully');
            setPwdOpen(false);
        } catch (err: any) {
            toast(err?.response?.data?.detail || 'Password reset failed', 'error');
        } finally { setPBusy(false); }
    };

    const openDelete = (m: Member) => { setSel(m); setDeleteOpen(true); };

    const handleDelete = async () => {
        if (!sel) return;
        setDBusy(true);
        try {
            await deleteTeamMember(sel.id);
            toast('User deleted successfully');
            setDeleteOpen(false);
            await load();
        } catch (err: any) {
            toast(err?.response?.data?.detail || 'Delete failed', 'error');
        } finally { setDBusy(false); }
    };

    const openWorkload = async (m: Member) => {
        setSel(m);
        setWorkloadOpen(true);
        try {
            const d = await getMemberWorkload(m.id);
            setWorkload(d.requirements || []);
        } catch { setWorkload([]); }
    };

    // ── Shared styles ─────────────────────────────────────────────
    const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
    const modal: React.CSSProperties = { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalEnter 0.22s ease', overflow: 'hidden', color: 'var(--color-text-primary)' };
    const mHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)' };
    const mBody: React.CSSProperties = { padding: '20px 24px' };
    const mFoot: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--color-border)' };
    const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'var(--color-input-bg, var(--color-card))', color: 'var(--color-text-primary)', boxSizing: 'border-box' };
    const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' };
    const btnPrimary: React.CSSProperties = { padding: '10px 22px', background: 'var(--color-primary)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
    const btnSecondary: React.CSSProperties = { padding: '10px 18px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
    const btnClose: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0 4px', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center' };

    const priorityColors: Record<string, string> = { urgent: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#64748b' };
    const statusColors: Record<string, string> = { open: '#10b981', in_progress: '#3b82f6', filled: '#8b5cf6', closed: '#94a3b8' };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes modalEnter{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
                @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
                .team-action-btn{transition:all 0.2s;}
                .team-action-btn:hover{background:#f1f5f9!important;border-color:#cbd5e1!important;color:#0f172a!important;}
                .team-action-btn-danger:hover{background:#fef2f2!important;border-color:#fca5a5!important;color:#dc2626!important;}
                .user-card{transition:all 0.25s;}
                .user-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08)!important;}
            ` }} />

            {/* ─── Toasts ──────────────────────────────────────────────── */}
            <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '14px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                        animation: 'toastIn 0.3s ease', minWidth: 280, display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        background: t.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${t.type === 'success' ? '#86efac' : '#fca5a5'}`,
                        color: t.type === 'success' ? '#166534' : '#991b1b',
                    }}>
                        {t.type === 'success'
                            ? <Check size={16} style={{ flexShrink: 0 }} />
                            : <X size={16} style={{ flexShrink: 0 }} />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ─── Page Header ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>User Management</h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, margin: 0 }}>Manage team access, roles, and permissions</p>
                </div>
                <button
                    onClick={() => setCreateOpen(true)}
                    style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    <UserPlus size={16} /> Add User
                </button>
            </div>

            {/* ─── Stats Row ───────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    { Icon: Users, value: stats.total, label: 'Total Users' },
                    { Icon: Shield, value: stats.admins, label: 'Admins' },
                    { Icon: User, value: stats.members, label: 'Members' },
                    { Icon: Eye, value: stats.viewers, label: 'Viewers' },
                    { Icon: Activity, value: stats.active, label: 'Active' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--color-primary)' }}>
                            <s.Icon size={22} />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginTop: 6 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Action Bar ──────────────────────────────────────────── */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '13px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>All Users</h3>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(2,116,189,0.1)', color: PRIMARY, padding: '3px 10px', borderRadius: 12 }}>{members.length}</span>
                </div>
            </div>

            {/* ─── User Cards Grid ─────────────────────────────────────── */}
            {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Users size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <p style={{ fontWeight: 500 }}>No users found. Add your first team member!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                    {members.map(m => {
                        const rc = ROLE[m.role] || ROLE.member;
                        const RoleIcon = rc.Icon;
                        const initials = m.name
                            ? m.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                            : m.email.substring(0, 2).toUpperCase();
                        const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                        const isOwner = m.is_owner === true;

                        return (
                            <div
                                key={`${isOwner ? 'owner' : 'user'}-${m.id}`}
                                className="user-card"
                                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22, boxShadow: '0 2px 6px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}
                            >
                                {/* Role accent bar */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: m.role === 'admin' ? 'linear-gradient(90deg,#946D43,#D9C19D)' : m.role === 'member' ? 'linear-gradient(90deg,#6B8E23,#9ACD32)' : 'linear-gradient(90deg,#724A24,#B7966B)' }} />

                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                    <div style={{ width: 46, height: 46, borderRadius: 12, background: rc.bg, color: rc.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || m.email.split('@')[0]}</span>
                                            {isOwner && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#946D43', background: 'rgba(148,109,67,0.1)', padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>
                                                    <Crown size={9} /> YOU
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
                                    </div>
                                </div>

                                {/* Meta pills */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: rc.bg, color: rc.accent, border: `1px solid ${rc.accent}33` }}>
                                        <RoleIcon size={11} /> {rc.label}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: m.is_active ? '#166534' : '#991b1b' }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.is_active ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                                        {m.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {dateStr && <span style={{ fontSize: 11, color: '#94a3b8' }}>{dateStr}</span>}
                                </div>

                                {/* Actions — hidden for owner */}
                                {!isOwner && (
                                    <div style={{ display: 'flex', gap: 6, paddingTop: 14, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                                        <button onClick={() => openEdit(m)} className="team-action-btn" title="Edit user" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                                            <Edit2 size={13} /> Edit
                                        </button>
                                        <button onClick={() => openPwd(m)} className="team-action-btn" title="Reset password" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                                            <Key size={13} /> Password
                                        </button>
                                        <button onClick={() => openWorkload(m)} className="team-action-btn" title="View workload" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                                            <Briefcase size={13} /> Workload
                                        </button>
                                        <button onClick={() => openDelete(m)} className="team-action-btn-danger team-action-btn" title="Delete user" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                )}

                                {/* Owner — no actions, just a note */}
                                {isOwner && (
                                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Account owner — manage from Settings</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                CREATE MODAL
            ═══════════════════════════════════════════════════════════ */}
            {createOpen && (
                <div style={overlay} onClick={() => setCreateOpen(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={mHead}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <UserPlus size={18} color={PRIMARY} />
                                <span style={{ fontWeight: 700, fontSize: 16 }}>Add New User</span>
                            </div>
                            <button style={btnClose} onClick={() => setCreateOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={{ ...mBody, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div><label style={lbl}>Full Name *</label><input value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Doe" style={inp} required autoFocus /></div>
                                <div><label style={lbl}>Email Address *</label><input type="email" value={cForm.email} onChange={e => setCForm(p => ({ ...p, email: e.target.value }))} placeholder="user@company.com" style={inp} required /></div>
                                <div><label style={lbl}>Password *</label><input type="password" value={cForm.password} onChange={e => setCForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" style={inp} required /></div>
                                <div>
                                    <label style={lbl}>Role</label>
                                    <select value={cForm.role} onChange={e => setCForm(p => ({ ...p, role: e.target.value as Role }))} style={{ ...inp, cursor: 'pointer' }}>
                                        <option value="viewer">Viewer — Read-only access</option>
                                        <option value="member">Member — Standard access</option>
                                        <option value="admin">Admin — Full access</option>
                                    </select>
                                </div>
                            </div>
                            <div style={mFoot}>
                                <button type="button" style={btnSecondary} onClick={() => setCreateOpen(false)}>Cancel</button>
                                <button type="submit" style={{ ...btnPrimary, opacity: cBusy ? 0.7 : 1 }} disabled={cBusy}>
                                    {cBusy ? 'Creating…' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                EDIT MODAL
            ═══════════════════════════════════════════════════════════ */}
            {editOpen && sel && (
                <div style={overlay} onClick={() => setEditOpen(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={mHead}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Edit2 size={18} color={PRIMARY} />
                                <span style={{ fontWeight: 700, fontSize: 16 }}>Edit User</span>
                            </div>
                            <button style={btnClose} onClick={() => setEditOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div style={{ ...mBody, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div><label style={lbl}>Full Name</label><input value={eForm.name} onChange={e => setEForm(p => ({ ...p, name: e.target.value }))} style={inp} autoFocus /></div>
                                <div><label style={lbl}>Email</label><input value={sel.email} disabled style={{ ...inp, opacity: 0.6, cursor: 'not-allowed' }} /></div>
                                <div>
                                    <label style={lbl}>Role</label>
                                    <select value={eForm.role} onChange={e => setEForm(p => ({ ...p, role: e.target.value as Role }))} style={{ ...inp, cursor: 'pointer' }}>
                                        <option value="viewer">Viewer</option>
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={lbl}>Status</label>
                                    <select value={String(eForm.is_active)} onChange={e => setEForm(p => ({ ...p, is_active: e.target.value === 'true' }))} style={{ ...inp, cursor: 'pointer' }}>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div style={mFoot}>
                                <button type="button" style={btnSecondary} onClick={() => setEditOpen(false)}>Cancel</button>
                                <button type="submit" style={{ ...btnPrimary, opacity: eBusy ? 0.7 : 1 }} disabled={eBusy}>
                                    {eBusy ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                RESET PASSWORD MODAL
            ═══════════════════════════════════════════════════════════ */}
            {pwdOpen && sel && (
                <div style={overlay} onClick={() => setPwdOpen(false)}>
                    <div style={modal} onClick={e => e.stopPropagation()}>
                        <div style={mHead}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Key size={18} color={PRIMARY} />
                                <span style={{ fontWeight: 700, fontSize: 16 }}>Reset Password</span>
                            </div>
                            <button style={btnClose} onClick={() => setPwdOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handlePwd}>
                            <div style={{ ...mBody, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                                    Enter a new password for <strong style={{ color: 'var(--color-text-primary)' }}>{sel.email}</strong>
                                </p>
                                <div><label style={lbl}>New Password *</label><input type="password" value={pForm.password} onChange={e => setPForm(p => ({ ...p, password: e.target.value }))} placeholder="Enter new password" style={inp} required autoFocus /></div>
                                <div><label style={lbl}>Confirm Password *</label><input type="password" value={pForm.confirm} onChange={e => setPForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter password" style={inp} required /></div>
                            </div>
                            <div style={mFoot}>
                                <button type="button" style={btnSecondary} onClick={() => setPwdOpen(false)}>Cancel</button>
                                <button type="submit" style={{ ...btnPrimary, opacity: pBusy ? 0.7 : 1 }} disabled={pBusy}>
                                    {pBusy ? 'Resetting…' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                DELETE CONFIRM MODAL
            ═══════════════════════════════════════════════════════════ */}
            {deleteOpen && sel && (
                <div style={overlay} onClick={() => setDeleteOpen(false)}>
                    <div style={{ ...modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div style={{ ...mHead, borderBottomColor: '#fecaca' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Trash2 size={18} color="#dc2626" />
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#991b1b' }}>Delete User</span>
                            </div>
                            <button style={btnClose} onClick={() => setDeleteOpen(false)}><X size={18} /></button>
                        </div>
                        <div style={mBody}>
                            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>
                                Are you sure you want to delete <strong>{sel.email}</strong>?
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, marginBottom: 0 }}>
                                This action cannot be undone. The user will lose all access immediately.
                            </p>
                        </div>
                        <div style={mFoot}>
                            <button style={btnSecondary} onClick={() => setDeleteOpen(false)}>Cancel</button>
                            <button onClick={handleDelete} disabled={dBusy} style={{ ...btnPrimary, background: '#ef4444', opacity: dBusy ? 0.7 : 1 }}>
                                {dBusy ? 'Deleting…' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                WORKLOAD MODAL
            ═══════════════════════════════════════════════════════════ */}
            {workloadOpen && sel && (
                <div style={overlay} onClick={() => setWorkloadOpen(false)}>
                    <div style={{ ...modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        <div style={mHead}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
                                    <Briefcase size={18} color={PRIMARY} /> {sel.name}'s Workload
                                </div>
                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{workload.length} assigned requirement{workload.length !== 1 ? 's' : ''}</div>
                            </div>
                            <button style={btnClose} onClick={() => setWorkloadOpen(false)}><X size={18} /></button>
                        </div>
                        <div style={{ ...mBody, maxHeight: 420, overflowY: 'auto' }}>
                            {workload.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                                    <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                                    <p style={{ margin: 0, fontWeight: 500 }}>No requirements assigned to this member</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {workload.map(r => (
                                        <div key={r.id} onClick={() => { setWorkloadOpen(false); router.push(`/client/requirements/${r.id}`); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--color-background)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{r.job_title}</div>
                                                {r.company_name && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.company_name}</div>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {r.priority && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: priorityColors[r.priority] || '#64748b' }}>{r.priority}</span>}
                                                {r.status && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: statusColors[r.status] || '#64748b' }}>{r.status}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={mFoot}>
                            <button style={btnSecondary} onClick={() => setWorkloadOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

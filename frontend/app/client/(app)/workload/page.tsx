'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import {
    PieChart, Users, Briefcase, RefreshCw, ChevronRight,
    AlertTriangle, CheckCircle, Clock, Archive,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Req { id: number; job_title: string; company_name: string | null; status: string; priority: string; }
interface Member { user_id: number; name: string; email: string; role: string; requirements: Req[]; count: number; }
interface WorkloadData { members: Member[]; unassigned_count: number; }

// ─── Constants ──────────────────────────────────────────────────────────────
const PRIMARY = 'var(--color-primary)';
const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: 'Open', color: '#166534', bg: 'rgba(34,197,94,0.1)' },
    in_progress: { label: 'In Progress', color: '#1e40af', bg: 'rgba(59,130,246,0.1)' },
    filled: { label: 'Filled', color: '#6b21a8', bg: 'rgba(168,85,247,0.1)' },
    closed: { label: 'Closed', color: '#374151', bg: 'rgba(107,114,128,0.1)' },
};
const priorityCfg: Record<string, { color: string }> = {
    urgent: { color: '#dc2626' },
    high: { color: '#ea580c' },
    medium: { color: '#ca8a04' },
    low: { color: '#64748b' },
};

export default function WorkloadPage() {
    const router = useRouter();
    const [data, setData] = useState<WorkloadData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await apiClient.get('/api/client/requirements/workload/overview');
            setData(res.data);
        } catch { /* handled by interceptor */ }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Derived stats ──────────────────────────────────────────────────────
    const totalAssigned = data?.members.reduce((s, m) => s + m.count, 0) ?? 0;
    const maxLoad = data?.members.reduce((m, v) => Math.max(m, v.count), 1) ?? 1;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div style={{ width: 36, height: 36, border: `3px solid #e2e8f0`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin{to{transform:rotate(360deg)}}
                .req-row:hover{background:rgba(74,107,80,0.04)!important;border-color:rgba(74,107,80,0.2)!important;}
                .member-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08)!important;}
            ` }} />

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <PieChart size={22} color={PRIMARY} /> Workload Overview
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                        Monitor team assignments and requirement distribution
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {/* ─── Summary Stats ───────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
                {[
                    { icon: <Users size={20} />, label: 'Team Members', value: data?.members.length ?? 0, color: PRIMARY },
                    { icon: <Briefcase size={20} />, label: 'Assigned Reqs', value: totalAssigned, color: '#8b5cf6' },
                    { icon: <AlertTriangle size={20} />, label: 'Unassigned', value: data?.unassigned_count ?? 0, color: '#ef4444' },
                    { icon: <CheckCircle size={20} />, label: 'Avg per Member', value: data?.members.length ? Math.round(totalAssigned / data.members.length * 10) / 10 : 0, color: '#10b981' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ color: s.color, marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginTop: 6 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Member Cards Grid ───────────────────────────────────────── */}
            {!data || data.members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)', background: 'var(--color-card)', borderRadius: 16, border: '1px dashed var(--color-border)' }}>
                    <Users size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <p style={{ fontWeight: 500, margin: 0 }}>No team members found. Add team members to track workload.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 18 }}>
                    {data.members.map(m => {
                        const initials = m.name ? m.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : m.email.substring(0, 2).toUpperCase();
                        const loadPct = Math.round((m.count / maxLoad) * 100);
                        const loadColor = loadPct > 75 ? '#ef4444' : loadPct > 40 ? '#f97316' : '#10b981';

                        return (
                            <div key={m.user_id} className="member-card" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'all 0.25s' }}>
                                {/* Card Header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,107,80,0.1)', color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{m.name || m.email.split('@')[0]}</div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{m.email} · {m.role}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: loadColor, background: `${loadColor}15`, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>
                                        {m.count} Active
                                    </div>
                                </div>

                                {/* Load bar */}
                                <div style={{ padding: '10px 20px 0', background: 'var(--color-background)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Workload</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: loadColor }}>{loadPct}%</span>
                                    </div>
                                    <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden', marginBottom: 10 }}>
                                        <div style={{ height: '100%', width: `${loadPct}%`, background: loadColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
                                    </div>
                                </div>

                                {/* Requirements list */}
                                <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 10px 10px' }}>
                                    {m.requirements.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                                            No active requirements assigned
                                        </div>
                                    ) : (
                                        m.requirements.map(r => {
                                            const sc = statusCfg[r.status] || statusCfg.closed;
                                            const pc = priorityCfg[r.priority] || priorityCfg.low;
                                            return (
                                                <div
                                                    key={r.id}
                                                    className="req-row"
                                                    onClick={() => router.push(`/client/requirements/${r.id}`)}
                                                    style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 6, border: '1px solid transparent', background: 'rgba(0,0,0,0.015)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color }}>
                                                            {sc.label}
                                                        </span>
                                                        <ChevronRight size={12} color="#94a3b8" />
                                                    </div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{r.job_title}</div>
                                                    {r.company_name && (
                                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.company_name}</div>
                                                    )}
                                                    <div style={{ marginTop: 4 }}>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: pc.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                            ● {r.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Unassigned Banner ───────────────────────────────────────── */}
            {(data?.unassigned_count ?? 0) > 0 && (
                <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        <div>
                            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
                                {data!.unassigned_count} Unassigned Requirement{data!.unassigned_count !== 1 ? 's' : ''}
                            </div>
                            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>
                                These requirements have no team member assigned.
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/client/requirements')}
                        style={{ padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    >
                        View Requirements
                    </button>
                </div>
            )}
        </div>
    );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { getClientMe } from '@/lib/api/clientPortal';
import {
    ListChecks, RefreshCw, ChevronLeft, ChevronRight,
    Filter, Search, X, Clock,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface LogRow {
    id: number; user_email: string; user_type: string;
    action: string; entity_type: string | null; entity_id: number | null;
    description: string; ip_address: string | null; created_at: string;
}

// ─── Action colour mapping ──────────────────────────────────────────────────
const PRIMARY = 'var(--color-primary)';
const actionColor = (action: string): { color: string; bg: string } => {
    if (action.includes('create')) return { color: '#166534', bg: 'rgba(34,197,94,0.1)' };
    if (action.includes('delete')) return { color: '#991b1b', bg: 'rgba(239,68,68,0.1)' };
    if (action.includes('update') || action.includes('edit'))
        return { color: '#1e40af', bg: 'rgba(59,130,246,0.1)' };
    if (action.includes('login') || action.includes('logout'))
        return { color: '#6b21a8', bg: 'rgba(168,85,247,0.1)' };
    if (action.includes('ai') || action.includes('parse'))
        return { color: '#92400e', bg: 'rgba(251,191,36,0.12)' };
    if (action.includes('team')) return { color: '#946D43', bg: 'rgba(148,109,67,0.1)' };
    return { color: '#374151', bg: 'rgba(107,114,128,0.1)' };
};

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function AuditPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');

    const PAGE_SIZE = 50;

    const load = useCallback(async (pg = page, silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const params: any = { page: pg, page_size: PAGE_SIZE };
            if (filterAction) params.action = filterAction;
            if (filterEntity) params.entity_type = filterEntity;
            if (search) params.user_email = search;
            const res = await apiClient.get('/api/client/audit/logs', { params });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.total_pages || 1);
            setPage(pg);
        } catch { /* redirect handled by interceptor */ }
        finally { setLoading(false); setRefreshing(false); }
    }, [page, filterAction, filterEntity, search]);

    useEffect(() => {
        getClientMe()
            .then(me => {
                if (me.role !== 'admin') router.push('/client/dashboard');
                else setIsAdmin(true);
            })
            .catch(() => router.push('/login'));
    }, [router]);

    useEffect(() => { if (isAdmin) load(1); }, [isAdmin, filterAction, filterEntity]);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(1); };

    const clearFilters = () => { setSearch(''); setFilterAction(''); setFilterEntity(''); };

    if (loading && !isAdmin) return null;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div style={{ width: 36, height: 36, border: `3px solid #e2e8f0`, borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
    );

    const inp: React.CSSProperties = {
        padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 8,
        fontSize: 13, background: 'var(--color-input-bg, var(--color-card))', color: 'var(--color-text-primary)', outline: 'none',
    };

    const entityTypes = ['requirement', 'team', 'candidate', 'company'];
    const actionTypes = ['create', 'update', 'delete', 'login', 'ai_create', 'team_create', 'team_update', 'team_delete'];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin{to{transform:rotate(360deg)}}
                .log-row:hover{background:#f8fafc!important;}
            ` }} />

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ListChecks size={22} color={PRIMARY} /> Audit Logs
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                        Track all system activity and changes across your organization
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => load(page, true)}
                        disabled={refreshing}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ─── Filters ─────────────────────────────────────────────────── */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Filter size={15} color="var(--color-text-muted)" />
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>Filters</span>
                    {(search || filterAction || filterEntity) && (
                        <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>
                            <X size={10} /> Clear
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    {/* Email search */}
                    <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by email..."
                                className="w-full sm:w-[200px]"
                                style={{ ...inp, paddingLeft: 30 }}
                            />
                        </div>
                        <button type="submit" style={{ padding: '8px 14px', background: PRIMARY, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Go</button>
                    </form>

                    {/* Action filter */}
                    <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full sm:w-auto" style={{ ...inp, cursor: 'pointer' }}>
                        <option value="">All Actions</option>
                        {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>

                    {/* Entity filter */}
                    <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-full sm:w-auto" style={{ ...inp, cursor: 'pointer' }}>
                        <option value="">All Entities</option>
                        {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </div>

            {/* ─── Stats pills ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    Showing {logs.length} of {total} log entries
                </span>
            </div>

            {/* ─── Table ───────────────────────────────────────────────────── */}
            <div className="shadow-sm rounded-[14px]" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_0.8fr_2.5fr] px-[18px] py-2.5 bg-[var(--color-background)] border-b border-[var(--color-border)]">
                    {['Time', 'User', 'Action', 'Entity', 'Description'].map(h => (
                        <div key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', paddingRight: 8 }}>{h}</div>
                    ))}
                </div>

                {/* Rows */}
                {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                        <ListChecks size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No audit logs found for the selected filters</p>
                    </div>
                ) : (
                    logs.map((log, i) => {
                        const ac = actionColor(log.action);
                        return (
                            <div
                                key={log.id}
                                className={`log-row flex flex-col md:grid md:grid-cols-[1fr_1.4fr_1fr_0.8fr_2.5fr] gap-2 md:gap-x-2 p-4 md:px-[18px] md:py-[11px] items-start transition-colors ${i < logs.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
                            >
                                {/* Time & Mobile Action */}
                                <div className="flex items-start justify-between w-full md:w-auto md:pr-2">
                                    <div className="flex items-start gap-1.5" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                        <Clock size={11} color="var(--color-text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                                        <span style={{ wordBreak: 'break-word' }}>{log.created_at ? fmtDate(log.created_at) : '—'}</span>
                                    </div>
                                    <span className="md:hidden" style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: ac.bg, color: ac.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        {log.action}
                                    </span>
                                </div>
                                
                                {/* User */}
                                <div className="w-full md:w-auto md:pr-2 min-w-0">
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        {log.user_email || '—'}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        {log.user_type}
                                    </div>
                                </div>
                                
                                {/* Action (Desktop) */}
                                <div className="hidden md:block md:pr-2">
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: ac.bg, color: ac.color, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.action}
                                    </span>
                                </div>
                                
                                {/* Entity */}
                                <div className="w-full md:w-auto md:pr-2" style={{ fontSize: 12, color: 'var(--color-text-secondary)', wordBreak: 'break-word' }}>
                                    <span className="md:hidden font-semibold mr-1">Entity:</span>
                                    {log.entity_type ? (
                                        <span>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</span>
                                    ) : '—'}
                                </div>
                                
                                {/* Description */}
                                <div className="w-full md:w-auto p-3 bg-[var(--color-background)] rounded-lg md:p-0 md:bg-transparent mt-1 md:mt-0" style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                    {log.description}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ─── Pagination ──────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button
                        onClick={() => load(page - 1)}
                        disabled={page <= 1}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: page <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)', fontSize: 13, fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeft size={14} /> Previous
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Page {page} of {totalPages}</span>
                    <button
                        onClick={() => load(page + 1)}
                        disabled={page >= totalPages}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, color: page >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)', fontSize: 13, fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

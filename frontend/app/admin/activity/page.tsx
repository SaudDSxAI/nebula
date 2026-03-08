'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import * as adminApi from '@/lib/api/admin';
import { format } from 'date-fns';
import {
    LogIn, UserPlus, Edit2, Plus, Trash2, Upload, Bookmark,
    RefreshCw, Search, Filter, Activity, ChevronLeft, ChevronRight,
} from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
    login: <LogIn size={14} />,
    signup: <UserPlus size={14} />,
    update: <Edit2 size={14} />,
    create: <Plus size={14} />,
    delete: <Trash2 size={14} />,
    upload: <Upload size={14} />,
    status_change: <RefreshCw size={14} />,
    password_reset: <Bookmark size={14} />,
    default: <Activity size={14} />,
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
    login: { bg: '#eff6ff', color: '#3b82f6' },
    signup: { bg: '#ecfdf5', color: '#10b981' },
    create: { bg: '#ecfdf5', color: '#10b981' },
    update: { bg: '#fffbeb', color: '#f59e0b' },
    delete: { bg: '#fef2f2', color: '#ef4444' },
    upload: { bg: '#f5f3ff', color: '#8b5cf6' },
    status_change: { bg: '#fff7ed', color: '#f97316' },
    password_reset: { bg: '#fdf2f8', color: '#ec4899' },
    default: { bg: 'var(--color-background)', color: 'var(--color-text-muted)' },
};

const PAGE_SIZE = 25;

export default function ActivityLogPage() {
    const [activities, setActivities] = useState<adminApi.ActivityItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const load = useCallback(async (p = page, action = actionFilter, q = search) => {
        setLoading(true);
        try {
            const data = await adminApi.getActivityLog({ limit: 100, action: action || undefined });
            // Client-side filtering by search since backend doesn't support it yet
            const filtered = q
                ? data.activities.filter(a =>
                    a.description.toLowerCase().includes(q.toLowerCase()) ||
                    (a.user_email || '').toLowerCase().includes(q.toLowerCase())
                )
                : data.activities;
            setTotal(filtered.length);
            const start = (p - 1) * PAGE_SIZE;
            setActivities(filtered.slice(start, start + PAGE_SIZE));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, actionFilter, search]);

    useEffect(() => { load(); }, [page, actionFilter, search]);

    const handleRefresh = () => { setRefreshing(true); load(); };
    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const card: React.CSSProperties = { background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)' };

    return (
        <AdminLayout>
            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .act-row:hover { background: var(--color-background) !important; }
      `}</style>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Activity Log</h1>
                    <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>Full history of all platform events</p>
                </div>
                <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ ...card, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                    <input
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by description or user email..."
                        style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, outline: 'none', background: 'var(--color-background)', color: 'var(--color-text-primary)', boxSizing: 'border-box' as const }}
                    />
                </div>

                {/* Action filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, outline: 'none', background: 'var(--color-card)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="signup">Signup</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="upload">Upload</option>
                        <option value="status_change">Status Change</option>
                        <option value="password_reset">Password Reset</option>
                    </select>
                </div>

                <button onClick={handleSearch} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Search
                </button>

                {(search || actionFilter) && (
                    <button onClick={() => { setSearch(''); setSearchInput(''); setActionFilter(''); setPage(1); }}
                        style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer' }}>
                        Clear
                    </button>
                )}
            </div>

            {/* Results count */}
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {loading ? 'Loading...' : `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total} events`}
            </div>

            {/* Table */}
            <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 160px 140px', padding: '12px 20px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <div>Action</div>
                    <div>Description</div>
                    <div>User</div>
                    <div style={{ textAlign: 'right' }}>Time</div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                        <div style={{ width: 36, height: 36, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : activities.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <Activity size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>No events found</p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Try adjusting your filters</p>
                    </div>
                ) : (
                    <div>
                        {activities.map((item, i) => {
                            const actionKey = item.action in ACTION_ICONS ? item.action : 'default';
                            const icon = ACTION_ICONS[actionKey];
                            const { bg, color } = ACTION_COLORS[actionKey] || ACTION_COLORS.default;
                            return (
                                <div key={item.id} className="act-row" style={{
                                    display: 'grid', gridTemplateColumns: '160px 1fr 160px 140px',
                                    padding: '14px 20px', borderBottom: i < activities.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    alignItems: 'center', transition: 'background 0.12s', animation: `fadeUp 0.3s ease ${i * 0.02}s both`,
                                }}>
                                    {/* Action badge */}
                                    <div>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, textTransform: 'capitalize', letterSpacing: '0.2px' }}>
                                            {icon} {item.action.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {/* Description */}
                                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5, paddingRight: 20 }}>
                                        {item.description}
                                    </div>
                                    {/* User */}
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.user_email || <span style={{ fontStyle: 'italic' }}>System</span>}
                                    </div>
                                    {/* Time */}
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                                        {format(new Date(item.created_at), 'MMM d, yyyy')}<br />
                                        <span style={{ fontSize: 11 }}>{format(new Date(item.created_at), 'h:mm a')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Page {page} of {totalPages}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            <ChevronLeft size={14} /> Prev
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = page <= 3 ? i + 1 : page - 2 + i;
                            if (p > totalPages) return null;
                            return (
                                <button key={p} onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--color-border)', background: p === page ? 'var(--color-primary)' : 'var(--color-card)', color: p === page ? '#fff' : 'var(--color-text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{p}</button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

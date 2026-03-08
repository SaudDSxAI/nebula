'use client';

import { useEffect, useState } from 'react';
import { getClientMe } from '@/lib/api/clientPortal';
import apiClient from '@/lib/api/client';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Area, AreaChart, CartesianGrid
} from 'recharts';
import {
    Users, Briefcase, FolderOpen, AlertTriangle, ClipboardList, BarChart2
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

const BLUE = COLORS.primary;
const BLACK = '#1c1917';

const TOOLTIP_STYLE = {
    contentStyle: {
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 10, fontSize: 13, padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    },
};

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD — matches coter-global-agent exactly
   5 stat cards + 2 charts (Roles bar + Timeline line)
   ═══════════════════════════════════════════════════════════ */
export default function ClientDashboardPage() {
    const [client, setClient] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [timelinePeriod, setTimelinePeriod] = useState<'days' | 'months' | 'years'>('days');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [clientData, chartsRes] = await Promise.all([
                    getClientMe(),
                    apiClient.get('/api/client/dashboard/charts'),
                ]);
                setClient(clientData);
                const data = chartsRes.data;
                setStats(data.summary);
                setRoles(data.roles_distribution || []);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Load timeline when period changes
    useEffect(() => {
        const loadTimeline = async () => {
            try {
                const res = await apiClient.get(`/api/client/dashboard/timeline?period=${timelinePeriod}`);
                setTimeline(res.data.timeline || []);
            } catch { }
        };
        loadTimeline();
    }, [timelinePeriod]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0', color: COLORS.textMuted }}>
                <div style={{
                    width: 40, height: 40, border: `3px solid ${COLORS.secondary}`,
                    borderTopColor: BLUE, borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                }} />
                Loading dashboard...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{
                    fontSize: 26, fontWeight: 800, margin: 0, marginBottom: 4,
                    color: COLORS.textPrimary, letterSpacing: '-0.02em',
                }}>
                    Dashboard — {client?.company_name}
                </h1>
                <p style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                    Candidate overview and requirements status
                </p>
            </div>

            {/* ── 5 Stat Cards (exactly like old app) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
                <StatCard
                    label="Total Available Candidates"
                    value={stats?.available_candidates ?? 0}
                    icon={<Users size={20} />}
                />
                <StatCard
                    label="Total Requirements"
                    value={stats?.total_requirements ?? 0}
                    icon={<ClipboardList size={20} />}
                />
                <StatCard
                    label="Open Requirements"
                    value={stats?.active_requirements ?? 0}
                    icon={<FolderOpen size={20} />}
                />
                <StatCard
                    label="Unassigned Requirements"
                    value={stats?.unassigned_requirements ?? 0}
                    icon={<AlertTriangle size={20} />}
                />
                <StatCard
                    label="My Assigned Requirements"
                    value={0}
                    icon={<Briefcase size={20} />}
                />
            </div>

            {/* ── 2 Charts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Chart 1: Candidates by Role */}
                <ChartCard title="Candidates by Role">
                    <RolesBarChart data={roles} />
                </ChartCard>

                {/* Chart 2: Candidates by Date/Time */}
                <ChartCard
                    title="Candidates by Date/Time"
                    extra={
                        <div style={{ display: 'flex', gap: 4 }}>
                            {(['days', 'months', 'years'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setTimelinePeriod(p)}
                                    style={{
                                        padding: '5px 14px', borderRadius: 6,
                                        border: `1px solid ${timelinePeriod === p ? BLUE : COLORS.border}`,
                                        background: timelinePeriod === p ? COLORS.primaryAlpha : 'transparent',
                                        color: timelinePeriod === p ? BLUE : COLORS.textMuted,
                                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        textTransform: 'capitalize', transition: 'all 0.2s',
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    }
                >
                    <TimelineChart data={timeline} />
                </ChartCard>
            </div>
        </>
    );
}


/* ═══════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '18px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = 'none'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                <span style={{ color: BLUE }}>{icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {value.toLocaleString()}
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   CHART CARD
   ═══════════════════════════════════════════════════════════ */
function ChartCard({ title, children, extra }: {
    title: string; children: React.ReactNode; extra?: React.ReactNode;
}) {
    return (
        <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 24, transition: 'border-color 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
        >
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>{title}</h3>
                {extra}
            </div>
            {children}
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   ROLES BAR CHART — Candidates by Role (horizontal)
   ═══════════════════════════════════════════════════════════ */
function RolesBarChart({ data }: { data: any[] }) {
    if (!data.length) return <EmptyState text="Add candidates with job titles to see role distribution" />;

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 16, right: 20, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                    type="category" dataKey="role"
                    tick={{ fill: COLORS.textPrimary, fontSize: 12, fontWeight: 600 }}
                    axisLine={false} tickLine={false} width={140} interval={0}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18} fill={BLUE} />
            </BarChart>
        </ResponsiveContainer>
    );
}


/* ═══════════════════════════════════════════════════════════
   TIMELINE CHART — Candidates by Date/Time (area/line)
   ═══════════════════════════════════════════════════════════ */
function TimelineChart({ data }: { data: any[] }) {
    if (!data.length) return <EmptyState text="Timeline data appears as candidates are added" />;

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <defs>
                    <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BLUE} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area
                    type="monotone" dataKey="count"
                    stroke={BLUE} strokeWidth={2.5}
                    fill="url(#tlGrad)"
                    dot={{ r: 3, fill: BLUE, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: BLUE, stroke: '#fff', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}


/* ═══════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════ */
function EmptyState({ text }: { text: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted, fontSize: 13 }}>
            <BarChart2 size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div>{text}</div>
        </div>
    );
}

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
        background: 'var(--color-card)', border: `1px solid var(--color-border)`,
        borderRadius: 10, fontSize: 13, padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        color: 'var(--color-text-primary)'
    },
};

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
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
            <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)]">
                <div className="w-10 h-10 border-4 border-secondary border-t-primary rounded-full animate-spin mb-4" />
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-6 md:mb-8">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight mb-1.5 font-heading">
                    Dashboard — {client?.company_name}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed m-0">
                    Candidate overview and requirements status
                </p>
            </div>

            {/* ── 5 Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 md:mb-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Chart 1: Candidates by Role */}
                <ChartCard title="Candidates by Role">
                    <RolesBarChart data={roles} />
                </ChartCard>

                {/* Chart 2: Candidates by Date/Time */}
                <ChartCard
                    title="Candidates by Date/Time"
                    extra={
                        <div className="flex gap-1.5 bg-[var(--color-background)] p-1 rounded-lg border border-[var(--color-border)]">
                            {(['days', 'months', 'years'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setTimelinePeriod(p)}
                                    className={`
                                        px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-bold capitalize transition-all duration-200
                                        ${timelinePeriod === p
                                            ? 'bg-white dark:bg-black/20 text-primary shadow-sm ring-1 ring-black/5'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'}
                                    `}
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
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-primary hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider line-clamp-1 pr-2">
                    {label}
                </span>
                <span className="text-primary group-hover:scale-110 transition-transform duration-200 shrink-0">
                    {icon}
                </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] leading-none tracking-tight">
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
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm hover:border-primary transition-colors duration-200 flex flex-col h-full w-full overflow-hidden">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] m-0">{title}</h3>
                {extra && <div className="self-start sm:self-auto">{extra}</div>}
            </div>
            {/* Wrapper ensures recharts container respects bounds */}
            <div className="w-full flex-1 min-h-[250px] relative">
                <div className="absolute inset-0">
                    {children}
                </div>
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   ROLES BAR CHART
   ═══════════════════════════════════════════════════════════ */
function RolesBarChart({ data }: { data: any[] }) {
    if (!data.length) return <EmptyState text="Add candidates with job titles to see role distribution" />;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: -10, right: 10, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                    type="category" dataKey="role"
                    tick={{ fill: 'var(--color-text-primary)', fontSize: 11, fontWeight: 600 }}
                    axisLine={false} tickLine={false} width={100} interval={0}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14} fill={COLORS.primary} />
            </BarChart>
        </ResponsiveContainer>
    );
}


/* ═══════════════════════════════════════════════════════════
   TIMELINE CHART
   ═══════════════════════════════════════════════════════════ */
function TimelineChart({ data }: { data: any[] }) {
    if (!data.length) return <EmptyState text="Timeline data appears as candidates are added" />;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 10, top: 8, bottom: 4 }}>
                <defs>
                    <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area
                    type="monotone" dataKey="count"
                    stroke={COLORS.primary} strokeWidth={2.5}
                    fill="url(#tlGrad)"
                    dot={{ r: 3, fill: COLORS.primary, stroke: 'var(--color-card)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: COLORS.primary, stroke: 'var(--color-card)', strokeWidth: 2 }}
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
        <div className="h-full flex flex-col items-center justify-center p-6 text-[var(--color-text-muted)] text-xs sm:text-sm text-center">
            <BarChart2 size={32} className="opacity-30 mb-3" />
            <div>{text}</div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import apiClient from '@/lib/api/client';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie,
} from 'recharts';
import { Building2, Users, ClipboardList, Send } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await apiClient.get('/api/admin/dashboard/analytics/overview');
                setData(res.data);
            } catch (err) {
                console.error('Failed to load analytics:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: 'var(--color-primary)',
                            borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px',
                        }} />
                        <p style={{ color: '#6b7280', fontSize: 15 }}>Loading analytics...</p>
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </AdminLayout>
        );
    }

    const clientByStatus = data?.client_stats?.by_status
        ? Object.entries(data.client_stats.by_status).map(([k, v]) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number,
        })).filter(d => d.value > 0)
        : [];

    const clientByPlan = data?.client_stats?.by_plan
        ? Object.entries(data.client_stats.by_plan).map(([k, v]) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number,
        })).filter(d => d.value > 0)
        : [];

    const reqByStatus = data?.requirement_stats?.by_status
        ? Object.entries(data.requirement_stats.by_status).map(([k, v]) => ({
            name: k.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            value: v as number,
        })).filter(d => d.value > 0)
        : [];

    const topClients = data?.top_clients || [];

    const kpiCards = [
        { label: 'Total Clients', value: data?.client_stats?.total ?? 0, icon: <Building2 size={22} />, color: '#6366f1', iconBg: '#eef2ff' },
        { label: 'Total Candidates', value: data?.candidate_stats?.total ?? 0, icon: <Users size={22} />, color: '#10b981', iconBg: '#ecfdf5' },
        { label: 'Total Requirements', value: data?.requirement_stats?.total ?? 0, icon: <ClipboardList size={22} />, color: '#f59e0b', iconBg: '#fffbeb' },
        { label: 'Total Applications', value: data?.application_stats?.total ?? 0, icon: <Send size={22} />, color: '#ef4444', iconBg: '#fef2f2' },
    ];

    const tooltipStyle = {
        contentStyle: {
            backgroundColor: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 8, fontSize: 13,
        },
    };

    return (
        <AdminLayout>
            <div>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>Analytics</h1>
                    <p style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>Platform-wide insights and statistics</p>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                    {kpiCards.map(c => (
                        <div key={c.label} style={{
                            background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 24,
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10, background: c.iconBg,
                                color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 14,
                            }}>
                                {c.icon}
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: c.color }}>
                                {c.value === 0 ? <span style={{ color: 'var(--color-border)' }}>—</span> : c.value.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Charts Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    {/* Clients by Status - Donut with legend */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Clients by Status</h3>
                        {clientByStatus.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={clientByStatus}
                                                cx="50%" cy="50%"
                                                outerRadius={75} innerRadius={45}
                                                dataKey="value"
                                                strokeWidth={2}
                                                stroke="#fff"
                                            >
                                                {clientByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip {...tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                    {clientByStatus.map((item, i) => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 12, height: 12, borderRadius: 3,
                                                backgroundColor: COLORS[i % COLORS.length], flexShrink: 0,
                                            }} />
                                            <span style={{ fontSize: 14, color: '#374151', flex: 1 }}>{item.name}</span>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>
                        )}
                    </div>

                    {/* Clients by Plan - Donut with legend */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Clients by Plan</h3>
                        {clientByPlan.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={clientByPlan}
                                                cx="50%" cy="50%"
                                                outerRadius={75} innerRadius={45}
                                                dataKey="value"
                                                strokeWidth={2}
                                                stroke="#fff"
                                            >
                                                {clientByPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip {...tooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                    {clientByPlan.map((item, i) => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 12, height: 12, borderRadius: 3,
                                                backgroundColor: COLORS[i % COLORS.length], flexShrink: 0,
                                            }} />
                                            <span style={{ fontSize: 14, color: '#374151', flex: 1 }}>{item.name}</span>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>
                        )}
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    {/* Requirements by Status */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Requirements by Status</h3>
                        {reqByStatus.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={reqByStatus} layout="vertical">
                                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24} fill="#8b5cf6" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>
                        )}
                    </div>

                    {/* Top Clients */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>Top Clients by Candidates</h3>
                        {topClients.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {topClients.slice(0, 6).map((c: any, i: number) => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 6, background: COLORS[i % COLORS.length],
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                                        }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company_name}</div>
                                            <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.plan}</div>
                                        </div>
                                        <div style={{
                                            fontSize: 16, fontWeight: 700, color: '#111827',
                                            background: '#f3f4f6', padding: '4px 12px', borderRadius: 6,
                                        }}>{c.candidate_count}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>
                        )}
                    </div>
                </div>

                {/* AI Stats */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>AI Usage</h3>
                    <div style={{ display: 'flex', gap: 32 }}>
                        <div>
                            <div style={{ fontSize: 36, fontWeight: 700, color: '#6366f1' }}>
                                {data?.ai_interaction_stats?.total_interactions ?? 0}
                            </div>
                            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total AI Interactions</div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

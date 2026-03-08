'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import * as adminApi from '@/lib/api/admin';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import {
  Users, FileText, Briefcase, File, CheckCircle, TrendingUp,
  LogIn, UserPlus, Edit2, Plus, Trash2, Upload, Bookmark,
  Activity,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<adminApi.DashboardStats | null>(null);
  const [growth, setGrowth] = useState<adminApi.ClientGrowthResponse | null>(null);
  const [activity, setActivity] = useState<adminApi.RecentActivityResponse | null>(null);
  const [clients, setClients] = useState<adminApi.ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const results = await Promise.allSettled([
          adminApi.getDashboardStats(),
          adminApi.getClientGrowth('30days'),
          adminApi.getRecentActivity(10),
          adminApi.getClients({ page: 1, page_size: 50, sort_by: 'created_at', sort_order: 'desc' }),
        ]);
        if (results[0].status === 'fulfilled') setStats(results[0].value);
        else setError(true);
        if (results[1].status === 'fulfilled') setGrowth(results[1].value);
        if (results[2].status === 'fulfilled') setActivity(results[2].value);
        if (results[3].status === 'fulfilled') setClients(results[3].value.clients || []);
      } catch (e) {
        console.error('Dashboard load error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const hasActivity = activity?.activities && activity.activities.length > 0;
  const hasChartData = growth?.data_points && growth.data_points.length > 0;

  const card: React.CSSProperties = {
    backgroundColor: 'var(--color-card)', borderRadius: 14,
    border: '1px solid var(--color-border)',
    padding: 24, transition: 'box-shadow 0.2s',
  };
  const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' };
  const sectionSub: React.CSSProperties = { fontSize: 13, color: 'var(--color-text-muted)', margin: 0 };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = { active: '#10b981', inactive: '#f59e0b', suspended: '#ef4444' };
    return (
      <span style={{
        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
        background: colors[status] || 'var(--color-border)', marginRight: 6, flexShrink: 0,
      }} />
    );
  };

  const planBadge = (plan: string) => {
    const config: Record<string, { bg: string; color: string }> = {
      enterprise: { bg: '#eff6ff', color: '#3b82f6' },
      professional: { bg: '#f5f3ff', color: '#8b5cf6' },
      free: { bg: 'var(--color-background)', color: 'var(--color-text-secondary)' },
    };
    const c = config[plan] || config.free;
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
        background: c.bg, color: c.color, textTransform: 'capitalize',
      }}>{plan}</span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading dashboard...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    );
  }

  if (error && !stats) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>Failed to load dashboard data. Check that you are logged in and the server is running.</div>
          <button onClick={() => { setLoading(true); setError(false); }} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { title: 'Total Clients', value: stats?.total_clients ?? 0, sub: `${stats?.new_clients_this_week ?? 0} this week`, icon: <Users size={20} />, color: '#3b82f6', bg: '#eff6ff' },
    { title: 'Candidates', value: stats?.total_candidates ?? 0, sub: 'Total registered', icon: <FileText size={20} />, color: '#10b981', bg: '#ecfdf5' },
    { title: 'Requirements', value: stats?.total_requirements ?? 0, sub: 'Open positions', icon: <Briefcase size={20} />, color: '#8b5cf6', bg: '#f5f3ff' },
    { title: 'CV Uploads', value: stats?.total_cv_uploads ?? 0, sub: 'Total CVs processed', icon: <File size={20} />, color: '#f59e0b', bg: '#fffbeb' },
    { title: 'Applications', value: stats?.total_applications ?? 0, sub: 'Total submitted', icon: <CheckCircle size={20} />, color: '#06b6d4', bg: '#ecfeff' },
    { title: 'New This Month', value: stats?.new_clients_this_month ?? 0, sub: 'Client signups', icon: <TrendingUp size={20} />, color: '#ec4899', bg: '#fdf2f8' },
  ];

  // Activity icon map using Lucide components
  const activityIconMap: Record<string, React.ReactNode> = {
    login: <LogIn size={15} />,
    signup: <UserPlus size={15} />,
    update: <Edit2 size={15} />,
    create: <Plus size={15} />,
    delete: <Trash2 size={15} />,
    upload: <Upload size={15} />,
    default: <Bookmark size={15} />,
  };

  return (
    <AdminLayout>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-card { animation: fadeUp 0.4s ease; }
        .dash-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important; }
        .client-row:hover { background: var(--color-background) !important; }
      `}</style>

      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 4 }}>Platform overview and client management</p>
          </div>
          <Link href="/admin/clients" style={{
            padding: '10px 20px', borderRadius: 10, background: 'var(--color-primary)', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Plus size={15} /> Add Client
          </Link>
        </div>

        {/* Stats Grid — 3 columns × 2 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {statCards.map((c, i) => (
            <div key={i} className="dash-card" style={{ ...card, padding: '20px 18px', animationDelay: `${i * 0.05}s` }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: c.bg,
                color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}>
                {c.icon}
              </div>
              <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1 }}>
                {c.value === 0 ? <span style={{ color: 'var(--color-border)' }}>0</span> : c.value.toLocaleString()}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 4 }}>{c.title}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Plan Distribution + Chart Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
          {/* Plan Distribution */}
          <div className="dash-card" style={card}>
            <h2 style={sectionTitle}>Clients by Plan</h2>
            <p style={sectionSub}>Subscription breakdown</p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { plan: 'Enterprise', count: stats?.clients_by_plan?.enterprise ?? 0, color: '#3b82f6' },
                { plan: 'Professional', count: stats?.clients_by_plan?.professional ?? 0, color: '#8b5cf6' },
                { plan: 'Free', count: stats?.clients_by_plan?.free ?? 0, color: '#6b7280' },
              ].map(p => {
                const total = stats?.total_clients || 1;
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={p.plan}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.plan}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{p.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-background)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>Status Overview</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { label: 'Active', value: stats?.active_clients ?? 0, color: '#10b981' },
                  { label: 'Inactive', value: stats?.inactive_clients ?? 0, color: '#f59e0b' },
                  { label: 'Suspended', value: stats?.suspended_clients ?? 0, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    <span style={{ color: 'var(--color-text-muted)' }}>{s.label}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Growth Chart */}
          <div className="dash-card" style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={sectionTitle}>Client Growth</h2>
                <p style={sectionSub}>Last 30 days</p>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--color-primary)', display: 'inline-block' }} /> Total
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                  <span style={{ width: 10, height: 3, borderRadius: 2, background: '#10b981', display: 'inline-block' }} /> Active
                </span>
              </div>
            </div>
            {hasChartData ? (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growth?.data_points || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tickFormatter={v => format(new Date(v), 'MMM d')} stroke="var(--color-border)" style={{ fontSize: 11 }} />
                    <YAxis stroke="var(--color-border)" style={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={v => format(new Date(v), 'MMM d, yyyy')} contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="total_clients" stroke="var(--color-primary)" strokeWidth={2.5} name="Total" dot={false} />
                    <Line type="monotone" dataKey="active_clients" stroke="#10b981" strokeWidth={2} name="Active" dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)', borderRadius: 8, border: '1px dashed var(--color-border)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>No data yet</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Chart data will appear as clients are added</p>
              </div>
            )}
          </div>
        </div>

        {/* Clients Table + Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          {/* All Clients Table */}
          <div className="dash-card" style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ ...sectionTitle, fontSize: 15 }}>All Clients</h2>
                <p style={sectionSub}>{clients.length} registered companies</p>
              </div>
              <Link href="/admin/clients" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>
            {clients.length > 0 ? (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-background)', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Joined</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.id} className="client-row" style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <Link href={`/admin/clients/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--color-primary)', flexShrink: 0 }}>
                                {(c.company_name || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.company_name || 'Unnamed'}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{c.email}</div>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td style={{ padding: '12px' }}>{planBadge(c.plan)}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                            {statusDot(c.status)} {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                          {c.last_login ? format(new Date(c.last_login), 'MMM d, h:mm a') : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <Users size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>No clients yet</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Clients will appear here once they register</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="dash-card" style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ ...sectionTitle, fontSize: 15 }}>Recent Activity</h2>
                <p style={sectionSub}>Latest platform events</p>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <Activity size={17} />
              </div>
            </div>

            {hasActivity ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflow: 'auto' }}>
                {activity!.activities.slice(0, 10).map((item, i) => {
                  const icon = activityIconMap[item.action] || activityIconMap.default;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
                      borderBottom: i < 9 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, background: 'var(--color-background)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-primary)', flexShrink: 0,
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.5 }}>{item.description}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                          {item.user_email || 'System'} · {format(new Date(item.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', background: 'var(--color-background)', borderRadius: 8, border: '1px dashed var(--color-border)', flex: 1 }}>
                <Activity size={32} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-muted)' }}>No activity yet</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, textAlign: 'center' }}>
                  Activity will appear here as users<br />interact with the platform
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

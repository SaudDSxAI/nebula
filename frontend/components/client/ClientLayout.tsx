'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { clientLogout, getClientMe } from '@/lib/api/clientPortal';
import { LayoutDashboard, FileText, Users, Building, Settings, Zap, LogOut, ChevronLeft, ChevronRight, UsersRound, BarChart2, ListChecks, Activity } from 'lucide-react';
import { COLORS } from '@/lib/theme';
import { ThemeToggle } from '@/components/client/ThemeToggle';

const baseNavigation = [
    { name: 'Dashboard', href: '/client/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'member', 'viewer'] },
    { name: 'Requirements', href: '/client/requirements', icon: <FileText size={18} />, roles: ['admin', 'member', 'viewer'] },
    { name: 'Candidates', href: '/client/candidates', icon: <Users size={18} />, roles: ['admin', 'member', 'viewer'] },
    { name: 'Monitoring', href: '/client/monitoring', icon: <Activity size={18} />, roles: ['admin', 'member'] },
    { name: 'Team', href: '/client/team', icon: <UsersRound size={18} />, roles: ['admin'] },
    { name: 'Workload', href: '/client/workload', icon: <BarChart2 size={18} />, roles: ['admin'] },
    { name: 'Audit Logs', href: '/client/audit', icon: <ListChecks size={18} />, roles: ['admin'] },
    { name: 'Settings', href: '/client/settings', icon: <Settings size={18} />, roles: ['admin'] },
];


/* ── Tooltip shown next to icon when sidebar is collapsed ─────────────────── */
function NavTooltip({ label }: { label: string }) {
    return (
        <span style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: 10,
            background: 'var(--color-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            zIndex: 200,
        }}>
            {label}
        </span>
    );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [hoveredNav, setHoveredNav] = useState<string | null>(null);

    useEffect(() => {
        getClientMe()
            .then(setClient)
            .catch(() => router.push('/login'))
            .finally(() => setLoading(false));
    }, [router]);

    const handleLogout = async () => {
        await clientLogout();
        router.push('/login');
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, border: `3px solid var(--color-border)`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const W = collapsed ? 68 : 256;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.background }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito:wght@400;500;600;700;800&display=swap');
                @keyframes spin { to { transform: rotate(360deg); } }
                .sidebar-inner { transition: width 0.28s cubic-bezier(0.4,0,0.2,1); will-change: width; }
                .nav-link { transition: background 0.15s, color 0.15s; }
                .nav-link:hover { background: rgba(255,255,255,0.12) !important; }
                .collapse-btn:hover { background: rgba(255,255,255,0.1) !important; }
                .signout-btn:hover  { background: rgba(255,255,255,0.14) !important; }
            `}</style>

            {/* ── Sidebar ────────────────────────────────────────────── */}
            <div
                className="sidebar-inner"
                style={{
                    width: W,
                    background: COLORS.sidebar,
                    display: 'flex', flexDirection: 'column',
                    position: 'sticky', top: 0, height: '100vh',
                    zIndex: 20, flexShrink: 0,
                    color: '#FFFFFF',
                    boxShadow: '2px 0 12px rgba(0,0,0,0.08)',
                    overflow: 'visible',            // allow tooltip overflow
                }}
            >
                {/* ── Logo ─────────────────────────────────────────── */}
                <div style={{
                    padding: collapsed ? '18px 0' : '18px 18px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    minHeight: 68, overflow: 'hidden',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9, background: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: COLORS.primary, flexShrink: 0,
                        }}>
                            <Zap size={18} fill={COLORS.primary} />
                        </div>
                        {/* Text fades out — but sidebar width handles clipping */}
                        <div style={{
                            overflow: 'hidden', whiteSpace: 'nowrap',
                            maxWidth: collapsed ? 0 : 180,
                            opacity: collapsed ? 0 : 1,
                            transition: 'max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', fontFamily: "'Varela Round', sans-serif" }}>
                                Nebula
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {client?.plan || 'free'} · {client?.role || 'admin'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Nav items ─────────────────────────────────────── */}
                <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowX: 'hidden', overflowY: 'auto' }}>
                    {baseNavigation
                        .filter(item => item.roles.includes(client?.role || 'admin'))
                        .map(item => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <div
                                    key={item.name}
                                    style={{ position: 'relative' }}
                                    onMouseEnter={() => collapsed && setHoveredNav(item.name)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                >
                                    <Link
                                        href={item.href}
                                        className="nav-link"
                                        style={{
                                            display: 'flex', alignItems: 'center',
                                            padding: collapsed ? '11px 0' : '10px 14px',
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            borderRadius: 10,
                                            textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 700 : 500,
                                            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                                            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                                            gap: collapsed ? 0 : 11, width: '100%',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                                        <span style={{
                                            overflow: 'hidden', whiteSpace: 'nowrap',
                                            maxWidth: collapsed ? 0 : 160, opacity: collapsed ? 0 : 1,
                                            transition: 'max-width 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.18s',
                                        }}>
                                            {item.name}
                                        </span>
                                    </Link>
                                    {/* Tooltip when collapsed */}
                                    {collapsed && hoveredNav === item.name && <NavTooltip label={item.name} />}
                                </div>
                            );
                        })}
                </nav>

                {/* ── Bottom: user + logout + collapse ──────────────── */}
                <div style={{
                    padding: collapsed ? '14px 8px' : '14px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: collapsed ? 'center' : 'stretch',
                    gap: 6,
                }}>
                    {/* Email */}
                    <div style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.5)',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        maxWidth: collapsed ? 0 : 220, opacity: collapsed ? 0 : 1,
                        height: collapsed ? 0 : 16,
                        transition: 'max-width 0.26s, opacity 0.18s, height 0.22s',
                    }}>
                        {client?.email}
                    </div>

                    {/* Sign Out */}
                    <button
                        className="signout-btn"
                        onClick={handleLogout}
                        title="Sign Out"
                        style={{
                            width: collapsed ? 44 : '100%', height: 36, padding: 0,
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 8, color: '#FFFFFF', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: collapsed ? 0 : 7,
                            transition: 'width 0.26s, background 0.15s',
                        }}
                    >
                        <LogOut size={14} />
                        <span style={{
                            maxWidth: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1,
                            overflow: 'hidden', whiteSpace: 'nowrap',
                            transition: 'max-width 0.26s, opacity 0.18s',
                        }}>Sign Out</span>
                    </button>

                    {/* Collapse toggle */}
                    <button
                        className="collapse-btn"
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Expand' : 'Collapse'}
                        style={{
                            width: collapsed ? 44 : '100%', height: 30, padding: 0,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8, color: 'rgba(255,255,255,0.55)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: collapsed ? 0 : 7,
                            fontSize: 11, fontWeight: 600,
                            transition: 'width 0.26s, background 0.15s',
                        }}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        <span style={{
                            maxWidth: collapsed ? 0 : 80, opacity: collapsed ? 0 : 1,
                            overflow: 'hidden', whiteSpace: 'nowrap',
                            transition: 'max-width 0.26s, opacity 0.18s',
                        }}>Collapse</span>
                    </button>
                </div>
            </div>

            {/* ── Main area ──────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Top bar */}
                <div style={{
                    height: 56, background: 'var(--color-topbar-bg)', backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid var(--color-topbar-border, var(--color-border))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px', zIndex: 15, position: 'sticky', top: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: COLORS.textSecondary, margin: 0, letterSpacing: '-0.01em', fontFamily: "'Varela Round', sans-serif" }}>
                        {baseNavigation.find(n => pathname === n.href || pathname?.startsWith(n.href + '/'))?.name || 'Client Portal'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ThemeToggle />
                        <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: COLORS.success.bg, color: COLORS.success.text,
                            border: `1px solid ${COLORS.success.border}`,
                            padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
                        }}>{client?.plan || 'beta'}</span>
                    </div>
                </div>

                {/* Page content */}
                <div style={{ padding: 32, color: COLORS.textPrimary, flex: 1, transition: 'padding 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
                    <style>{`
                        .page-content-area > div[style*='max-width'],
                        .page-content-area > div[style*='maxWidth'] {
                            margin-left: auto !important;
                            margin-right: auto !important;
                        }
                    `}</style>
                    <div className="page-content-area" style={{ width: '100%' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

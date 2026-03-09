'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clientLogout, getClientMe } from '@/lib/api/clientPortal';
import { LayoutDashboard, FileText, Users, Settings, Zap, LogOut, ChevronLeft, ChevronRight, UsersRound, BarChart2, ListChecks, Activity, Menu, X } from 'lucide-react';
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

function NavTooltip({ label }: { label: string }) {
    return (
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 bg-[var(--color-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg py-1 px-2.5 text-xs font-semibold whitespace-nowrap pointer-events-none shadow-lg z-[200]">
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
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hoveredNav, setHoveredNav] = useState<string | null>(null);

    useEffect(() => {
        getClientMe()
            .then(setClient)
            .catch(() => router.push('/login'))
            .finally(() => setLoading(false));
    }, [router]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        await clientLogout();
        router.push('/login');
    };

    if (loading) return (
        <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
            <div className="w-9 h-9 border-3 border-[var(--color-border)] border-t-primary rounded-full animate-spin" />
        </div>
    );

    const sidebarWidthClass = collapsed ? 'w-[68px]' : 'w-64';

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-[var(--color-background)]">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito:wght@400;500;600;700;800&display=swap');
                .font-heading { font-family: 'Varela Round', sans-serif; }
            `}} />

            {/* Mobile overlays */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Sidebar ────────────────────────────────────────────── */}
            <aside
                className={`
                    fixed md:sticky top-0 h-screen z-40 shrink-0 bg-[#4A6B50] dark:bg-[#141414] text-white flex flex-col shadow-xl transition-all duration-300 ease-in-out
                    ${mobileOpen ? 'left-0 w-64 translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${sidebarWidthClass}
                `}
            >
                {/* ── Logo ─────────────────────────────────────────── */}
                <div className={`p-4 md:p-[18px] border-b border-white/10 flex items-center min-h-[68px] overflow-hidden ${collapsed && !mobileOpen ? 'md:justify-center' : ''}`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shrink-0 shadow-sm">
                            <Zap size={18} className="fill-current text-[#4A6B50] dark:text-[#5D8564]" />
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${collapsed && !mobileOpen ? 'md:max-w-0 md:opacity-0' : 'max-w-[180px] opacity-100 whitespace-nowrap'}`}>
                            <div className="text-sm font-extrabold text-white font-heading">Nebula</div>
                            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-wider">
                                {client?.plan || 'free'} · {client?.role || 'admin'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Nav items ─────────────────────────────────────── */}
                <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
                    {baseNavigation
                        .filter(item => item.roles.includes(client?.role || 'admin'))
                        .map(item => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            return (
                                <div
                                    key={item.name}
                                    className="relative group block"
                                    onMouseEnter={() => collapsed && setHoveredNav(item.name)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                >
                                    <Link
                                        href={item.href}
                                        className={`flex items-center rounded-xl no-underline text-[13px] font-semibold transition-colors duration-150 py-2.5 px-3.5 
                                            ${isActive ? 'text-white bg-white/15 font-bold' : 'text-white/80 hover:bg-white/10'}
                                            ${collapsed && !mobileOpen ? 'md:justify-center px-0 py-3' : 'gap-3 w-full'}
                                        `}
                                    >
                                        <span className="flex items-center shrink-0">{item.icon}</span>
                                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed && !mobileOpen ? 'md:max-w-0 md:opacity-0' : 'max-w-[160px] opacity-100'}`}>
                                            {item.name}
                                        </span>
                                    </Link>
                                    {/* Tooltip when collapsed */}
                                    {collapsed && !mobileOpen && hoveredNav === item.name && <NavTooltip label={item.name} />}
                                </div>
                            );
                        })}
                </nav>

                {/* ── Bottom: user + logout + collapse ──────────────── */}
                <div className={`p-3.5 border-t border-white/10 flex flex-col gap-1.5 ${collapsed && !mobileOpen ? 'md:items-center' : ''}`}>
                    {/* Email */}
                    <div className={`text-[11px] text-white/50 overflow-hidden whitespace-nowrap text-ellipsis transition-all duration-300 ${collapsed && !mobileOpen ? 'md:max-w-0 md:h-0 md:opacity-0' : 'max-w-[220px] h-4 opacity-100'}`}>
                        {client?.email}
                    </div>

                    {/* Sign Out */}
                    <button
                        onClick={handleLogout}
                        title="Sign Out"
                        className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs font-semibold cursor-pointer flex items-center justify-center transition-all duration-200 h-9 p-0
                            ${collapsed && !mobileOpen ? 'md:w-11' : 'w-full gap-2'}
                        `}
                    >
                        <LogOut size={14} />
                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed && !mobileOpen ? 'md:max-w-0 md:opacity-0' : 'max-w-[120px] opacity-100'}`}>
                            Sign Out
                        </span>
                    </button>

                    {/* Collapse toggle (Desktop only) */}
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Expand' : 'Collapse'}
                        className={`hidden md:flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/55 cursor-pointer text-[11px] font-semibold transition-all duration-200 h-7.5 p-0 mt-1
                            ${collapsed ? 'w-11' : 'w-full gap-2'}
                        `}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[80px] opacity-100'}`}>
                            Collapse
                        </span>
                    </button>
                </div>
            </aside>

            {/* ── Main area ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 w-full">
                {/* Top bar */}
                <div className="h-14 bg-[var(--color-topbar-bg)] backdrop-blur-md border-b border-[var(--color-topbar-border,var(--color-border))] flex items-center justify-between px-4 sm:px-6 md:px-8 z-10 sticky top-0 shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-3">
                        {/* Hamburger (Mobile only) */}
                        <button
                            className="p-1.5 -ml-1.5 rounded-lg hover:bg-[var(--color-hover)] md:hidden text-[var(--color-text-secondary)]"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Menu size={20} />
                        </button>

                        <h2 className="text-sm font-bold text-[var(--color-text-secondary)] m-0 tracking-tight font-heading truncate max-w-[150px] sm:max-w-none">
                            {baseNavigation.find(n => pathname === n.href || pathname?.startsWith(n.href + '/'))?.name || 'Client Portal'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <span className="hidden sm:inline-block text-[10px] font-bold bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)] py-1 px-2.5 rounded-full uppercase truncate max-w-[100px]">
                            {client?.plan || 'beta'}
                        </span>
                    </div>
                </div>

                {/* Page content */}
                <div className="p-4 sm:p-6 md:p-8 text-[var(--color-text-primary)] flex-1 transition-all duration-300 w-full overflow-x-hidden">
                    <div className="w-full mx-auto max-w-7xl">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

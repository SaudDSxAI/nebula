'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import ProtectedRoute from './ProtectedRoute';
import { useState, useEffect } from 'react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'Clients',
    href: '/admin/clients',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    name: 'Activity Log',
    href: '/admin/activity',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans pb-[70px] md:pb-0">
        
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)] border-t border-gray-200 flex items-center overflow-x-auto no-scrollbar pb-[env(safe-area-inset-bottom)]">
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
            <div className="flex w-full px-2 py-2 gap-1 items-center justify-between">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center p-2 min-w-[68px] rounded-xl transition-all duration-200 flex-shrink-0
                                ${isActive ? 'bg-[var(--color-primary-alpha)] text-primary scale-105' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                            `}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`mb-1 transition-transform duration-200 ${isActive ? 'scale-110 stroke-primary' : 'stroke-current'}`}>
                                <path d={item.icon} />
                            </svg>
                            <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>

        {/* Sidebar */}
        <aside className={`
          hidden md:flex sticky top-0 h-screen z-40 shrink-0 bg-white border-r border-gray-200 flex-col w-64 transition-transform duration-300 ease-in-out
        `}>
          {/* Logo */}
          <div className="flex items-center h-16 px-5 border-b border-gray-200 gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 m-0 leading-tight">TRM Platform</h1>
              <p className="text-xs text-gray-400 m-0">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
              Menu
            </p>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-xl no-underline text-sm transition-all duration-150
                    ${isActive
                      ? 'font-semibold text-primary bg-[var(--color-primary-alpha)]'
                      : 'font-medium text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 shrink-0">
                    <path d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info at Bottom */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 m-0 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-400 m-0 truncate">
                  {user?.email || 'admin@trm.com'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
            {/* Mobile Title (Replaces hamburger) */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-[15px] font-bold text-gray-900 m-0 tracking-tight">
                {navigation.find(n => pathname === n.href || pathname?.startsWith(n.href + '/'))?.name || 'Admin'}
              </h2>
            </div>

            <div className="hidden md:block flex-1"></div>

            <button
              onClick={logout}
              title="Sign Out"
              className="inline-flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:gap-1.5 md:px-4 md:py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

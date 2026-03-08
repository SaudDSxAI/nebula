'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { COLORS } from '@/lib/theme';
import { ThemeToggle } from '@/components/client/ThemeToggle';

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Features', href: '/#features' },
        { name: 'Job Board', href: '/jobs' },
        { name: 'Pricing', href: '/#pricing' },
    ];

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            transition: 'all 0.3s ease',
            background: isScrolled ? 'var(--color-topbar-bg)' : 'transparent',
            backdropFilter: isScrolled ? 'blur(12px)' : 'none',
            borderBottom: isScrolled ? `1px solid ${COLORS.border}` : '1px solid transparent',
            padding: isScrolled ? '12px 0' : '20px 0',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Logo />

                {/* Desktop Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            style={{
                                color: COLORS.textSecondary,
                                fontWeight: 500,
                                fontSize: 14,
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                                letterSpacing: '0.01em',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textSecondary}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}` }}>
                        <ThemeToggle />
                        <Link
                            href="/client/login"
                            style={{
                                color: COLORS.textSecondary,
                                fontWeight: 600,
                                fontSize: 14,
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textSecondary}
                        >
                            Sign In
                        </Link>
                        <Button size="sm" onClick={() => window.location.href = '/client/signup'}>
                            Get Started
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: COLORS.textSecondary, padding: 4,
                        }}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--color-card)',
                    borderBottom: `1px solid ${COLORS.border}`,
                    boxShadow: '0 12px 24px rgba(0,0,0,0.06)',
                    padding: '24px',
                }} className="md:hidden">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                style={{
                                    color: COLORS.textSecondary,
                                    fontWeight: 600,
                                    fontSize: 16,
                                    textDecoration: 'none',
                                }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div style={{ paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <ThemeToggle />
                            <Link
                                href="/client/login"
                                style={{
                                    display: 'block', textAlign: 'center',
                                    color: COLORS.textSecondary, fontWeight: 600, fontSize: 15,
                                    padding: '8px 0', textDecoration: 'none',
                                }}
                            >
                                Sign In
                            </Link>
                            <Button fullWidth onClick={() => window.location.href = '/client/signup'}>
                                Get Started
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}

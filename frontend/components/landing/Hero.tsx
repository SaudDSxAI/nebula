'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, PlayCircle, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '../shared/Button';
import { COLORS } from '@/lib/theme';

export function Hero() {
    return (
        <section style={{
            position: 'relative',
            paddingTop: 'clamp(120px, 15vw, 180px)',
            paddingBottom: 'clamp(80px, 10vw, 120px)',
            overflow: 'hidden',
        }}>
            {/* Background Elements */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', top: '15%', left: '20%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(2, 116, 189, 0.06) 0%, transparent 70%)`,
                    animation: 'float 6s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', top: '20%', right: '15%',
                    width: 400, height: 400, borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(196, 173, 141, 0.08) 0%, transparent 70%)`,
                    animation: 'float 6s ease-in-out infinite',
                    animationDelay: '2s',
                }} />
                <div style={{
                    position: 'absolute', bottom: '10%', left: '40%',
                    width: 300, height: 300, borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(245, 114, 81, 0.05) 0%, transparent 70%)`,
                    animation: 'float 6s ease-in-out infinite',
                    animationDelay: '4s',
                }} />
            </div>

            <div style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1200, margin: '0 auto', padding: '0 24px',
                textAlign: 'center',
            }}>
                {/* Badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 16px', borderRadius: 100,
                    background: `${COLORS.primary}10`,
                    border: `1px solid ${COLORS.primary}20`,
                    fontSize: 13, fontWeight: 600, color: COLORS.primary,
                    marginBottom: 32,
                    animation: 'fadeInUp 0.5s ease-out',
                }}>
                    <Sparkles size={14} />
                    Nebula v1.0 Now Live
                </div>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(36px, 6vw, 68px)',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    color: COLORS.textPrimary,
                    marginBottom: 24,
                    animation: 'fadeInUp 0.5s ease-out',
                    animationDelay: '0.1s',
                    animationFillMode: 'both',
                }}>
                    Recruiting Logic,{' '}
                    <br className="hidden md:block" />
                    <span style={{ color: COLORS.primary }}>Reimagined by AI</span>
                </h1>

                {/* Subtitle */}
                <p style={{
                    maxWidth: 640, margin: '0 auto',
                    fontSize: 'clamp(16px, 2vw, 19px)',
                    color: COLORS.textSecondary,
                    lineHeight: 1.7,
                    marginBottom: 40,
                    animation: 'fadeInUp 0.5s ease-out',
                    animationDelay: '0.2s',
                    animationFillMode: 'both',
                }}>
                    Automate screening, engage candidates instantly, and make data-driven hiring decisions with the world's first AI-native recruitment platform.
                </p>

                {/* CTAs */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap',
                    alignItems: 'center', justifyContent: 'center', gap: 16,
                    marginBottom: 48,
                    animation: 'fadeInUp 0.5s ease-out',
                    animationDelay: '0.3s',
                    animationFillMode: 'both',
                }}>
                    <Link href="/client/signup">
                        <Button size="lg" icon={ArrowRight}>
                            Start Hiring Now
                        </Button>
                    </Link>
                    <Link href="#demo">
                        <Button variant="white" size="lg" icon={PlayCircle}>
                            Watch Demo
                        </Button>
                    </Link>
                </div>

                {/* Trust Indicators */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap',
                    alignItems: 'center', justifyContent: 'center', gap: 24,
                    marginBottom: 64,
                    animation: 'fadeInUp 0.5s ease-out',
                    animationDelay: '0.35s',
                    animationFillMode: 'both',
                }}>
                    {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map((text) => (
                        <span key={text} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, color: COLORS.textTertiary, fontWeight: 500,
                        }}>
                            <CheckCircle size={14} style={{ color: COLORS.primary }} />
                            {text}
                        </span>
                    ))}
                </div>

                {/* Dashboard Preview */}
                <DashboardPreview />
            </div>

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </section>
    );
}


function DashboardPreview() {
    const [hovered, setHovered] = useState(false);

    const sidebarNav = [
        { label: 'Dashboard', active: true },
        { label: 'Requirements', active: false },
        { label: 'Candidates', active: false },
        { label: 'Company', active: false },
        { label: 'Settings', active: false },
    ];

    const stats = [
        { label: 'TOTAL CANDIDATES', value: '1,247', color: COLORS.primary },
        { label: 'ACTIVE JOBS', value: '18', color: COLORS.accent },
        { label: 'OPEN POSITIONS', value: '34', color: COLORS.secondary },
        { label: 'POSITIONS FILLED', value: '12', color: COLORS.primary },
    ];

    // Bar chart data (mock)
    const barData = [
        { label: 'Senior React Dev', pct: 92 },
        { label: 'AI Engineer', pct: 78 },
        { label: 'QA Engineer', pct: 65 },
        { label: 'DevOps Lead', pct: 52 },
        { label: 'Product Manager', pct: 40 },
    ];

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                maxWidth: 960, margin: '0 auto',
                background: COLORS.background,
                borderRadius: 16,
                border: `1px solid ${COLORS.border}`,
                boxShadow: hovered
                    ? '0 24px 48px rgba(0,0,0,0.12)'
                    : '0 12px 32px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                animation: 'fadeInUp 0.5s ease-out',
                animationDelay: '0.4s',
                animationFillMode: 'both',
            }}
        >
            {/* Window Chrome */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: '#FFFFFF',
                borderBottom: `1px solid ${COLORS.border}`,
            }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F57251' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#C4AD8D' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34D399' }} />
                <div style={{
                    flex: 1, marginLeft: 12,
                    padding: '5px 12px', borderRadius: 6,
                    background: COLORS.background, border: `1px solid ${COLORS.border}`,
                    fontSize: 11, color: COLORS.textMuted, textAlign: 'center',
                    fontFamily: 'monospace',
                }}>
                    app.nebula.com/client/dashboard
                </div>
            </div>

            {/* Dashboard Layout */}
            <div style={{ display: 'flex', minHeight: 380 }}>
                {/* Sidebar */}
                <div style={{
                    width: 200, flexShrink: 0,
                    background: COLORS.primary,
                    padding: '20px 12px',
                    display: 'flex', flexDirection: 'column',
                }}>
                    {/* Logo area */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', marginBottom: 20,
                    }}>
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={COLORS.primary} stroke={COLORS.primary} strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>Acme Corp</div>
                            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRO PLAN</div>
                        </div>
                    </div>

                    {/* Nav Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sidebarNav.map((item) => (
                            <div key={item.label} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10,
                                background: item.active ? '#FFFFFF' : 'transparent',
                                color: item.active ? COLORS.primary : 'rgba(255,255,255,0.8)',
                                fontSize: 13, fontWeight: item.active ? 600 : 500,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{
                                    width: 16, height: 16, borderRadius: 4,
                                    background: item.active ? `${COLORS.primary}15` : 'rgba(255,255,255,0.2)',
                                }} />
                                {item.label}
                            </div>
                        ))}
                    </div>

                    {/* Logout at bottom */}
                    <div style={{ marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500,
                        }}>
                            <div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
                            Logout
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
                    {/* Page Header */}
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary, letterSpacing: '-0.02em' }}>
                            Dashboard — Acme Corp
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                            Recruitment analytics & pipeline overview
                        </div>
                    </div>

                    {/* 4 Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {stats.map((stat) => (
                            <div key={stat.label} style={{
                                background: '#FFFFFF', borderRadius: 12,
                                border: `1px solid ${COLORS.border}`,
                                padding: '14px 16px',
                            }}>
                                <div style={{
                                    fontSize: 9, fontWeight: 700, color: COLORS.textTertiary,
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                    marginBottom: 6,
                                }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.textPrimary, lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, flex: 1 }}>
                        {/* Bar Chart Card */}
                        <div style={{
                            background: '#FFFFFF', borderRadius: 14,
                            border: `1px solid ${COLORS.border}`,
                            padding: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                                <div style={{
                                    width: 16, height: 16, borderRadius: 4,
                                    background: `${COLORS.primary}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.primary }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textPrimary }}>
                                    Top Requirements
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {barData.map((bar) => (
                                    <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 100, fontSize: 10, fontWeight: 600, color: COLORS.textSecondary,
                                            textAlign: 'right', flexShrink: 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {bar.label}
                                        </div>
                                        <div style={{
                                            flex: 1, height: 14, borderRadius: 4,
                                            background: COLORS.background,
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${bar.pct}%`, height: '100%',
                                                borderRadius: 4,
                                                background: COLORS.textPrimary,
                                                transition: 'width 1s ease',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, width: 20, textAlign: 'right' }}>
                                            {bar.pct}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Gauge / Donut Card */}
                        <div style={{
                            background: '#FFFFFF', borderRadius: 14,
                            border: `1px solid ${COLORS.border}`,
                            padding: 16,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' }}>
                                Fill Rate
                            </div>

                            {/* SVG Donut */}
                            <div style={{ position: 'relative', width: 100, height: 100 }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={COLORS.background} strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={COLORS.textPrimary} strokeWidth="3"
                                        strokeDasharray="97.4" strokeDashoffset={97.4 * (1 - 0.67)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary }}>67%</span>
                                    <span style={{ fontSize: 8, fontWeight: 600, color: COLORS.textMuted }}>filled</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.textPrimary }} />
                                    <span style={{ fontSize: 9, color: COLORS.textSecondary }}>Filled</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.background }} />
                                    <span style={{ fontSize: 9, color: COLORS.textSecondary }}>Open</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

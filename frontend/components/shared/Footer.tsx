'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin, Zap } from 'lucide-react';
import { COLORS } from '@/lib/theme';

export function Footer() {
    const footerSections = [
        {
            title: 'Product',
            links: ['Features', 'Pricing', 'API', 'Integrations'],
        },
        {
            title: 'Company',
            links: ['About', 'Blog', 'Careers', 'Contact'],
        },
        {
            title: 'Legal',
            links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
        },
    ];

    const socialIcons = [
        { icon: Github, label: 'GitHub' },
        { icon: Twitter, label: 'Twitter' },
        { icon: Linkedin, label: 'LinkedIn' },
    ];

    return (
        <footer style={{
            background: COLORS.textPrimary,
            color: '#FFFFFF',
            padding: 'clamp(48px, 6vw, 80px) 0 0',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 40,
                }}>
                    {/* Brand Column */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: COLORS.primary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Zap size={20} fill="#FFFFFF" color="#FFFFFF" />
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
                                Nebula
                            </span>
                        </div>
                        <p style={{
                            fontSize: 14, color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.7, marginBottom: 20, maxWidth: 280,
                        }}>
                            AI-powered recruitment platform for modern hiring teams. Built for speed, accuracy, and enterprise scale.
                        </p>
                        <div style={{ display: 'flex', gap: 16 }}>
                            {socialIcons.map(({ icon: Icon, label }) => (
                                <Link
                                    key={label}
                                    href="#"
                                    aria-label={label}
                                    style={{
                                        color: 'rgba(255,255,255,0.4)',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                                >
                                    <Icon size={18} />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Link Columns */}
                    {footerSections.map((section) => (
                        <div key={section.title}>
                            <h3 style={{
                                fontSize: 13, fontWeight: 700,
                                color: '#FFFFFF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: 16,
                            }}>
                                {section.title}
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {section.links.map((link) => (
                                    <li key={link} style={{ marginBottom: 10 }}>
                                        <Link
                                            href="#"
                                            style={{
                                                fontSize: 14,
                                                color: 'rgba(255,255,255,0.45)',
                                                textDecoration: 'none',
                                                transition: 'color 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                                        >
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div style={{
                    marginTop: 48,
                    paddingTop: 24, paddingBottom: 24,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', flexWrap: 'wrap',
                    justifyContent: 'space-between', alignItems: 'center',
                    gap: 16,
                }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                        &copy; {new Date().getFullYear()} Nebula Inc. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', gap: 24 }}>
                        {['Sitemap', 'Status'].map((item) => (
                            <Link
                                key={item}
                                href="#"
                                style={{
                                    fontSize: 13, color: 'rgba(255,255,255,0.35)',
                                    textDecoration: 'none', transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

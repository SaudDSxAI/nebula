'use client';

import { useState } from 'react';
import { FileText, Users, MessageSquare, Zap, Shield, BarChart3, LucideIcon } from 'lucide-react';
import { COLORS } from '@/lib/theme';

const features: { title: string; desc: string; icon: LucideIcon; color: string; bg: string }[] = [
    {
        title: 'AI Resume Parsing',
        desc: 'Extract and standardize candidate data from thousands of CVs in seconds with 95% accuracy.',
        icon: FileText,
        color: COLORS.primary,
        bg: `${COLORS.primary}12`,
    },
    {
        title: 'Smart Matching',
        desc: 'AI matching engine ranks candidates by skills, experience, and cultural fit with 90% precision.',
        icon: Zap,
        color: COLORS.accent,
        bg: `${COLORS.accent}12`,
    },
    {
        title: 'Automated Outreach',
        desc: 'Engage passive candidates with personalized AI-generated sequences that achieve 3x higher reply rates.',
        icon: MessageSquare,
        color: COLORS.primary,
        bg: `${COLORS.primary}12`,
    },
    {
        title: 'Talent Pool Analytics',
        desc: 'Visualize your pipeline health and forecast hiring needs with real-time predictive analytics.',
        icon: BarChart3,
        color: COLORS.accent,
        bg: `${COLORS.accent}12`,
    },
    {
        title: 'Collaborative Hiring',
        desc: 'Share candidate profiles, gather feedback, and streamline decision-making with your team in one place.',
        icon: Users,
        color: COLORS.primary,
        bg: `${COLORS.primary}12`,
    },
    {
        title: 'Enterprise Security',
        desc: 'SOC2 compliant platform with role-based access control and full data encryption at rest.',
        icon: Shield,
        color: COLORS.accent,
        bg: `${COLORS.accent}12`,
    },
];

export function Features() {
    return (
        <section id="features" style={{
            padding: 'clamp(60px, 8vw, 96px) 0',
            background: '#FFFFFF',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                {/* Section Header */}
                <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 64px' }}>
                    <span style={{
                        display: 'inline-block',
                        fontSize: 13, fontWeight: 700,
                        color: COLORS.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 12,
                    }}>
                        Features
                    </span>
                    <h2 style={{
                        fontSize: 'clamp(28px, 4vw, 40px)',
                        fontWeight: 800,
                        color: COLORS.textPrimary,
                        letterSpacing: '-0.02em',
                        marginBottom: 16,
                    }}>
                        Why Choose Nebula?
                    </h2>
                    <p style={{
                        fontSize: 17, color: COLORS.textSecondary, lineHeight: 1.7,
                    }}>
                        Combine traditional ATS features with cutting-edge AI to speed up your hiring by 10x.
                    </p>
                </div>

                {/* Feature Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 20,
                }}>
                    {features.map((feature, i) => (
                        <FeatureCard key={i} feature={feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}


function FeatureCard({ feature }: { feature: typeof features[0] }) {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#FFFFFF',
                borderRadius: 14,
                padding: 28,
                border: `1px solid ${hovered ? `${feature.color}30` : COLORS.border}`,
                boxShadow: hovered
                    ? `0 12px 28px rgba(0,0,0,0.06)`
                    : '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.3s ease',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                cursor: 'default',
            }}
        >
            <div style={{
                width: 48, height: 48, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: feature.bg,
                color: feature.color,
                marginBottom: 20,
                transition: 'transform 0.3s',
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}>
                <feature.icon size={22} />
            </div>
            <h3 style={{
                fontSize: 18, fontWeight: 700,
                color: COLORS.textPrimary,
                marginBottom: 10,
                transition: 'color 0.2s',
            }}>
                {feature.title}
            </h3>
            <p style={{
                fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.7,
            }}>
                {feature.desc}
            </p>
        </div>
    );
}

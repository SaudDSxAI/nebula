'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Building2, Calendar, DollarSign, Globe } from 'lucide-react';
import { COLORS } from '@/lib/theme';

export interface Job {
    id: number;
    job_title: string;
    company_name: string;
    location: string | null;
    remote_type: string;
    salary_range: string | null;
    created_at: string;
}

interface JobCardProps {
    job: Job;
}

export function JobCard({ job }: JobCardProps) {
    const [hovered, setHovered] = useState(false);

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    const getRemoteBadge = (type: string) => {
        switch (type.toLowerCase()) {
            case 'remote':
                return {
                    label: 'Remote', icon: Globe,
                    bg: `${COLORS.primary}12`, color: COLORS.primary,
                };
            case 'hybrid':
                return {
                    label: 'Hybrid', icon: Building2,
                    bg: `${COLORS.accent}12`, color: COLORS.accent,
                };
            default:
                return {
                    label: 'On-site', icon: MapPin,
                    bg: `${COLORS.secondary}30`, color: COLORS.textSecondary,
                };
        }
    };

    const remote = getRemoteBadge(job.remote_type);
    const RemoteIcon = remote.icon;

    return (
        <Link href={`/jobs/${job.id}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: `1px solid ${hovered ? `${COLORS.primary}30` : COLORS.border}`,
                    padding: '20px 24px',
                    transition: 'all 0.3s ease',
                    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: hovered
                        ? '0 8px 24px rgba(0,0,0,0.06)'
                        : '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16,
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Company Initial */}
                    <div style={{
                        width: 48, height: 48, borderRadius: 10,
                        background: COLORS.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700, color: '#FFFFFF',
                        flexShrink: 0,
                    }}>
                        {job.company_name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <h3 style={{
                            fontSize: 16, fontWeight: 700,
                            color: hovered ? COLORS.primary : COLORS.textPrimary,
                            transition: 'color 0.2s',
                            marginBottom: 4,
                        }}>
                            {job.job_title}
                        </h3>
                        <p style={{
                            fontSize: 13, color: COLORS.textSecondary, fontWeight: 500,
                            marginBottom: 10,
                        }}>
                            {job.company_name}
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                            {/* Remote Badge */}
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 100,
                                background: remote.bg, color: remote.color,
                                fontSize: 11, fontWeight: 600,
                            }}>
                                <RemoteIcon size={11} />
                                {remote.label}
                            </span>

                            {job.location && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    fontSize: 12, color: COLORS.textTertiary,
                                }}>
                                    <MapPin size={12} />
                                    {job.location}
                                </span>
                            )}

                            {job.salary_range && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    fontSize: 12, color: COLORS.textPrimary, fontWeight: 600,
                                }}>
                                    <DollarSign size={12} style={{ color: COLORS.textTertiary }} />
                                    {job.salary_range}
                                </span>
                            )}

                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 11, color: COLORS.textMuted,
                            }}>
                                <Calendar size={11} />
                                {timeAgo(job.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* View Button */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8,
                    border: `1px solid ${hovered ? COLORS.primary : COLORS.border}`,
                    background: hovered ? `${COLORS.primary}08` : 'transparent',
                    color: hovered ? COLORS.primary : COLORS.textSecondary,
                    fontSize: 13, fontWeight: 600,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                }}>
                    View Job
                    <ArrowRight size={14} style={{
                        transition: 'transform 0.2s',
                        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                    }} />
                </div>
            </div>
        </Link>
    );
}

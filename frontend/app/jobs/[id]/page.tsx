'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Building2, Globe, DollarSign, BarChart3, Clock, Clipboard, CheckCircle, Star, Gift, Share2, Briefcase, Zap } from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface JobDetail {
    id: number;
    job_title: string;
    company_name: string;
    location: string | null;
    remote_type: string;
    salary_range: string | null;
    created_at: string;
    job_description: string;
    required_skills: string | null;
    preferred_skills: string | null;
    experience_level: string | null;
    benefits: string | null;
    deadline: string | null;
}

import { API_BASE_URL } from '@/lib/api/base';

export default function JobDetailPage() {
    const params = useParams();
    const jobId = params.id;
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadJob = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/public/jobs/${jobId}`);
                if (!res.ok) throw new Error('Job not found');
                const data = await res.json();
                setJob(data);
            } catch (err) {
                setError('This job posting is no longer available.');
            } finally {
                setLoading(false);
            }
        };
        if (jobId) loadJob();
    }, [jobId]);

    const getRemoteBadge = (type: string) => {
        switch (type.toLowerCase()) {
            case 'remote':
                return { label: 'Remote', icon: Globe, bg: `${COLORS.primary}12`, color: COLORS.primary };
            case 'hybrid':
                return { label: 'Hybrid', icon: Building2, bg: `${COLORS.accent}12`, color: COLORS.accent };
            default:
                return { label: 'On-site', icon: MapPin, bg: `${COLORS.secondary}30`, color: COLORS.textSecondary };
        }
    };

    const parseSkills = (skills: string | null) => {
        if (!skills) return [];
        return skills.split(',').map(s => s.trim()).filter(Boolean);
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: COLORS.background, fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40,
                        border: `3px solid ${COLORS.border}`,
                        borderTop: `3px solid ${COLORS.primary}`,
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 16px',
                    }} />
                    <p style={{ color: COLORS.textSecondary }}>Loading job details...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: COLORS.background, fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ color: COLORS.textMuted, marginBottom: 16 }}>
                        <Briefcase size={64} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                        Job Not Found
                    </h2>
                    <p style={{ color: COLORS.textSecondary, marginBottom: 24 }}>{error}</p>
                    <Link href="/jobs" style={{
                        padding: '12px 24px', background: COLORS.primary, color: '#fff',
                        borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 15,
                        display: 'inline-block',
                    }}>
                        Browse All Jobs
                    </Link>
                </div>
            </div>
        );
    }

    const remote = getRemoteBadge(job.remote_type);
    const RemoteIcon = remote.icon;
    const requiredSkills = parseSkills(job.required_skills);
    const preferredSkills = parseSkills(job.preferred_skills);

    return (
        <div style={{
            minHeight: '100vh', background: COLORS.background,
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Navigation */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
                zIndex: 50, borderBottom: `1px solid ${COLORS.border}`, height: 64,
            }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto', padding: '0 24px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%',
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{
                            width: 36, height: 36, background: COLORS.primary, borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#FFFFFF',
                        }}>
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary }}>Nebula</span>
                    </Link>
                    <Link href="/jobs" style={{
                        color: COLORS.primary, fontWeight: 600, textDecoration: 'none', fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <ArrowLeft size={16} /> All Jobs
                    </Link>
                </div>
            </nav>

            {/* Job Header */}
            <section style={{
                paddingTop: 104, paddingBottom: 0, paddingLeft: 24, paddingRight: 24,
                background: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}`,
            }}>
                <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
                        {/* Company Avatar */}
                        <div style={{
                            width: 64, height: 64, borderRadius: 14,
                            background: COLORS.primary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0,
                        }}>
                            {job.company_name.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h1 style={{
                                fontSize: 32, fontWeight: 800, color: COLORS.textPrimary,
                                margin: '0 0 4px', lineHeight: 1.2,
                            }}>
                                {job.job_title}
                            </h1>
                            <p style={{ fontSize: 18, color: COLORS.textSecondary, margin: 0 }}>
                                {job.company_name}
                            </p>
                        </div>
                    </div>

                    {/* Meta Tags */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
                        {job.location && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
                                color: COLORS.textSecondary, padding: '8px 14px',
                                background: COLORS.background, borderRadius: 8,
                                border: `1px solid ${COLORS.border}`,
                            }}>
                                <MapPin size={14} style={{ color: COLORS.textTertiary }} />
                                {job.location}
                            </span>
                        )}
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 8,
                            background: remote.bg, color: remote.color,
                        }}>
                            <RemoteIcon size={14} />
                            {remote.label}
                        </span>
                        {job.salary_range && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 14, color: COLORS.primary, fontWeight: 600,
                                padding: '8px 14px', background: `${COLORS.primary}10`, borderRadius: 8,
                            }}>
                                <DollarSign size={14} />
                                {job.salary_range}
                            </span>
                        )}
                        {job.experience_level && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: 14, color: COLORS.textSecondary,
                                padding: '8px 14px', background: COLORS.background, borderRadius: 8,
                                border: `1px solid ${COLORS.border}`,
                            }}>
                                <BarChart3 size={14} style={{ color: COLORS.textTertiary }} />
                                {job.experience_level}
                            </span>
                        )}
                        <span style={{ fontSize: 13, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} />
                            Posted {new Date(job.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Apply CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <Link href={`/apply/${job.id}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                                padding: '14px 36px', background: COLORS.primary, color: '#fff',
                                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 16,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                                boxShadow: '0 4px 14px rgba(2, 116, 189, 0.3)',
                                transition: 'all 0.2s',
                            }}>
                                Apply Now
                                <ArrowRight size={18} />
                            </button>
                        </Link>
                        {job.deadline && (
                            <span style={{
                                fontSize: 13, color: COLORS.accent, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <Clock size={14} />
                                Deadline: {new Date(job.deadline).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* Job Content */}
            <section style={{ padding: '40px 24px 80px' }}>
                <div style={{
                    maxWidth: 900, margin: '0 auto',
                    display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40,
                }}>
                    {/* Main Content */}
                    <div>
                        {/* Description */}
                        <SectionBlock icon={<Clipboard size={18} />} title="Job Description">
                            <div style={{
                                fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.8,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {job.job_description}
                            </div>
                        </SectionBlock>

                        {/* Required Skills */}
                        {requiredSkills.length > 0 && (
                            <SectionBlock icon={<CheckCircle size={18} />} title="Required Skills">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {requiredSkills.map((skill, i) => (
                                        <span key={i} style={{
                                            padding: '6px 14px',
                                            background: `${COLORS.primary}10`,
                                            color: COLORS.primary,
                                            borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </SectionBlock>
                        )}

                        {/* Preferred Skills */}
                        {preferredSkills.length > 0 && (
                            <SectionBlock icon={<Star size={18} />} title="Preferred Skills">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {preferredSkills.map((skill, i) => (
                                        <span key={i} style={{
                                            padding: '6px 14px',
                                            background: `${COLORS.accent}12`,
                                            color: COLORS.accent,
                                            borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </SectionBlock>
                        )}

                        {/* Benefits */}
                        {job.benefits && (
                            <SectionBlock icon={<Gift size={18} />} title="Benefits">
                                <div style={{
                                    fontSize: 15, color: COLORS.textSecondary,
                                    lineHeight: 1.8, whiteSpace: 'pre-wrap',
                                }}>
                                    {job.benefits}
                                </div>
                            </SectionBlock>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div>
                        <div style={{
                            position: 'sticky', top: 88,
                            background: '#FFFFFF',
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: 14, padding: 24,
                            display: 'flex', flexDirection: 'column', gap: 20,
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                                Job Overview
                            </h3>

                            {[
                                { icon: <Building2 size={16} />, label: 'Company', value: job.company_name },
                                job.location ? { icon: <MapPin size={16} />, label: 'Location', value: job.location } : null,
                                { icon: <Briefcase size={16} />, label: 'Work Type', value: job.remote_type.charAt(0).toUpperCase() + job.remote_type.slice(1) },
                                job.salary_range ? { icon: <DollarSign size={16} />, label: 'Salary', value: job.salary_range } : null,
                                job.experience_level ? { icon: <BarChart3 size={16} />, label: 'Experience', value: job.experience_level } : null,
                                job.deadline ? { icon: <Clock size={16} />, label: 'Deadline', value: new Date(job.deadline).toLocaleDateString() } : null,
                            ].filter(Boolean).map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 8,
                                        background: COLORS.background,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: COLORS.textTertiary, flexShrink: 0,
                                    }}>
                                        {item!.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 500 }}>{item!.label}</div>
                                        <div style={{ fontSize: 14, color: COLORS.textPrimary, fontWeight: 600 }}>{item!.value}</div>
                                    </div>
                                </div>
                            ))}

                            {/* Apply Button */}
                            <Link href={`/apply/${job.id}`} style={{ textDecoration: 'none', width: '100%' }}>
                                <button style={{
                                    width: '100%', padding: 14, background: COLORS.primary, color: '#fff',
                                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15,
                                    cursor: 'pointer', transition: 'background 0.2s',
                                    boxShadow: '0 4px 14px rgba(2, 116, 189, 0.25)',
                                }}>
                                    Apply for this Job
                                </button>
                            </Link>

                            {/* Share */}
                            <button
                                onClick={() => navigator.clipboard.writeText(window.location.href)}
                                style={{
                                    width: '100%', padding: 12, background: 'transparent',
                                    color: COLORS.textSecondary,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: 10, fontWeight: 500, fontSize: 14,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                <Share2 size={16} />
                                Share this Job
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                background: COLORS.textPrimary, color: 'rgba(255,255,255,0.45)',
                padding: '40px 24px', textAlign: 'center', fontSize: 14,
            }}>
                <p>&copy; {new Date().getFullYear()} Nebula Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}


function SectionBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div style={{
            marginBottom: 32,
            background: '#FFFFFF',
            borderRadius: 14, padding: 24,
            border: `1px solid ${COLORS.border}`,
        }}>
            <h2 style={{
                fontSize: 18, fontWeight: 700, color: COLORS.textPrimary,
                marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ color: COLORS.textTertiary }}>{icon}</span>
                {title}
            </h2>
            {children}
        </div>
    );
}

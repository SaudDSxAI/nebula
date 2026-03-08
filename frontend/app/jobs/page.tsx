'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { JobCard, Job } from '@/components/jobs/JobCard';
import { Search, Monitor, Briefcase } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { COLORS } from '@/lib/theme';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function JobBoardPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [location, setLocationFilter] = useState('');
    const [remoteType, setRemoteType] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const loadJobs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (location) params.set('location', location);
            if (remoteType) params.set('remote_type', remoteType);
            const res = await fetch(`${API}/api/public/jobs?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch jobs');
            const data = await res.json();
            setJobs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load jobs:', err);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, remoteType]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 16px 12px 42px',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        background: COLORS.background,
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: 500,
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box' as const,
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: COLORS.background,
            fontFamily: "'Inter', sans-serif",
            display: 'flex', flexDirection: 'column',
        }}>
            <Navbar />

            <main style={{ flexGrow: 1, paddingTop: 80 }}>
                {/* Hero Section */}
                <section style={{
                    background: '#FFFFFF',
                    borderBottom: `1px solid ${COLORS.border}`,
                    padding: '64px 24px 72px',
                    textAlign: 'center',
                }}>
                    <div style={{ maxWidth: 800, margin: '0 auto' }}>
                        {/* Badge */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 14px', borderRadius: 100,
                            background: `${COLORS.primary}10`,
                            border: `1px solid ${COLORS.primary}20`,
                            fontSize: 12, fontWeight: 600, color: COLORS.primary,
                            marginBottom: 24,
                        }}>
                            <Briefcase size={13} />
                            {loading ? 'Loading...' : `${jobs.length} Open Positions`}
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(32px, 5vw, 48px)',
                            fontWeight: 800,
                            color: COLORS.textPrimary,
                            letterSpacing: '-0.03em',
                            marginBottom: 16,
                            lineHeight: 1.15,
                        }}>
                            Find Your Next{' '}
                            <span style={{ color: COLORS.primary }}>Dream Role</span>
                        </h1>

                        <p style={{
                            fontSize: 17, color: COLORS.textSecondary,
                            lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px',
                        }}>
                            Browse open positions from top companies. Our AI-powered matching ensures you find the perfect fit for your skills and career goals.
                        </p>

                        {/* Search Bar */}
                        <div style={{
                            maxWidth: 720, margin: '0 auto',
                            background: '#FFFFFF',
                            borderRadius: 16,
                            border: `1px solid ${COLORS.border}`,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                            padding: 12,
                        }}>
                            <form onSubmit={handleSearch} style={{
                                display: 'flex', flexWrap: 'wrap', gap: 12,
                                alignItems: 'center',
                            }}>
                                <div style={{ flex: '1 1 240px', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: COLORS.textMuted, pointerEvents: 'none',
                                    }}>
                                        <Search size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Job title, skills, or keywords..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        style={inputStyle}
                                        onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.background = '#FFFFFF'; }}
                                        onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.background; }}
                                    />
                                </div>

                                <div style={{ flex: '0 0 180px', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: COLORS.textMuted, pointerEvents: 'none',
                                    }}>
                                        <Monitor size={16} />
                                    </div>
                                    <select
                                        value={remoteType}
                                        onChange={(e) => setRemoteType(e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            appearance: 'none' as const,
                                            cursor: 'pointer',
                                            paddingRight: 36,
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = COLORS.primary; e.target.style.background = '#FFFFFF'; }}
                                        onBlur={(e) => { e.target.style.borderColor = COLORS.border; e.target.style.background = COLORS.background; }}
                                    >
                                        <option value="">All Types</option>
                                        <option value="remote">Remote</option>
                                        <option value="hybrid">Hybrid</option>
                                        <option value="onsite">On-site</option>
                                    </select>
                                    <div style={{
                                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: COLORS.textMuted, pointerEvents: 'none',
                                    }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>
                                </div>

                                <Button type="submit" size="md">
                                    Search Jobs
                                </Button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Job Listings */}
                <section style={{
                    maxWidth: 880, margin: '0 auto',
                    padding: '48px 24px',
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[1, 2, 3].map((i) => (
                                <div key={i} style={{
                                    background: '#FFFFFF', borderRadius: 14,
                                    border: `1px solid ${COLORS.border}`,
                                    padding: 24, display: 'flex', alignItems: 'center', gap: 16,
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 10,
                                        background: COLORS.background,
                                        animation: 'pulse 1.5s infinite',
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            width: '40%', height: 14, borderRadius: 6,
                                            background: COLORS.background, marginBottom: 8,
                                        }} />
                                        <div style={{
                                            width: '25%', height: 10, borderRadius: 6,
                                            background: COLORS.background,
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : jobs.length > 0 ? (
                        <div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 24,
                            }}>
                                <h2 style={{ fontSize: 19, fontWeight: 700, color: COLORS.textPrimary }}>
                                    Latest Opportunities
                                </h2>
                                <span style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 500 }}>
                                    Showing {jobs.length} jobs
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {jobs.map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center', padding: '80px 24px',
                            background: '#FFFFFF', borderRadius: 16,
                            border: `2px dashed ${COLORS.border}`,
                        }}>
                            <div style={{ color: COLORS.textMuted, marginBottom: 16 }}>
                                <Search size={48} />
                            </div>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>
                                No jobs found
                            </h3>
                            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>
                                Try adjusting your search filters.
                            </p>
                            <Button variant="outline" onClick={() => { setSearch(''); setSearchInput(''); setRemoteType(''); }}>
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}

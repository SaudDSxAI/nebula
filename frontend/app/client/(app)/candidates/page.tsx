'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { getClientMe, filterCandidates, smartSearchCandidates, getFilterOptions, CandidateFilterParams } from '@/lib/api/clientPortal';
import {
    Search, Sparkles, Loader2, ListFilter, ChevronDown, ChevronUp,
    Download, Users, Trash2, Mail, Phone, MapPin, Briefcase, Calendar,
    Check, ArrowUpDown, User, Settings2
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

const BLUE = COLORS.primary;

const inputStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
    background: COLORS.card, fontSize: 13, color: COLORS.textPrimary, width: '100%',
    outline: 'none', boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: COLORS.textSecondary,
    marginBottom: 4, display: 'block',
};

export default function CandidatesListPage() {
    const router = useRouter();

    // Data
    const [candidates, setCandidates] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('admin');

    // Filters metadata
    const [filterOptions, setFilterOptions] = useState<any>(null);

    // Filters state
    const [filters, setFilters] = useState<CandidateFilterParams>({
        page: 1,
        page_size: 30, // Show 30 like the old app
        sort_by: 'created_at',
        sort_order: 'desc',
    });

    // UI state
    const [showFilters, setShowFilters] = useState(false);
    const [smartQuery, setSmartQuery] = useState('');
    const [smartSearching, setSmartSearching] = useState(false);
    const [smartSearchApplied, setSmartSearchApplied] = useState(false);
    const [datePreset, setDatePreset] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

    const isAdmin = userRole === 'admin';
    const canWrite = userRole === 'admin' || userRole === 'member';

    const loadOptions = async () => {
        try {
            const data = await getFilterOptions();
            setFilterOptions(data);
        } catch (err) { }
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await filterCandidates(filters);
            setCandidates(data.candidates || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
        } catch (err) {
            console.error('Failed to load candidates:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        getClientMe().then(me => setUserRole(me.role || 'admin')).catch(() => { });
        loadOptions();
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]); // filters are dependency over loadData

    // Filter update helper
    const updateFilter = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
        setSmartSearchApplied(false);
    };

    // Export
    const handleExport = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/client/candidates/export?token=${localStorage.getItem('access_token')}`, '_blank');
    };

    // Date Preset Handle
    const handleDatePreset = (preset: string) => {
        const today = new Date();
        let dateFrom = '';
        let dateTo = today.toISOString().split('T')[0];

        if (datePreset === preset) {
            setDatePreset('');
            setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined, page: 1 }));
            return;
        }

        switch (preset) {
            case 'today': dateFrom = dateTo; break;
            case 'week': {
                const w = new Date(today);
                w.setDate(today.getDate() - today.getDay());
                dateFrom = w.toISOString().split('T')[0];
                break;
            }
            case 'month': {
                const m = new Date(today.getFullYear(), today.getMonth(), 1);
                dateFrom = m.toISOString().split('T')[0];
                break;
            }
            case '30days': {
                const d30 = new Date(today);
                d30.setDate(today.getDate() - 30);
                dateFrom = d30.toISOString().split('T')[0];
                break;
            }
            case '90days': {
                const d90 = new Date(today);
                d90.setDate(today.getDate() - 90);
                dateFrom = d90.toISOString().split('T')[0];
                break;
            }
        }
        setDatePreset(preset);
        setFilters(prev => ({ ...prev, dateFrom, dateTo, page: 1 }));
    };

    // AI Match Flow (Smart Search)
    const handleSmartSearch = async () => {
        if (!smartQuery.trim()) return;
        setSmartSearching(true);
        try {
            const result = await smartSearchCandidates(smartQuery);
            if (result.filters) {
                setFilters({ page: 1, page_size: 30, ...result.filters });
                setSmartSearchApplied(true);
            }
        } catch (err) { }
        finally { setSmartSearching(false); }
    };

    const resetFilters = () => {
        setFilters({ page: 1, page_size: 30, sort_by: 'created_at', sort_order: 'desc' });
        setDatePreset('');
        setSmartQuery('');
        setSmartSearchApplied(false);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiClient.delete(`/api/client/candidates/${deleteTarget.id}`);
            loadData();
            setDeleteTarget(null);
        } catch (err) { }
    };

    // Old app stats logic mapped here
    const statusAssignedClass = (status: string) => status === 'assigned' || status === 'accepted' || status === 'offered' ? 'assigned' : 'available';

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: COLORS.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>
                        Candidates
                    </h1>
                </div>
                <button onClick={handleExport} className="w-full sm:w-auto justify-center" style={{
                    padding: '8px 16px', border: `1px solid ${COLORS.border}`,
                    background: COLORS.card, borderRadius: 8, color: COLORS.textSecondary,
                    fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', transition: 'all 0.15s'
                }}>
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Smart Search - matching old app's AI Match block */}
            <div style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14,
                padding: 20, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Sparkles size={16} color={BLUE} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>Analyze Search Requirements</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text" value={smartQuery} onChange={e => setSmartQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSmartSearch()}
                        placeholder="E.g. Senior Software Engineer with 5+ years experience in Node.js and React..."
                        style={{
                            flex: 1, padding: '12px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`,
                            background: COLORS.card, outline: 'none', fontSize: 13, color: COLORS.textPrimary,
                        }}
                    />
                    <button
                        onClick={handleSmartSearch} disabled={smartSearching}
                        className="w-full sm:w-auto justify-center"
                        style={{
                            padding: '10px 20px', background: BLUE, color: '#fff', border: 'none',
                            borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            cursor: smartSearching ? 'wait' : 'pointer', opacity: smartSearching ? 0.7 : 1
                        }}
                    >
                        {smartSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        {smartSearching ? 'Matching...' : 'Match Candidates'}
                    </button>
                </div>
                {smartSearchApplied && (
                    <div onClick={resetFilters} style={{
                        marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                        background: 'rgba(74, 107, 80, 0.1)', color: BLUE, borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}>
                        <Check size={12} /> AI filters applied. Click to clear
                    </div>
                )}
            </div>

            {/* Normal Filters — 3 Groups */}
            <div style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, marginBottom: 24,
            }}>
                <div
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        padding: '16px 20px', borderBottom: showFilters ? `1px solid ${COLORS.border}` : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                        <ListFilter size={16} color={COLORS.textMuted} /> Filters
                        {/* Active filter badge */}
                        {Object.entries(filters).some(([k, v]) => !['page', 'page_size', 'sort_by', 'sort_order'].includes(k) && v && (Array.isArray(v) ? v.length > 0 : true)) && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: BLUE, color: '#fff', padding: '2px 7px', borderRadius: 10 }}>
                                Active
                            </span>
                        )}
                    </div>
                    {showFilters ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
                </div>

                {showFilters && (
                    <div style={{ padding: 20 }}>
                        {/* Date Preset Row */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Date Range</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'today', label: 'Today' },
                                    { key: 'week', label: 'This Week' },
                                    { key: 'month', label: 'This Month' },
                                    { key: '30days', label: 'Last 30 Days' },
                                    { key: '90days', label: 'Last 90 Days' },
                                ].map(p => (
                                    <button
                                        key={p.key}
                                        onClick={() => handleDatePreset(p.key)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                            background: datePreset === p.key ? BLUE : 'transparent',
                                            color: datePreset === p.key ? '#fff' : COLORS.textSecondary,
                                            border: `1px solid ${datePreset === p.key ? BLUE : COLORS.border}`,
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                                    <input type="date" style={{ ...inputStyle, width: 140 }} value={filters.dateFrom || ''} onChange={e => updateFilter('dateFrom', e.target.value)} />
                                    <input type="date" style={{ ...inputStyle, width: 140 }} value={filters.dateTo || ''} onChange={e => updateFilter('dateTo', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                            {/* ── Group 1: Personal ─────────────────────────── */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${BLUE}26` }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: BLUE, display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} /> Personal</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={labelStyle}>Name</label>
                                        <input type="text" placeholder="Search name..." style={inputStyle} value={filters.name || ''} onChange={e => updateFilter('name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Email</label>
                                        <input type="text" placeholder="Search email..." style={inputStyle} value={filters.email || ''} onChange={e => updateFilter('email', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Location</label>
                                        <input type="text" placeholder="e.g. Dubai, UAE" style={inputStyle}
                                            value={Array.isArray(filters.location) ? filters.location[0] || '' : filters.location || ''}
                                            onChange={e => updateFilter('location', e.target.value ? [e.target.value] : undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Languages</label>
                                        <input type="text" placeholder="e.g. English, Arabic" style={inputStyle}
                                            value={Array.isArray(filters.languages) ? filters.languages.join(', ') : ''}
                                            onChange={e => updateFilter('languages', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Source</label>
                                        <select style={inputStyle} value={filters.source || ''} onChange={e => updateFilter('source', e.target.value || undefined)}>
                                            <option value="">All Sources</option>
                                            {(filterOptions?.sources || ['direct_application', 'referral', 'imported', 'linkedin', 'portal', 'other']).map((s: string) => (
                                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Tags</label>
                                        <input type="text" placeholder="e.g. Top Performer" style={inputStyle}
                                            value={Array.isArray(filters.tags) ? filters.tags.join(', ') : ''}
                                            onChange={e => updateFilter('tags', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined)} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Group 2: Professional ─────────────────────── */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid #8b5cf626` }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={13} /> Professional</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={labelStyle}>Current Role / Title</label>
                                        <input type="text" placeholder="e.g. HSE Engineer" style={inputStyle}
                                            value={Array.isArray(filters.current_title) ? filters.current_title[0] || '' : filters.current_title || ''}
                                            onChange={e => updateFilter('current_title', e.target.value ? [e.target.value] : undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Experience</label>
                                        <select style={inputStyle} value={filters.experience || ''} onChange={e => updateFilter('experience', e.target.value || undefined)}>
                                            <option value="">Any Experience</option>
                                            <option value="0-2">0–2 years</option>
                                            <option value="3-5">3–5 years</option>
                                            <option value="6-10">6–10 years</option>
                                            <option value="10+">10+ years</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Skills</label>
                                        <input type="text" placeholder="e.g. NEBOSH, Python" style={inputStyle}
                                            value={Array.isArray(filters.skills) ? filters.skills.join(', ') : ''}
                                            onChange={e => updateFilter('skills', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined)} />
                                        <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3 }}>Comma-separated</div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Education</label>
                                        <input type="text" placeholder="e.g. B.Sc Engineering" style={inputStyle}
                                            value={Array.isArray(filters.education) ? filters.education[0] || '' : ''}
                                            onChange={e => updateFilter('education', e.target.value ? [e.target.value] : undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Work Authorization</label>
                                        <select style={inputStyle} value={Array.isArray(filters.work_authorization) ? filters.work_authorization[0] || '' : ''} onChange={e => updateFilter('work_authorization', e.target.value ? [e.target.value] : undefined)}>
                                            <option value="">Any Authorization</option>
                                            <option value="Citizen">Citizen</option>
                                            <option value="PR">Permanent Resident</option>
                                            <option value="Work Visa">Work Visa</option>
                                            <option value="Needs Sponsorship">Needs Sponsorship</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Availability</label>
                                        <select style={inputStyle} value={filters.availability || ''} onChange={e => updateFilter('availability', e.target.value || undefined)}>
                                            <option value="">Any Availability</option>
                                            <option value="immediate">Immediate</option>
                                            <option value="2_weeks">2 Weeks</option>
                                            <option value="1_month">1 Month</option>
                                            <option value="3_months">3 Months</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── Group 3: Preferences ──────────────────────── */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid #10b98126` }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}><Settings2 size={13} /> Preferences</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <label style={labelStyle}>Remote Preference</label>
                                        <select style={inputStyle} value={filters.remote_preference || ''} onChange={e => updateFilter('remote_preference', e.target.value || undefined)}>
                                            <option value="">Any</option>
                                            <option value="remote">Remote</option>
                                            <option value="hybrid">Hybrid</option>
                                            <option value="onsite">On-site</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Desired Role</label>
                                        <input type="text" placeholder="e.g. Project Manager" style={inputStyle}
                                            value={(filters as any).desired_role || ''}
                                            onChange={e => updateFilter('desired_role', e.target.value || undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Desired Location</label>
                                        <input type="text" placeholder="e.g. Dubai" style={inputStyle}
                                            value={(filters as any).desired_location || ''}
                                            onChange={e => updateFilter('desired_location', e.target.value || undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Salary Expectation</label>
                                        <input type="text" placeholder="e.g. AED 8,000–12,000" style={inputStyle}
                                            value={(filters as any).salary_expectation || ''}
                                            onChange={e => updateFilter('salary_expectation', e.target.value || undefined)} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Status</label>
                                        <select style={inputStyle} value={filters.status || ''} onChange={e => updateFilter('status', e.target.value || undefined)}>
                                            <option value="">All Statuses</option>
                                            {(filterOptions?.statuses || ['available', 'assigned']).map((s: string) => (
                                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Notice Period</label>
                                        <input type="text" placeholder="e.g. 30 days" style={inputStyle}
                                            value={(filters as any).notice_period || ''}
                                            onChange={e => updateFilter('notice_period', e.target.value || undefined)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2.5 mt-5 justify-end border-t border-[rgba(0,0,0,0.05)] pt-4">
                            <button onClick={resetFilters} className="w-full sm:w-auto text-center" style={{
                                padding: '8px 16px', border: `1px solid ${COLORS.border}`, background: 'transparent',
                                borderRadius: 8, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, cursor: 'pointer'
                            }}>
                                Reset Filters
                            </button>
                            <button onClick={loadData} className="w-full sm:w-auto text-center" style={{
                                padding: '8px 16px', border: 'none', background: BLUE,
                                borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer'
                            }}>
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Header */}
            <div id="resultsCount" style={{ marginBottom: 16, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>
                Showing {Math.min(candidates.length, total)} of {total} candidates
            </div>

            {/* CANDIDATE CARDS (matching old app dashboard.js rendering) */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>
                    <Loader2 size={30} className="animate-spin" style={{ margin: '0 auto 12px' }} color={BLUE} />
                    Loading candidates...
                </div>
            ) : candidates.length === 0 ? (
                <div style={{
                    background: COLORS.card, border: `1px dashed ${COLORS.border}`, borderRadius: 16,
                    padding: 60, textAlign: 'center'
                }}>
                    <Users size={48} style={{ color: BLUE, opacity: 0.3, margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>No candidates found</div>
                    <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Try adjusting your search filters</div>
                </div>
            ) : (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20
                }}>
                    {candidates.map(candidate => {
                        const nameStr = candidate.name || 'N A';
                        const initials = nameStr.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                        const assignedMode = statusAssignedClass(candidate.status || 'applied') === 'assigned';

                        return (
                            <div key={candidate.id}
                                onClick={() => router.push(`/client/candidates/${candidate.id}`)}
                                style={{
                                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                                    borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s',
                                    cursor: 'pointer', display: 'flex', flexDirection: 'column'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                {/* Header */}
                                <div style={{
                                    padding: '20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                                    borderBottom: `1px solid ${COLORS.border}50`
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', background: assignedMode ? 'rgba(52, 211, 153, 0.15)' : 'rgba(74, 107, 80, 0.1)',
                                        color: assignedMode ? '#10b981' : BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 16, fontWeight: 800, flexShrink: 0
                                    }}>
                                        {initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {candidate.name}
                                        </div>
                                        <div style={{ fontSize: 13, color: COLORS.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                                            {candidate.current_title || candidate.job_title || 'N/A'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase',
                                            background: assignedMode ? 'rgba(52, 211, 153, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                            color: assignedMode ? '#059669' : '#4b5563',
                                        }}>
                                            {assignedMode ? 'Assigned' : 'Available'}
                                        </span>
                                        {canWrite && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: candidate.id, name: candidate.name }); }}
                                                style={{
                                                    background: 'transparent', border: 'none', color: COLORS.textMuted, cursor: 'pointer',
                                                    padding: 4, borderRadius: 6, transition: 'color 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                                                onMouseLeave={e => e.currentTarget.style.color = COLORS.textMuted}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: COLORS.textSecondary }}>
                                        <Mail size={14} color={COLORS.textMuted} /> {candidate.email || 'N/A'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: COLORS.textSecondary }}>
                                        <Phone size={14} color={COLORS.textMuted} /> {candidate.phone_number || 'N/A'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: COLORS.textSecondary }}>
                                        <MapPin size={14} color={COLORS.textMuted} /> {candidate.location || candidate.current_location || 'N/A'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: COLORS.textSecondary }}>
                                        <Briefcase size={14} color={COLORS.textMuted} /> {candidate.employment_status || 'N/A'}
                                    </div>
                                </div>

                                {/* Footer (Stats) */}
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3" style={{
                                    padding: '12px 20px', background: 'rgba(0,0,0,0.01)', borderTop: `1px solid ${COLORS.border}`
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>Experience</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                                            {candidate.years_of_experience != null ? `${candidate.years_of_experience} yrs` : (candidate.total_experience || 'N/Ayrs')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} className="sm:items-end">
                                        <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: 'uppercase' }}>Gulf Exp</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>
                                            {candidate.experience_in_gulf && candidate.experience_in_gulf !== 'N/A' ? `${candidate.experience_in_gulf} yrs` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls match old app */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
                        disabled={filters.page === 1}
                        style={{
                            padding: '8px 16px', borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`,
                            color: filters.page === 1 ? COLORS.textMuted : COLORS.textPrimary, cursor: filters.page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
                        }}
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, page: Math.min(totalPages, prev.page! + 1) }))}
                        disabled={filters.page === totalPages}
                        style={{
                            padding: '8px 16px', borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}`,
                            color: filters.page === totalPages ? COLORS.textMuted : COLORS.textPrimary, cursor: filters.page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }}>
                    <div style={{ background: COLORS.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>Delete Candidate</h3>
                        <p style={{ margin: '0 0 24px', fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setDeleteTarget(null)} style={{
                                padding: '10px 16px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: 8,
                                color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}>Cancel</button>
                            <button onClick={confirmDelete} style={{
                                padding: '10px 16px', background: '#DC2626', border: 'none', borderRadius: 8,
                                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                            }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


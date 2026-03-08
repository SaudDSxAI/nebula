'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import {
    Activity, RefreshCw, Filter, ChevronDown, MapPin,
    Briefcase, Clock, Tag, FileText, User, Star,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

// ─── Types ──────────────────────────────────────────────────────────────────
interface CandidateCard {
    applicant_id: number;
    candidate_id: number;
    candidate_name: string;
    candidate_email: string;
    candidate_phone: string | null;
    candidate_location: string | null;
    current_title: string | null;
    years_of_experience: number | null;
    skills: string[];
    tags: string[];
    availability: string | null;
    notice_period: string | null;
    requirement_id: number;
    requirement_title: string;
    requirement_status: string;
    applicant_status: string;
    stage: string;
    ai_match_score: string | null;
    internal_notes: string | null;
    applied_at: string | null;
}

const BLUE = COLORS.primary;

// Stage config
const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    applied: { label: 'Applied', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
    screening: { label: 'Screening', color: '#1e40af', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.25)' },
    shortlisted: { label: 'Shortlisted', color: '#5b21b6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.25)' },
    interview: { label: 'Interview', color: '#92400e', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.3)' },
    offered: { label: 'Offered', color: '#065f46', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.25)' },
    accepted: { label: 'Accepted', color: '#14532d', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)' },
    rejected: { label: 'Rejected', color: '#991b1b', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.2)' },
};

const STAGE_ORDER = ['applied', 'screening', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected'];

const fmtDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Availability colors
const availColor = (a: string | null) => {
    if (!a) return COLORS.textMuted;
    if (a.includes('immediate')) return '#10b981';
    if (a.includes('week')) return '#f59e0b';
    return '#6366f1';
};

export default function MonitoringPage() {
    const router = useRouter();
    const [stages, setStages] = useState<Record<string, CandidateCard[]>>({});
    const [requirements, setRequirements] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterReq, setFilterReq] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [updatingStage, setUpdatingStage] = useState<number | null>(null);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const params: any = {};
            if (filterReq) params.requirement_id = filterReq;
            if (filterStage) params.stage = filterStage;
            const res = await apiClient.get('/api/client/requirements/monitoring/board', { params });
            setStages(res.data.stages || {});
            setRequirements(res.data.requirements || []);
            setTotal(res.data.total || 0);
        } catch { }
        finally { setLoading(false); setRefreshing(false); }
    }, [filterReq, filterStage]);

    useEffect(() => { load(); }, [load]);

    const handleStageChange = async (applicantId: number, reqId: number, newStage: string) => {
        setUpdatingStage(applicantId);
        try {
            await apiClient.put(`/api/client/requirements/${reqId}/applicants/${applicantId}/stage`, { stage: newStage });
            await load(true);
        } catch (e) {
            console.error('Stage update failed', e);
        } finally {
            setUpdatingStage(null);
        }
    };

    const visibleStages = filterStage
        ? [filterStage]
        : STAGE_ORDER;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div style={{ width: 36, height: 36, border: `3px solid #e2e8f0`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
    );

    const totalByStage = (s: string) => (stages[s] || []).length;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin{to{transform:rotate(360deg)}}
                .cand-card:hover{box-shadow:0 6px 18px rgba(0,0,0,0.1)!important;transform:translateY(-1px);}
            ` }} />

            {/* ─── Header ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Activity size={22} color={BLUE} /> Candidate Monitoring
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                        Track all assigned candidates across requirements and pipeline stages
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                    <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {/* ─── Summary pills ────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{ padding: '5px 14px', background: 'rgba(2,116,189,0.1)', borderRadius: 20, fontSize: 12, fontWeight: 700, color: BLUE }}>
                    {total} Total Candidates
                </span>
                {STAGE_ORDER.filter(s => totalByStage(s) > 0).map(s => {
                    const sc = STAGE_CONFIG[s];
                    return (
                        <button
                            key={s}
                            onClick={() => setFilterStage(filterStage === s ? '' : s)}
                            style={{
                                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                border: `1px solid ${filterStage === s ? sc.color : 'transparent'}`,
                                background: sc.bg, color: sc.color, cursor: 'pointer',
                            }}
                        >
                            {sc.label} · {totalByStage(s)}
                        </button>
                    );
                })}
            </div>

            {/* ─── Filters ─────────────────────────────────────────────── */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={14} color="var(--color-text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Filter by</span>

                <select
                    value={filterReq}
                    onChange={e => setFilterReq(e.target.value)}
                    style={{ padding: '7px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-input-bg, var(--color-card))', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                    <option value="">All Requirements</option>
                    {requirements.map(r => (
                        <option key={r.id} value={r.id}>#{r.id} {r.title}</option>
                    ))}
                </select>

                <select
                    value={filterStage}
                    onChange={e => setFilterStage(e.target.value)}
                    style={{ padding: '7px 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, background: 'var(--color-input-bg, var(--color-card))', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                    <option value="">All Stages</option>
                    {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
                </select>

                {(filterReq || filterStage) && (
                    <button
                        onClick={() => { setFilterReq(''); setFilterStage(''); }}
                        style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* ─── Kanban Board ─────────────────────────────────────────── */}
            {total === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--color-card)', borderRadius: 16, border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <Activity size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <p style={{ fontWeight: 600, margin: 0 }}>No candidates assigned yet. Assign candidates to requirements to start monitoring.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${visibleStages.length}, minmax(260px, 1fr))`,
                    gap: 16,
                    overflowX: 'auto',
                    paddingBottom: 8,
                }}>
                    {visibleStages.map(stageName => {
                        const sc = STAGE_CONFIG[stageName] || STAGE_CONFIG.applied;
                        const cards = stages[stageName] || [];
                        return (
                            <div key={stageName} style={{ minWidth: 260 }}>
                                {/* Column header */}
                                <div style={{
                                    padding: '10px 14px', borderRadius: '10px 10px 0 0',
                                    background: sc.bg, border: `1px solid ${sc.border}`, borderBottom: 'none',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {sc.label}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, background: `${sc.color}20`, padding: '2px 8px', borderRadius: 10 }}>
                                        {cards.length}
                                    </span>
                                </div>

                                {/* Cards column */}
                                <div style={{
                                    minHeight: 200, background: `${sc.bg}50`,
                                    border: `1px solid ${sc.border}`, borderTop: 'none',
                                    borderRadius: '0 0 10px 10px', padding: 8,
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                }}>
                                    {cards.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '24px 8px', color: '#cbd5e1', fontSize: 11, fontStyle: 'italic' }}>
                                            No candidates
                                        </div>
                                    )}
                                    {cards.map(c => (
                                        <div
                                            key={c.applicant_id}
                                            className="cand-card"
                                            style={{
                                                background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10,
                                                padding: '12px 14px', cursor: 'default', transition: 'all 0.2s',
                                                borderLeft: `3px solid ${sc.color}`,
                                            }}
                                        >
                                            {/* Name + score */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                <div
                                                    onClick={() => router.push(`/client/candidates/${c.candidate_id}`)}
                                                    style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer', lineHeight: 1.3 }}
                                                >
                                                    {c.candidate_name}
                                                </div>
                                                {c.ai_match_score && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#f59e0b', flexShrink: 0, marginLeft: 6 }}>
                                                        <Star size={9} /> {c.ai_match_score}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Current title */}
                                            {c.current_title && (
                                                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Briefcase size={10} /> {c.current_title}
                                                    {c.years_of_experience != null && ` · ${c.years_of_experience}yr`}
                                                </div>
                                            )}

                                            {/* Location */}
                                            {c.candidate_location && (
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                    <MapPin size={9} /> {c.candidate_location}
                                                </div>
                                            )}

                                            {/* Availability */}
                                            {c.availability && (
                                                <div style={{ fontSize: 10, fontWeight: 700, color: availColor(c.availability), marginBottom: 6 }}>
                                                    <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
                                                    {c.availability.replace(/_/g, ' ')}
                                                </div>
                                            )}

                                            {/* Skills */}
                                            {c.skills.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                                                    {c.skills.slice(0, 3).map((s, i) => (
                                                        <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', color: '#1e40af' }}>{s}</span>
                                                    ))}
                                                    {c.skills.length > 3 && <span style={{ fontSize: 9, color: '#94a3b8', padding: '2px 4px' }}>+{c.skills.length - 3}</span>}
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {c.tags.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
                                                    {c.tags.map((t, i) => (
                                                        <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(148,109,67,0.1)', color: '#946D43' }}>
                                                            <Tag size={8} style={{ display: 'inline', marginRight: 2 }} />{t}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Req link */}
                                            <div
                                                onClick={() => router.push(`/client/requirements/${c.requirement_id}`)}
                                                style={{ fontSize: 10, color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontWeight: 600 }}
                                            >
                                                <FileText size={9} /> {c.requirement_title}
                                            </div>

                                            {/* Stage mover */}
                                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Stage</span>
                                                <select
                                                    value={c.stage}
                                                    disabled={updatingStage === c.applicant_id}
                                                    onChange={e => handleStageChange(c.applicant_id, c.requirement_id, e.target.value)}
                                                    style={{
                                                        flex: 1, fontSize: 10, fontWeight: 700, padding: '3px 6px',
                                                        border: `1px solid ${sc.color}40`, borderRadius: 5,
                                                        background: sc.bg, color: sc.color, cursor: 'pointer',
                                                    }}
                                                >
                                                    {STAGE_ORDER.map(s => (
                                                        <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                                                    ))}
                                                </select>
                                                {c.applied_at && (
                                                    <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>{fmtDate(c.applied_at)}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

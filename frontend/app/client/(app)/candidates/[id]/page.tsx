'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCandidateDetail } from '@/lib/api/clientPortal';
import apiClient from '@/lib/api/client';
import { Bot, ChevronDown, Send, FileText, ClipboardList, GraduationCap, Award, ArrowLeft, Trash2, ZoomIn, ExternalLink, Mail, Phone, MapPin, User, Briefcase, History, Inbox, Sparkles, MessageSquare, X, Maximize2 } from 'lucide-react';

const statusColors: Record<string, { bg: string; color: string }> = {
    applied: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
    screening: { bg: 'rgba(2,116,189,0.1)', color: '#0274BD' },
    interviewing: { bg: 'rgba(245,114,81,0.1)', color: '#F57251' },
    offered: { bg: 'rgba(202,138,4,0.1)', color: '#ca8a04' },
    accepted: { bg: 'rgba(21,128,61,0.1)', color: '#15803d' },
    rejected: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    withdrawn: { bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
};

export default function CandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [candidate, setCandidate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    // AI Q&A
    const [qaOpen, setQaOpen] = useState(true);
    const [qaMessages, setQaMessages] = useState<{ role: 'ai' | 'user'; content: string }[]>([
        { role: 'ai', content: "Ask me anything about this CV. I'll only use information from the document." }
    ]);
    const [qaInput, setQaInput] = useState('');
    const [qaTyping, setQaTyping] = useState(false);
    const msgEndRef = useRef<HTMLDivElement>(null);
    const qaScrollRef = useRef<HTMLDivElement>(null);

    // CV Zoom Modal
    const [zoomOpen, setZoomOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getCandidateDetail(id);
                setCandidate(data);
                const notesRes = await apiClient.get(`/api/client/candidates/${id}/notes`);
                setNotes(notesRes.data.notes || []);
            } catch {
                router.push('/client/candidates');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    // Scroll only within the chat container, not the whole page
    useEffect(() => {
        if (qaOpen && qaScrollRef.current) {
            qaScrollRef.current.scrollTop = qaScrollRef.current.scrollHeight;
        }
    }, [qaMessages, qaOpen]);

    const handleUpdateStatus = async (appId: number, status: string) => {
        try {
            await apiClient.put(`/api/client/candidates/${id}/status`, { application_id: appId, status });
            const data = await getCandidateDetail(id);
            setCandidate(data);
        } catch (err) { console.error(err); }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setAddingNote(true);
        try {
            await apiClient.post(`/api/client/candidates/${id}/notes`, { content: newNote });
            setNewNote('');
            const res = await apiClient.get(`/api/client/candidates/${id}/notes`);
            setNotes(res.data.notes);
        } catch (err) { console.error(err); }
        finally { setAddingNote(false); }
    };

    const askAI = async (query: string) => {
        if (!query.trim() || qaTyping) return;
        setQaMessages(p => [...p, { role: 'user', content: query }]);
        setQaInput('');
        setQaTyping(true);
        try {
            const res = await apiClient.post('/api/client/ai/ask-cv', { candidate_id: id, question: query });
            setQaMessages(p => [...p, { role: 'ai', content: res.data.answer }]);
        } catch {
            setQaMessages(p => [...p, { role: 'ai', content: "Sorry, I couldn't process that right now." }]);
        } finally { setQaTyping(false); }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted, #94a3b8)' }}>
            Loading candidate...
        </div>
    );
    if (!candidate) return null;

    const initials = (candidate.name || 'C').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
    const isAssigned = candidate.status === 'assigned';

    // ─── Inline styles — all using CSS vars for dark mode ──────────────────────
    const S = {
        hero: {
            display: 'flex', alignItems: 'center', gap: '24px',
            padding: '28px 32px', background: 'var(--color-card)',
            borderRadius: '16px', border: '1px solid var(--color-border)',
            marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            flexWrap: 'wrap' as const,
        },
        avatar: {
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '1.8rem', fontWeight: 700, flexShrink: 0,
            textTransform: 'uppercase' as const,
        },
        heroInfo: { flex: 1 },
        heroH1: { fontSize: '1.6rem', fontWeight: 700, margin: 0, lineHeight: 1.3, color: 'var(--color-text-primary)' },
        heroSub: { fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
        statusPill: (assigned: boolean) => ({
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem',
            fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.3px',
            background: assigned ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
            color: assigned ? '#3b82f6' : '#10b981',
        }),
        heroActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' as const },
        btnHero: (variant: 'primary' | 'back') => ({
            padding: '10px 20px', border: 'none', borderRadius: '10px',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            fontFamily: 'inherit',
            ...(variant === 'primary' ? {
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                color: '#fff',
            } : {
                background: 'var(--color-background)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
            }),
        }),
        quickContact: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' as const },
        chip: {
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 18px', background: 'var(--color-card)',
            border: '1px solid var(--color-border)', borderRadius: '12px',
            textDecoration: 'none', color: 'var(--color-text-primary)',
            fontSize: '0.88rem', fontWeight: 500, transition: 'all 0.2s',
            cursor: 'pointer', flex: 1, minWidth: '200px',
        },
        chipIcon: (bg: string, color: string) => ({
            width: '36px', height: '36px', borderRadius: '10px',
            background: bg, color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0,
        }),
        chipLabel: { fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'var(--color-text-muted)', fontWeight: 600 },
        chipValue: { fontSize: '0.88rem', fontWeight: 500, color: 'var(--color-text-primary)' },
        grid: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' as const },
        infoCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' },
        infoCard: { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' },
        infoCardHeader: {
            padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700,
            textTransform: 'uppercase' as const, letterSpacing: '0.6px',
            color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: '8px',
        },
        infoRow: {
            display: 'flex', justifyContent: 'space-between',
            padding: '12px 20px', borderBottom: '1px solid var(--color-border)',
            alignItems: 'center',
        },
        infoRowLabel: { fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 },
        infoRowValue: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' as const, maxWidth: '60%', wordBreak: 'break-word' as const },
        assignSection: { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '14px', marginBottom: '24px' },
        assignEmpty: { padding: '32px', textAlign: 'center' as const, color: 'var(--color-text-muted)', fontSize: '0.88rem' },
        assignItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' },
        cvSection: { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden' },
        cvIframe: { width: '100%', height: '600px', border: 'none', display: 'block' },
        qaSection: { marginBottom: '16px', background: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' },
        qaHeader: { padding: '14px 18px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' as const },
        qaMessages: { maxHeight: '450px', minHeight: '80px', overflowY: 'auto' as const, padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '12px', background: 'var(--color-background)' },
        qaMsg: (role: 'ai' | 'user') => ({
            maxWidth: role === 'user' ? '75%' : '95%',
            padding: '10px 14px', borderRadius: '12px', fontSize: '0.88rem',
            lineHeight: 1.6, wordBreak: 'break-word' as const,
            alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
            background: role === 'user' ? 'var(--color-primary)' : 'var(--color-card)',
            color: role === 'user' ? '#fff' : 'var(--color-text-primary)',
            border: role === 'ai' ? '1px solid var(--color-border)' : 'none',
            borderBottomRightRadius: role === 'user' ? '4px' : '12px',
            borderBottomLeftRadius: role === 'ai' ? '4px' : '12px',
        }),
        qaQuickActions: { padding: '8px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' as const, borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' },
        qaQuickBtn: { padding: '6px 12px', border: '1px solid var(--color-border)', background: 'var(--color-card)', borderRadius: '20px', fontSize: '0.78rem', color: 'var(--color-primary)', cursor: 'pointer', whiteSpace: 'nowrap' as const },
        qaInputRow: { padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)' },
        qaInput: { flex: 1, padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: '24px', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', background: 'var(--color-background)', color: 'var(--color-text-primary)' },
        qaSendBtn: (disabled: boolean) => ({ width: '40px', height: '40px', border: 'none', background: disabled ? 'var(--color-text-muted)' : 'var(--color-primary)', color: '#fff', borderRadius: '50%', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
        cvHeaderWithActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
        cvHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
        btnCvZoom: { padding: '5px 10px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' },
        noteCard: { background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '14px', overflow: 'hidden', marginTop: '16px' },
        noteTextarea: { width: '100%', padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none' as const, outline: 'none', background: 'var(--color-background)', color: 'var(--color-text-primary)', boxSizing: 'border-box' as const },
        noteSaveBtn: { width: '100%', padding: '9px', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
        zoomOverlay: { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' as const },
        zoomContainer: { width: '100%', height: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column' as const, borderRadius: '16px', overflow: 'hidden', background: 'var(--color-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
        zoomHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
        zoomTitle: { fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' },
        zoomBtnClose: { padding: '8px 14px', border: '1px solid rgba(220,53,69,0.2)', background: 'rgba(220,53,69,0.1)', color: '#dc3545', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' },
        zoomBtnOpen: { padding: '8px 14px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' },
        zoomBody: { flex: 1, overflow: 'hidden' },
        zoomIframe: { width: '100%', height: '100%', border: 'none' },
    } as const;

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const cvSrc = candidate.cv_url
        ? (() => {
            let url = candidate.cv_url;
            // For local /api/cv/... URLs, append auth token (iframes can't send auth headers)
            if (url.includes('/api/cv/') && accessToken) {
                url += (url.includes('?') ? '&' : '?') + `token=${accessToken}`;
            }
            return url.includes('#') ? url : `${url}#toolbar=1&view=FitH`;
        })()
        : null;

    return (
        <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

            {/* ── Hero ── */}
            <div style={S.hero}>
                <div style={S.avatar}>{initials}</div>
                <div style={S.heroInfo}>
                    <h1 style={S.heroH1}>{candidate.name || 'Candidate'}</h1>
                    <div style={S.heroSub}>
                        {candidate.current_title || candidate.desired_role || 'No role specified'}
                        <span style={S.statusPill(isAssigned)}>{isAssigned ? 'Assigned' : 'Available'}</span>
                    </div>
                </div>
                <div style={S.heroActions}>
                    <a href={`mailto:${candidate.email}`} style={{ ...S.btnHero('primary'), textDecoration: 'none' }}>
                        <Mail size={16} /> Email Candidate
                    </a>
                    <button style={S.btnHero('back')} onClick={() => router.push('/client/candidates')}>
                        ← Back
                    </button>
                </div>
            </div>

            {/* ── Quick Contact Chips ── */}
            <div style={S.quickContact}>
                <a href={`mailto:${candidate.email}`} style={S.chip}>
                    <div style={S.chipIcon('rgba(59,130,246,0.12)', '#3b82f6')}><Mail size={18} /></div>
                    <div>
                        <div style={S.chipLabel}>Email</div>
                        <div style={S.chipValue}>{candidate.email || '—'}</div>
                    </div>
                </a>
                <div style={S.chip}>
                    <div style={S.chipIcon('rgba(37,211,102,0.12)', '#25d366')}><Phone size={18} /></div>
                    <div>
                        <div style={S.chipLabel}>Phone</div>
                        <div style={S.chipValue}>{candidate.phone || '—'}</div>
                    </div>
                </div>
                <div style={S.chip}>
                    <div style={S.chipIcon('rgba(148,109,67,0.12)', 'var(--color-primary, #0274BD)')}><MapPin size={18} /></div>
                    <div>
                        <div style={S.chipLabel}>Location</div>
                        <div style={S.chipValue}>{candidate.location || '—'}</div>
                    </div>
                </div>
            </div>

            {/* ── Main Grid: Left + Right ── */}
            <div style={S.grid}>

                {/* ─── LEFT ─── */}
                <div>

                    {/* Personal Info + Professional Details */}
                    <div style={S.infoCards}>
                        <div style={S.infoCard}>
                            <div style={S.infoCardHeader}><User size={16} /> Personal Information</div>
                            <div>
                                {[
                                    ['Availability', candidate.availability],
                                    ['Notice Period', candidate.notice_period],
                                    ['Work Authorization', candidate.work_authorization],
                                    ['Date Added', candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : null],
                                ].map(([label, value]) => (
                                    <div key={label as string} style={{ ...S.infoRow, borderBottom: '1px solid var(--border-light, #e5e7eb)' }}>
                                        <span style={S.infoRowLabel}>{label}</span>
                                        <span style={S.infoRowValue}>{value || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={S.infoCard}>
                            <div style={S.infoCardHeader}><Briefcase size={16} /> Professional Details</div>
                            <div>
                                {[
                                    ['Current Company', candidate.current_company],
                                    ['Total Experience', candidate.years_of_experience ? `${candidate.years_of_experience} yrs` : null],
                                    ['Desired Role', candidate.desired_role],
                                    ['Desired Location', candidate.desired_location],
                                    ['Salary Expectation', candidate.salary_expectation],
                                ].map(([label, value]) => (
                                    <div key={label as string} style={{ ...S.infoRow, borderBottom: '1px solid var(--border-light, #e5e7eb)' }}>
                                        <span style={S.infoRowLabel}>{label}</span>
                                        <span style={S.infoRowValue}>{value || '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Qualifications */}
                    <div style={{ ...S.infoCards, gridTemplateColumns: '1fr' }}>
                        <div style={S.infoCard}>
                            <div style={S.infoCardHeader}><GraduationCap size={16} /> Qualifications & Certifications</div>
                            <div>
                                <div style={S.infoRow}>
                                    <span style={S.infoRowLabel}>Education</span>
                                    <span style={S.infoRowValue}>{candidate.education || '—'}</span>
                                </div>
                                <div style={{ ...S.infoRow, borderBottom: 'none', display: 'block', padding: '12px 20px' }}>
                                    <div style={{ ...S.infoRowLabel, marginBottom: '8px' }}>Skills</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {candidate.skills
                                            ? candidate.skills.split(',').map((s: string) => (
                                                <span key={s} style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: 'var(--color-primary-alpha)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                    {s.trim()}
                                                </span>
                                            ))
                                            : <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>No skills listed</span>
                                        }
                                    </div>
                                </div>
                                <div style={S.infoRow}>
                                    <span style={S.infoRowLabel}>Certifications</span>
                                    <span style={S.infoRowValue}>{candidate.certifications || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment History (Applications) */}
                    <div style={S.assignSection}>
                        <div style={S.infoCardHeader}><History size={16} /> Assignment History</div>
                        {(!candidate.applications || candidate.applications.length === 0) ? (
                            <div style={S.assignEmpty}>
                                <div style={{ marginBottom: '8px', opacity: 0.4, color: 'var(--color-text-muted)' }}><Inbox size={32} /></div>
                                No assignment history
                            </div>
                        ) : candidate.applications.map((app: any) => (
                            <div key={app.id} style={S.assignItem}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>{app.job_title || 'Requirement'}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : ''}</div>
                                    {app.ai_match_score && app.ai_match_score !== 'Pending' && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> AI Match: {app.ai_match_score}</div>
                                    )}
                                </div>
                                <select
                                    value={app.status}
                                    onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-input-bg, var(--color-card))', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: statusColors[app.status]?.color || 'var(--color-text-secondary)', fontFamily: 'inherit' }}
                                >
                                    {['applied', 'screening', 'interviewing', 'offered', 'accepted', 'rejected', 'withdrawn'].map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Internal Notes (like the messaging section) */}
                    <div style={{ ...S.infoCard, marginBottom: '24px' }}>
                        <div style={{ padding: '14px 20px', background: 'linear-gradient(135deg, var(--color-primary, #0274BD), var(--color-primary-hover, #025d96))', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MessageSquare size={18} />
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>Internal Notes</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem' }}>Private to your team</div>
                            </div>
                        </div>
                        <div style={{ minHeight: '200px', maxHeight: '350px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--color-background)' }}>
                            {notes.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem', padding: '30px 0' }}>
                                    No notes yet. Add one below.
                                </div>
                            ) : notes.map((note) => (
                                <div key={note.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>{new Date(note.created_at).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) handleAddNote(e as any); }}
                                placeholder="Type a note..."
                                style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--color-border)', borderRadius: '20px', fontFamily: 'inherit', fontSize: '0.85rem', background: 'var(--color-background)', color: 'var(--color-text-primary)', outline: 'none' }}
                            />
                            <button
                                onClick={handleAddNote as any}
                                disabled={!newNote.trim() || addingNote}
                                style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-primary, #0274BD)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                </div>

                {/* ─── RIGHT ─── */}
                <div>

                    {/* AI Q&A Panel — always visible */}
                    <div style={S.qaSection}>
                        {/* Header */}
                        <div
                            style={{ ...S.qaHeader, ...(qaOpen ? {} : {}) }}
                            onClick={() => setQaOpen(!qaOpen)}
                        >
                            <Bot size={18} />
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Ask AI About This CV</span>
                            <ChevronDown size={16} style={{ marginLeft: 'auto', transition: 'transform 0.3s', transform: qaOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>

                        {qaOpen && (
                            <>
                                {/* Quick Actions */}
                                <div style={S.qaQuickActions}>
                                    {[
                                        [<FileText size={13} />, 'Summarize CV', 'Provide a comprehensive summary of this CV'],
                                        [<ClipboardList size={13} />, 'Work Experience', "What is the candidate's work experience?"],
                                        [<GraduationCap size={13} />, 'Education', "What is the candidate's educational background?"],
                                        [<Award size={13} />, 'Skills & Certs', "What are the candidate's key skills and certifications?"],
                                    ].map(([icon, label, q]) => (
                                        <button key={label as string} style={{ ...S.qaQuickBtn, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => askAI(q as string)}>
                                            {icon} {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Messages — scrolls only within this container */}
                                <div ref={qaScrollRef} style={S.qaMessages}>
                                    {qaMessages.map((msg, i) => (
                                        <div key={i} style={S.qaMsg(msg.role)}>
                                            <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                        </div>
                                    ))}
                                    {qaTyping && (
                                        <div style={{ alignSelf: 'flex-start', padding: '10px 18px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                            AI is thinking…
                                        </div>
                                    )}
                                </div>

                                {/* Input */}
                                <div style={S.qaInputRow}>
                                    <input
                                        value={qaInput}
                                        onChange={e => setQaInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && askAI(qaInput)}
                                        placeholder="Ask about this CV..."
                                        style={S.qaInput}
                                    />
                                    <button
                                        onClick={() => askAI(qaInput)}
                                        disabled={!qaInput.trim() || qaTyping}
                                        style={S.qaSendBtn(!qaInput.trim() || qaTyping)}
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* CV Preview */}
                    <div style={S.cvSection}>
                        <div style={S.infoCardHeader}>
                            <div style={S.cvHeaderWithActions}>
                                <div style={S.cvHeaderLeft}><FileText size={16} /> CV Preview</div>
                                {cvSrc && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button style={S.btnCvZoom} onClick={() => setZoomOpen(true)}><Maximize2 size={13} /> Zoom</button>
                                        <button style={S.btnCvZoom} onClick={() => window.open(cvSrc, '_blank')}><ExternalLink size={13} /> Open</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {cvSrc ? (
                            <iframe src={cvSrc} title="CV Preview" style={S.cvIframe} />
                        ) : (
                            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                                <div style={{ marginBottom: '8px', opacity: 0.4, color: 'var(--color-text-muted)' }}><FileText size={32} /></div>
                                No CV uploaded
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ── CV Zoom Modal ── */}
            {zoomOpen && (
                <div style={S.zoomOverlay} onClick={() => setZoomOpen(false)}>
                    <div style={S.zoomContainer} onClick={e => e.stopPropagation()}>
                        <div style={S.zoomHeader}>
                            <div style={S.zoomTitle}>
                                <FileText size={18} /> {candidate.name} — CV
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button style={S.zoomBtnOpen} onClick={() => window.open(cvSrc || '', '_blank')}><ExternalLink size={14} /> Open in New Tab</button>
                                <button style={S.zoomBtnClose} onClick={() => setZoomOpen(false)}><X size={14} /> Close</button>
                            </div>
                        </div>
                        <div style={S.zoomBody}>
                            {cvSrc && <iframe src={cvSrc} title="CV Full Preview" style={S.zoomIframe} />}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 1024px) {
                    .detail-page-grid { grid-template-columns: 1fr !important; }
                }
            ` }} />
        </div>
    );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCandidateDetail } from '@/lib/api/clientPortal';
import apiClient from '@/lib/api/client';
import { COLORS } from '@/lib/theme';
import {
    Mail, Phone, MapPin, Download, Send, User, Briefcase,
    GraduationCap, CheckCircle, Clock, Inbox, FileText,
    Maximize2, ChevronDown, ChevronUp, Bot, ExternalLink, X, FileQuestion
} from 'lucide-react';

const statusColors: Record<string, string> = {
    applied: '#64748b', screening: '#4A6B50', interviewing: '#E0A800',
    offered: '#ca8a04', accepted: '#15803d', rejected: '#dc2626', withdrawn: '#64748b',
};

// Defined at module scope — stable reference prevents remounting on every parent re-render
function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${COLORS.border}50` }}>
            <span style={{ fontSize: '13px', color: COLORS.textMuted, fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value || '—'}</span>
        </div>
    );
}

export default function CandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);
    const [candidate, setCandidate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [scoringApp, setScoringApp] = useState<number | null>(null);

    // AI CV QA State
    const [isQaOpen, setIsQaOpen] = useState(true);
    const [qaMessages, setQaMessages] = useState<{ role: 'ai' | 'user', content: string }[]>([
        { role: 'ai', content: "Ask me anything about this CV. I'll only use information from the document." }
    ]);
    const [qaInput, setQaInput] = useState('');
    const [isQaTyping, setIsQaTyping] = useState(false);
    const qaMessagesEndRef = useRef<HTMLDivElement>(null);

    // CV Zoom Modal State
    const [isZoomOpen, setIsZoomOpen] = useState(false);

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

    const scrollToBottom = () => {
        qaMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isQaOpen) {
            scrollToBottom();
        }
    }, [qaMessages, isQaOpen]);

    const handleUpdateStatus = async (appId: number, status: string) => {
        try {
            await apiClient.put(`/api/client/candidates/${id}/status`, {
                application_id: appId,
                status: status,
            });
            const data = await getCandidateDetail(id);
            setCandidate(data);
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setAddingNote(true);
        try {
            await apiClient.post(`/api/client/candidates/${id}/notes`, { content: newNote });
            setNewNote('');
            const notesRes = await apiClient.get(`/api/client/candidates/${id}/notes`);
            setNotes(notesRes.data.notes);
        } catch (err) {
            console.error('Failed to add note:', err);
        } finally {
            setAddingNote(false);
        }
    };

    const askQaQuestion = async (query: string) => {
        if (!query.trim()) return;

        setQaMessages(prev => [...prev, { role: 'user', content: query }]);
        setQaInput('');
        setIsQaTyping(true);

        try {
            const res = await apiClient.post(`/api/client/ai/ask-cv`, {
                candidate_id: id,
                question: query
            });
            setQaMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
        } catch (err) {
            setQaMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't summarize that right now." }]);
        } finally {
            setIsQaTyping(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '80px 0', color: COLORS.textMuted }}>Loading...</div>;
    }

    if (!candidate) return null;

    // Build CV URL with auth token for iframe/window.open (can't use Authorization header)
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const cvUrlWithToken = candidate.cv_url && candidate.cv_url.includes('/api/cv/') && accessToken
        ? candidate.cv_url + (candidate.cv_url.includes('?') ? '&' : '?') + `token=${accessToken}`
        : candidate.cv_url;
    const cvSrc = cvUrlWithToken
        ? (cvUrlWithToken.includes('#') ? cvUrlWithToken : `${cvUrlWithToken}#toolbar=1&view=FitH`)
        : null;

    return (
        <div style={{ maxWidth: '1300px', margin: '0 auto', position: 'relative' }}>
            {/* Hero Section */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '24px', padding: '28px 32px',
                background: '#FFFFFF', borderRadius: '16px', border: `1px solid ${COLORS.border}`,
                marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flexWrap: 'wrap'
            }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', fontWeight: 700, color: '#fff', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(74, 107, 80, 0.2)',
                }}>
                    {candidate.name?.charAt(0) || 'C'}
                </div>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 6px', lineHeight: 1.2 }}>{candidate.name}</h1>
                    <div style={{ fontSize: '15px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {candidate.current_title || candidate.desired_role || 'Candidate'}
                        <span style={{
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
                            background: candidate.status === 'assigned' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: candidate.status === 'assigned' ? '#3b82f6' : '#10b981'
                        }}>
                            {candidate.status === 'assigned' ? 'Assigned' : 'Available'}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => router.push('/client/candidates')} style={{
                        padding: '10px 20px', background: '#FFFFFF', border: `1px solid ${COLORS.border}`,
                        borderRadius: '10px', color: COLORS.textSecondary, fontSize: '14px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        Back
                    </button>
                </div>
            </div>

            {/* Quick Contact Chips */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <a href={`mailto:${candidate.email}`} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                    background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '12px',
                    textDecoration: 'none', color: COLORS.textPrimary, flex: 1, minWidth: '240px',
                    transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mail size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: COLORS.textMuted, fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{candidate.email || '—'}</div>
                    </div>
                </a>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                    background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '12px',
                    color: COLORS.textPrimary, flex: 1, minWidth: '240px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 211, 102, 0.1)', color: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Phone size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: COLORS.textMuted, fontWeight: 600 }}>Phone</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{candidate.phone || '—'}</div>
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                    background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '12px',
                    color: COLORS.textPrimary, flex: 1, minWidth: '240px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(224, 168, 0, 0.1)', color: '#E0A800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: COLORS.textMuted, fontWeight: 600 }}>Location</div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{candidate.location || '—'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px', '@media (minWidth: 1024px)': { gridTemplateColumns: '1.2fr 1.3fr' } } as any}>

                {/* LEFT SIDE: Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Personal Information */}
                    <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                            <User size={16} /> Personal Information
                        </div>
                        <div>
                            <InfoRow label="Availability" value={candidate.availability} />
                            <InfoRow label="Notice Period" value={candidate.notice_period} />
                            <InfoRow label="Date Added" value={candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : ''} />
                            <InfoRow label="Work Authorization" value={candidate.work_authorization} />
                        </div>
                    </div>

                    {/* Professional Details */}
                    <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                            <Briefcase size={16} /> Professional Details
                        </div>
                        <div>
                            <InfoRow label="Current Company" value={candidate.current_company} />
                            <InfoRow label="Total Experience" value={candidate.years_of_experience ? `${candidate.years_of_experience} yrs` : ''} />
                            <InfoRow label="Desired Role" value={candidate.desired_role} />
                            <InfoRow label="Desired Location" value={candidate.desired_location} />
                            <InfoRow label="Salary Expectation" value={candidate.salary_expectation} />
                        </div>
                    </div>

                    {/* Skills & Certs */}
                    <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
                            <GraduationCap size={16} /> Skills & Qualifications
                        </div>
                        <div style={{ padding: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', marginTop: 0 }}>Core Skills</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                {candidate.skills ? candidate.skills.split(',').map((s: string) => (
                                    <span key={s} style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(74, 107, 80, 0.1)', color: COLORS.primary, fontWeight: 600 }}>{s.trim()}</span>
                                )) : <span style={{ fontSize: '13px', color: COLORS.textMuted }}>No skills listed</span>}
                            </div>

                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', marginTop: 0 }}>Education</h4>
                            <div style={{ fontSize: '14px', color: COLORS.textPrimary }}>{candidate.education || '—'}</div>

                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '8px', marginTop: '20px' }}>Certifications</h4>
                            <div style={{ fontSize: '14px', color: COLORS.textPrimary }}>{candidate.certifications || '—'}</div>
                        </div>
                    </div>

                    {/* Private Notes */}
                    <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}`, background: '#f8fafc' }}>
                            Internal Notes
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                                {notes.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No internal notes saved yet.</div>
                                ) : notes.map((note) => (
                                    <div key={note.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${COLORS.border}40` }}>
                                        <div style={{ fontSize: '14px', color: COLORS.textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{note.content}</div>
                                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '6px' }}>{new Date(note.created_at).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleAddNote}>
                                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a private note..." rows={3}
                                    style={{ width: '100%', padding: '12px', background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textPrimary, fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '12px', fontFamily: "Inter, sans-serif" }} />
                                <button type="submit" disabled={addingNote || !newNote.trim()}
                                    style={{ width: '100%', padding: '10px', background: COLORS.primary, border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !newNote.trim() ? 0.6 : 1, transition: 'all 0.15s' }}>
                                    {addingNote ? 'Saving...' : 'Save Note'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: AI Chat & CV Viewer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {cvUrlWithToken && (
                        <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <div
                                onClick={() => setIsQaOpen(!isQaOpen)}
                                style={{
                                    padding: '16px 20px', background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bot size={20} />
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>Ask AI About This CV</span>
                                </div>
                                {isQaOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>

                            {isQaOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
                                    <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: `1px solid ${COLORS.border}`, background: '#f8fafc' }}>
                                        <button onClick={() => askQaQuestion("Provide a comprehensive summary of this CV")} style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, background: 'white', borderRadius: '20px', fontSize: '12px', color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>
                                            <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} /> Summarize CV
                                        </button>
                                        <button onClick={() => askQaQuestion("What is the candidate's work experience?")} style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, background: 'white', borderRadius: '20px', fontSize: '12px', color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>
                                            <Briefcase size={12} style={{ display: 'inline', marginRight: '4px' }} /> Work Experience
                                        </button>
                                        <button onClick={() => askQaQuestion("What are the candidate's key skills?")} style={{ padding: '6px 12px', border: `1px solid ${COLORS.border}`, background: 'white', borderRadius: '20px', fontSize: '12px', color: COLORS.primary, cursor: 'pointer', fontWeight: 500 }}>
                                            <GraduationCap size={12} style={{ display: 'inline', marginRight: '4px' }} /> Skills
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
                                        {qaMessages.map((msg, i) => (
                                            <div key={i} style={{
                                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                background: msg.role === 'user' ? COLORS.primary : 'white',
                                                color: msg.role === 'user' ? 'white' : '#333',
                                                padding: '10px 14px', borderRadius: '12px',
                                                maxWidth: '85%', fontSize: '14px', lineHeight: 1.5,
                                                border: msg.role === 'ai' ? `1px solid ${COLORS.border}` : 'none',
                                                boxShadow: msg.role === 'ai' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
                                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                                                borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '12px',
                                            }}>
                                                {msg.role === 'ai' && i === 0 && <FileQuestion size={16} color={COLORS.primary} style={{ marginBottom: "6px" }} />}
                                                <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                            </div>
                                        ))}
                                        {isQaTyping && (
                                            <div style={{ alignSelf: 'flex-start', background: 'white', padding: '10px 18px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
                                                <span style={{ fontSize: '12px', color: COLORS.textMuted }}>AI is typing...</span>
                                            </div>
                                        )}
                                        <div ref={qaMessagesEndRef} />
                                    </div>
                                    <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.border}`, background: 'white', display: 'flex', gap: '10px' }}>
                                        <input
                                            value={qaInput}
                                            onChange={e => setQaInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && askQaQuestion(qaInput)}
                                            placeholder="Ask about this CV..."
                                            style={{ flex: 1, padding: '10px 16px', borderRadius: '24px', border: `1px solid ${COLORS.border}`, outline: 'none', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}
                                        />
                                        <button
                                            onClick={() => askQaQuestion(qaInput)}
                                            disabled={!qaInput.trim() || isQaTyping}
                                            style={{ width: '40px', height: '40px', borderRadius: '20px', background: COLORS.primary, color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !qaInput.trim() || isQaTyping ? 0.6 : 1 }}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '14px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                        <div style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                <FileText size={16} /> Document Viewer
                            </div>
                            {cvUrlWithToken && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setIsZoomOpen(true)} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Maximize2 size={13} /> Zoom
                                    </button>
                                    <button onClick={() => window.open(cvUrlWithToken, '_blank')} style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ExternalLink size={13} /> Open
                                    </button>
                                </div>
                            )}
                        </div>
                        {cvSrc ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
                                <iframe src={cvSrc} style={{ width: '100%', flex: 1, border: 'none', minHeight: '600px' }} />
                                <div style={{ padding: '12px 20px', background: '#FFFFFF', borderTop: `1px solid ${COLORS.border}` }}>
                                    <button style={{ padding: '10px 16px', background: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textPrimary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                                        <Download size={14} /> Download Document
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '80px 20px', textAlign: 'center', color: COLORS.textMuted, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ marginBottom: '16px', opacity: 0.2, color: COLORS.textMuted }}><FileText size={48} /></div>
                                <div style={{ fontSize: '15px', fontWeight: 500 }}>No CV Document Available</div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* CV Fullscreen Zoom Modal */}
            {isZoomOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    padding: '24px', backdropFilter: 'blur(4px)'
                }} onClick={() => setIsZoomOpen(false)}>

                    <div style={{
                        width: '100%', maxWidth: '1200px', height: '100%', background: '#FFFFFF', borderRadius: '16px',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '16px' }}>
                                <FileText size={18} color={COLORS.primary} />
                                {candidate.name} — CV Preview
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => window.open(cvUrlWithToken, '_blank')} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ExternalLink size={14} /> Open in New Tab
                                </button>
                                <button onClick={() => setIsZoomOpen(false)} style={{ padding: '8px 16px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <X size={14} /> Close
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, background: '#e5e7eb' }}>
                            <iframe src={cvSrc || ''} style={{ width: '100%', height: '100%', border: 'none' }} />
                        </div>

                    </div>

                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}} />
        </div>
    );
}


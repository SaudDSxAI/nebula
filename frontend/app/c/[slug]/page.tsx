'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, FileText, MessageSquare, Settings2, CheckCircle2, AlertCircle, Upload, ClipboardList, Edit3, Save, X, Briefcase, MapPin, Phone, Mail, Globe, Linkedin, Award, Clock, DollarSign, Shield, Eye, Languages, GraduationCap, Send, Trash2, Download, Calendar, ChevronRight, Paperclip } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api/base';

const API = API_BASE_URL;

type Screen = 'cv' | 'login' | 'invite' | 'dashboard';
type DashTab = 'profile' | 'documents' | 'messages' | 'settings';

interface ClientInfo {
    id: number; company_name: string; slug: string; logo_url: string | null;
    website: string | null; phone: string | null;
    portal_headline: string | null; portal_tagline: string | null; portal_contact_email: string | null;
    portal_stat1_num: string | null; portal_stat1_label: string | null;
    portal_stat2_num: string | null; portal_stat2_label: string | null;
    portal_stat3_num: string | null; portal_stat3_label: string | null;
    // Logo adjustments
    logo_scale: string | null; logo_offset_x: number | null; logo_offset_y: number | null;
}

/** Resolve logo URL — FastAPI serves /static/logos/* from port 8000, not Next.js port 3000 */
const logoSrc = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/static/') || url.startsWith('/uploads/')) return `${API}${url}`;
    return url; // already absolute (http/https)
};

/** Build CSS style for zoomed/panned logo inside a clipping container */
const logoStyle = (scale: string | null, ox: number | null, oy: number | null): React.CSSProperties => ({
    transform: `translate(${ox ?? 0}px, ${oy ?? 0}px) scale(${scale ?? 1})`,
    transformOrigin: 'center center',
    transition: 'transform 0.2s',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
});
interface Profile {
    id: number; name: string; email: string; phone: string | null; location: string | null;
    nationality: string | null; current_title: string | null; current_company: string | null;
    current_job_status: string | null; years_of_experience: number | null;
    experience_in_gulf: string | null; skills: string | null; availability: string | null;
    work_authorization: string | null; visa_status: string | null;
    major_qualifications: string | null; certifications_text: string | null;
    languages: string | null; linkedin_url: string | null; portfolio_url: string | null;
    salary_expectation: string | null; desired_role: string | null; desired_location: string | null;
    remote_preference: string | null; notice_period: string | null; company_name: string | null;
    education: string | null; certifications: string | null; ai_summary: string | null;
    tags: string | null; source: string | null;
    created_at: string | null; updated_at: string | null;
}
interface CvMessage { role: 'user' | 'assistant'; content: string; }
interface Msg { id: number; sender_type: string; sender_name: string; message: string; is_read: boolean; created_at: string | null; }

const C = {
    bg: '#0F0F0F', card: '#1F1F1F', border: 'rgba(255,255,255,0.09)',
    accent: '#5D8564', accentHover: '#4A6B50', accentLight: 'rgba(93,133,100,0.15)',
    gold: '#E0A800', text: '#FFFFFF', muted: '#CCCCCC',
    success: '#4ADE80', warning: '#E0A800', danger: '#D64545',
    input: '#1F1F1F', white: '#FFFFFF',
};

export default function CandidatePortal() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [client, setClient] = useState<ClientInfo | null>(null);
    const [screen, setScreen] = useState<Screen>('cv');
    const [token, setToken] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<any>(null);
    const [initialized, setInitialized] = useState(false);
    const [clientLoadError, setClientLoadError] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/portal/${slug}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(data => { setClient(data); setClientLoadError(false); })
            .catch(() => setClientLoadError(true));
    }, [slug]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const invite = urlParams.get('invite');
        const tabParam = urlParams.get('tab');
        if (invite) {
            fetch(`${API}/api/candidate/${slug}/invite-info?token=${encodeURIComponent(invite)}`)
                .then(r => r.json())
                .then(data => { setInviteToken(invite); setInviteData(data); setScreen('invite'); })
                .catch(() => setScreen('login'));
            setInitialized(true);
            return;
        }
        const t = localStorage.getItem('candidate_token');
        const s = localStorage.getItem('candidate_slug');
        if (t && s === slug) { setToken(t); setScreen('dashboard'); }
        else if (tabParam === 'login') { setScreen('login'); }
        setInitialized(true);
    }, [slug]);

    const showToast = (msg: any) => {
        const str = typeof msg === 'string' ? msg : (msg?.message || msg?.detail || String(msg || ''));
        setToast(str);
        setTimeout(() => setToast(''), 3500);
    };

    const handleAuthSuccess = (t: string) => {
        localStorage.setItem('candidate_token', t);
        localStorage.setItem('candidate_slug', slug);
        setToken(t);
        window.history.replaceState({}, '', window.location.pathname);
        setScreen('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('candidate_token');
        localStorage.removeItem('candidate_slug');
        setToken(null); setScreen('cv');
    };

    if (clientLoadError) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ maxWidth: 520, width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
                    <AlertCircle size={36} color={C.warning} style={{ marginBottom: 10 }} />
                    <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Portal unavailable</h2>
                    <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                        This candidate link is invalid, inactive, or temporarily unavailable.
                    </p>
                </div>
            </div>
        );
    }

    if (!client || !initialized) return <Spinner />;

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text }}>
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 1000,
                    background: String(toast).startsWith('\u2705') ? 'rgba(74,222,128,0.15)' : 'rgba(214,69,69,0.15)',
                    border: `1px solid ${String(toast).startsWith('\u2705') ? C.success : C.danger}`,
                    color: String(toast).startsWith('\u2705') ? C.success : C.danger,
                    padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14,
                    backdropFilter: 'blur(10px)',
                }}>{String(toast)}</div>
            )}
            {screen === 'cv' && <CVScreen client={client} onGoLogin={() => setScreen('login')} onAuthSuccess={handleAuthSuccess} onToast={showToast} />}
            {screen === 'login' && <LoginScreen client={client} onAuthSuccess={handleAuthSuccess} onGoCV={() => setScreen('cv')} onToast={showToast} />}
            {screen === 'invite' && inviteData && <InviteScreen client={client} inviteToken={inviteToken!} inviteData={inviteData} onAuthSuccess={handleAuthSuccess} onToast={showToast} />}
            {screen === 'dashboard' && token && <Dashboard client={client} token={token} onLogout={handleLogout} onToast={showToast} />}

        </div>
    );
}

/* CVScreen — exact logic from coter-global-agent */
function CVScreen({ client, onGoLogin, onAuthSuccess, onToast }: {
    client: ClientInfo; onGoLogin: () => void;
    onAuthSuccess: (t: string) => void; onToast: (msg: string) => void;
}) {
    const [view, setView] = useState<'landing' | 'chat'>('landing');
    const [messages, setMessages] = useState<CvMessage[]>([{
        role: 'assistant',
        content: `Hi! I'm the **${client.company_name}** AI Assistant.\n\nYou can:\n• **Upload your CV** (PDF, DOC, DOCX) using the attachment button to start your application\n• **Ask me anything** about the company, roles, or application process\n\nHow can I help you today?`,
    }]);
    const [assistantSessionId] = useState(() => `asst_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => `cv_${Date.now()}_${Math.random().toString(36).slice(2)}`);

    /* missing fields form — rendered as a chat bubble */
    const [missingFields, setMissingFields] = useState<{ name: string; label: string; type?: string }[]>([]);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [showFieldsForm, setShowFieldsForm] = useState(false);

    /* account creation */
    const [profileSummary, setProfileSummary] = useState<any>(null);
    const [showPasswordStep, setShowPasswordStep] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const chatEnd = useRef<HTMLDivElement>(null);

    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showFieldsForm, showPasswordStep]);

    const addMsg = (role: 'user' | 'assistant', text: string) =>
        setMessages(prev => [...prev, { role, content: text }]);

    /* Normalise field items — handle string[] or {name,label}[] */
    const normField = (f: any) =>
        typeof f === 'string'
            ? { name: f, label: f.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) }
            : { name: f.name || f.field || String(f), label: f.label || f.name || String(f) };

    const showFormFor = (rawFields: any[]) => {
        const fields = rawFields.map(normField).filter(f => f.name);
        setMissingFields(fields);
        /* Give each field its OWN key so inputs never share state */
        setFieldValues(Object.fromEntries(fields.map(f => [f.name, ''])));
        setShowFieldsForm(true);
    };

    /*
     * handleResponse — reads the backend response object directly.
     * The new app backend returns:
     *   data.status === 'needs_fields'  → data.missing_fields[] contains form fields
     *   data.status === 'complete'      → data.candidate_data contains extracted profile
     *   otherwise                       → just display data.response text
     */
    const handleResponse = (data: any) => {
        if (data.response) addMsg('assistant', data.response);

        if (data.status === 'needs_fields' && Array.isArray(data.missing_fields) && data.missing_fields.length > 0) {
            showFormFor(data.missing_fields);
        } else if (data.status === 'complete' && data.candidate_data) {
            setProfileSummary(data.candidate_data);
            setTimeout(() => {
                addMsg('assistant', 'Your profile is ready! Setting up your account...');
                setTimeout(() => setShowPasswordStep(true), 1200);
            }, 600);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || loading) return;
        addMsg('user', `Uploaded: ${file.name}`);
        setLoading(true);
        const form = new FormData();
        form.append('file', file); form.append('session_id', sessionId);
        try {
            const res = await fetch(`${API}/api/portal/${client.slug}/cv/upload`, { method: 'POST', body: form });
            const data = await res.json();
            if (res.ok) handleResponse(data);
            else addMsg('assistant', data.detail || 'Error uploading. Try again.');
        } catch (err: any) { addMsg('assistant', `Connection error: ${err?.message || 'Please check your internet and try again.'}`); }
        setLoading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const text = input.trim(); setInput('');
        addMsg('user', text); setLoading(true);
        try {
            const res = await fetch(`${API}/api/portal/${client.slug}/assistant/message`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: assistantSessionId, message: text }),
            });
            const data = await res.json();
            if (res.ok) {
                addMsg('assistant', data.response || 'Sorry, I could not respond.');
            } else {
                addMsg('assistant', data.detail || 'Error. Try again.');
            }
        } catch (err: any) { addMsg('assistant', `Connection error: ${err?.message || 'Please check your internet and try again.'}`); }
        setLoading(false);
    };

    const handleSubmitFields = async () => {
        // Validate — no empty required fields
        const empty = missingFields.filter(f => !fieldValues[f.name]?.trim());
        if (empty.length > 0) { onToast(`Please fill: ${empty.map(f => f.label).join(', ')}`); return; }

        setShowFieldsForm(false);
        setLoading(true);
        addMsg('user', missingFields.map(f => `${f.label}: ${fieldValues[f.name]}`).join(' | '));

        try {
            const res = await fetch(`${API}/api/portal/${client.slug}/cv/submit-fields`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, fields: fieldValues }),
            });
            const data = await res.json();
            if (res.ok) {
                /* submit-fields always returns status:'complete' with candidate_data */
                if (data.response) addMsg('assistant', data.response);
                if (data.candidate_data) {
                    setProfileSummary(data.candidate_data);
                    setTimeout(() => {
                        addMsg('assistant', 'Your profile is ready! Setting up your account...');
                        setTimeout(() => setShowPasswordStep(true), 1200);
                    }, 600);
                }
            } else {
                addMsg('assistant', data.detail || 'Error submitting. Try again.');
            }
        } catch (err: any) { addMsg('assistant', `Connection error: ${err?.message || 'Please check your internet and try again.'}`); }
        setLoading(false);
    };

    const inp2: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

    /* ── LANDING PAGE ── */
    if (view === 'landing') {
        return (
            <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: 28, textAlign: 'center' }}>
                    {client.logo_url
                        ? <div style={{ height: 64, overflow: 'hidden', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={logoSrc(client.logo_url)!} alt={client.company_name} style={{ ...logoStyle(client.logo_scale, client.logo_offset_x, client.logo_offset_y), height: 64 }} />
                        </div>
                        : <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(74,107,80,0.15)', margin: '0 auto' }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>{client.company_name[0]}</span>
                        </div>
                    }
                </div>
                <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, textAlign: 'center', margin: '0 0 16px', lineHeight: 1.15, maxWidth: 600 }}>
                    {client.portal_headline
                        ? client.portal_headline
                        : <>Your <span style={{ color: C.gold }}>{client.company_name}</span> Career<br />Starts Here</>}
                </h1>
                <p style={{ fontSize: 16, color: C.muted, textAlign: 'center', maxWidth: 480, margin: '0 0 40px', lineHeight: 1.6 }}>
                    {client.portal_tagline || 'Upload your CV and let our AI build your professional profile in seconds'}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 mb-10 w-full">
                    {[
                        { num: client.portal_stat1_num || '500+', label: client.portal_stat1_label || 'PLACEMENTS' },
                        { num: client.portal_stat2_num || 'AI', label: client.portal_stat2_label || 'POWERED' },
                        { num: client.portal_stat3_num || '24/7', label: client.portal_stat3_label || 'ACCESS' },
                    ].map((s, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-center">
                            <div className="text-center px-0 sm:px-7">
                                <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{s.num}</div>
                                <div style={{ fontSize: 10, color: C.muted, letterSpacing: '0.12em', marginTop: 2 }}>{s.label}</div>
                            </div>
                            {i < 2 && <div className="hidden sm:block" style={{ width: 1, height: 36, background: C.border }} />}
                        </div>
                    ))}
                </div>
                <div style={{ width: '100%', maxWidth: 420, marginBottom: 14 }}>
                    <button onClick={() => setView('chat')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,107,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 2 }}>Apply Now</div>
                            <div style={{ fontSize: 13, color: C.muted }}>Upload your CV — AI does the rest</div>
                        </div>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" />
                            </svg>
                        </div>
                    </button>
                </div>
                <button onClick={onGoLogin}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 14, cursor: 'pointer', width: '100%', maxWidth: 420 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.muted}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{ fontSize: 13, color: C.muted }}>Already applied? <span style={{ color: C.text, fontWeight: 600 }}>Sign in</span></span>
                    <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" />
                    </svg>
                </button>
            </div>
        );
    }

    /* ── CV CHAT ── */
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex flex-wrap items-center gap-3 p-3.5 sm:px-5 border-b border-[rgba(255,255,255,0.09)] bg-[#1F1F1F]">
                {client.logo_url
                    ? <div style={{ height: 32, overflow: 'hidden', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={logoSrc(client.logo_url)!} alt="" style={logoStyle(client.logo_scale, client.logo_offset_x, client.logo_offset_y)} />
                    </div>
                    : <div style={{ width: 34, height: 34, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: C.white }}>{client.company_name[0]}</div>
                }
                <div className="hidden sm:block">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{client.company_name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>AI Assistant & CV Evaluator</div>
                </div>
                <div className="flex-1 min-w-[20px]" />
                <button onClick={() => setView('landing')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Back</button>
                <button onClick={onGoLogin} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px 16px' }}>
                <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>
                            {m.role === 'assistant' && (
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.white }}>AI</div>
                            )}
                            <div style={{ maxWidth: '78%', padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.6, background: m.role === 'user' ? C.accent : C.card, color: C.text, borderTopLeftRadius: m.role === 'assistant' ? 4 : 16, borderTopRightRadius: m.role === 'user' ? 4 : 16, border: `1px solid ${m.role === 'user' ? 'transparent' : C.border}` }}>
                                {renderMd(m.content)}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: C.white }}>AI</div>
                            <div style={{ padding: '12px 20px', borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, display: 'flex', gap: 5 }}>
                                {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.muted, display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                            </div>
                        </div>
                    )}

                    {/* Missing Fields Form — rendered in chat like coter-global-agent */}
                    {showFieldsForm && missingFields.length > 0 && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.white }}>AI</div>
                            <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, borderTopLeftRadius: 4, padding: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.gold }}>
                                    <ClipboardList size={15} color={C.gold} /> Missing Information
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Please complete the following fields to continue:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {missingFields.map(field => (
                                        <div key={field.name}>
                                            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                                            <input
                                                type={field.type || 'text'}
                                                value={fieldValues[field.name] || ''}
                                                onChange={e => setFieldValues(p => ({ ...p, [field.name]: e.target.value }))}
                                                placeholder={`Enter ${field.label}...`}
                                                data-field={field.name}
                                                style={inp2}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSubmitFields}
                                    style={{ marginTop: 14, width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: C.accent, color: C.white, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                    📤 Submit Information
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Password / Account Creation */}
                    {showPasswordStep && (
                        <PasswordStep client={client} profileSummary={profileSummary} onAuthSuccess={onAuthSuccess} onToast={onToast} />
                    )}
                    <div ref={chatEnd} />
                </div>
            </div>

            {!showPasswordStep && !showFieldsForm && (
                <div className="p-3 sm:p-4 border-t border-[rgba(255,255,255,0.09)] bg-[#1F1F1F]">
                    <div className="flex gap-2 sm:gap-2.5 max-w-2xl mx-auto">
                        <button onClick={() => fileRef.current?.click()} title="Upload CV"
                            style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: C.input, color: C.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                            <Paperclip size={18} />
                        </button>
                        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask a question or attach your CV..." disabled={loading}
                            style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 14, outline: 'none' }} />
                        <button onClick={handleSend} disabled={!input.trim() || loading}
                            style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: C.accent, color: C.white, fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: !input.trim() || loading ? 0.4 : 1 }}>
                            Send
                        </button>
                    </div>
                </div>
            )}
            <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
        </div>
    );
}

function renderMd(text: string) {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
    return <>{parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em' }}>{p.slice(1, -1)}</code>;
        if (p === '\n') return <br key={i} />;
        return <span key={i}>{p}</span>;
    })}</>;
}

function Spinner() {
    return (
        <div style={{ minHeight: '100vh', background: '#0F0F0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: `3px solid #4A6B50`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}

function PasswordStep({ client, profileSummary, onAuthSuccess, onToast }: {
    client: ClientInfo; profileSummary: any;
    onAuthSuccess: (t: string) => void; onToast: (m: string) => void;
}) {
    const get = (d: any, ...keys: string[]) => { for (const k of keys) if (d?.[k]) return d[k]; return ''; };
    const name = get(profileSummary, 'name', 'Name', 'full_name');
    const email = get(profileSummary, 'email', 'Email');
    const phone = get(profileSummary, 'phone', 'Phone', 'Phone Number', 'Phone_Number');

    const [emailVal, setEmailVal] = useState(email);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const inp: React.CSSProperties = {
        width: '100%', padding: '11px 13px', borderRadius: 10,
        border: `1px solid ${C.border}`, background: C.input,
        color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box'
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailVal) { onToast('Please enter your email'); return; }
        if (password.length < 6) { onToast('Password must be at least 6 characters'); return; }
        if (password !== confirm) { onToast('Passwords do not match'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/candidate/${client.slug}/signup`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name || emailVal.split('@')[0],
                    email: emailVal, password,
                    phone: phone || undefined,
                    current_title: get(profileSummary, 'role', 'Role/Position', 'current_title', 'JobTitle') || undefined,
                    location: get(profileSummary, 'location', 'current_location', 'Location') || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                const detail = typeof data.detail === 'string' ? data.detail
                    : Array.isArray(data.detail) ? data.detail.map((e: any) => e.msg || String(e)).join(', ')
                        : 'Signup failed';
                onToast(detail);
                setLoading(false);
                return;
            }
            onToast('Account created successfully. Welcome!');
            onAuthSuccess(data.access_token);
        } catch (err: any) { onToast(`Connection error: ${err?.message || 'Please try again.'}`); }
        setLoading(false);
    };

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 14, background: 'rgba(74,222,128,0.08)', borderRadius: 10, border: '1px solid rgba(74,222,128,0.2)' }}>
                <CheckCircle2 size={22} color={C.success} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.success }}>CV Evaluated Successfully!</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Create your account to save your profile</div>
                </div>
            </div>
            {profileSummary && (
                <div className="bg-[#1F1F1F] rounded-[10px] p-3 sm:p-3.5 mb-4 text-[13px] grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-5">
                    {name && <span><span style={{ color: C.muted }}>Name: </span><strong>{name}</strong></span>}
                    {phone && <span><span style={{ color: C.muted }}>Phone: </span>{phone}</span>}
                    {get(profileSummary, 'role', 'Role/Position', 'current_title') && <span><span style={{ color: C.muted }}>Role: </span>{get(profileSummary, 'role', 'Role/Position', 'current_title')}</span>}
                    {get(profileSummary, 'location', 'current_location') && <span><span style={{ color: C.muted }}>Location: </span>{get(profileSummary, 'location', 'current_location')}</span>}
                </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                    <input type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} required placeholder="your@email.com" style={inp} />
                </div>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" style={inp} />
                </div>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={inp} />
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: 4, padding: '13px', borderRadius: 10, border: 'none', background: C.accent, color: C.white, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Creating Account...' : 'Create Account & Continue →'}
                </button>
            </form>
        </div>
    );
}

function InviteScreen({ client, inviteToken, inviteData, onAuthSuccess, onToast }: {
    client: ClientInfo; inviteToken: string; inviteData: any;
    onAuthSuccess: (t: string) => void; onToast: (m: string) => void;
}) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const inp: React.CSSProperties = {
        width: '100%', padding: '11px 13px', borderRadius: 10,
        border: `1px solid ${C.border}`, background: C.input,
        color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box'
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) { onToast('Password must be at least 6 characters'); return; }
        if (password !== confirm) { onToast('Passwords do not match'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/candidate/${client.slug}/accept-invite`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: inviteToken, password }),
            });
            const data = await res.json();
            if (!res.ok) { onToast(data.detail || 'Failed to set password'); setLoading(false); return; }
            onToast('Account activated! Welcome.');
            onAuthSuccess(data.access_token);
        } catch (err: any) { onToast(`Connection error: ${err?.message || 'Please try again.'}`); }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: 20, padding: 32, border: `1px solid ${C.border}` }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.accentLight, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <User size={24} color={C.accent} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>You're Invited!</h2>
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                        {inviteData?.name ? `Hi ${inviteData.name}, set` : 'Set'} a password to activate your account at <strong>{client.company_name}</strong>
                    </p>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" style={inp} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" style={inp} />
                    </div>
                    <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 10, border: 'none', background: C.accent, color: C.white, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                        {loading ? 'Activating...' : 'Activate Account →'}
                    </button>
                </form>
            </div>
        </div>
    );
}

function LoginScreen({ client, onAuthSuccess, onGoCV, onToast }: {
    client: ClientInfo; onAuthSuccess: (t: string) => void;
    onGoCV: () => void; onToast: (m: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isDeleted, setIsDeleted] = useState(false);
    const inp: React.CSSProperties = {
        width: '100%', padding: '12px 14px', borderRadius: 10,
        border: `1px solid ${C.border}`, background: C.input,
        color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box'
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setLoginError('Please fill in all fields'); return; }
        setLoading(true);
        setLoginError('');
        setIsDeleted(false);
        try {
            const res = await fetch(`${API}/api/candidate/${client.slug}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                const detail = Array.isArray(data.detail)
                    ? data.detail.map((e: any) => e.msg || String(e)).join(', ')
                    : (data.detail || 'Invalid credentials');
                // Detect deleted account (403)
                if (res.status === 403) setIsDeleted(true);
                setLoginError(detail);
                setLoading(false);
                return;
            }
            onToast('Welcome back!');
            onAuthSuccess(data.access_token);
        } catch (err: any) { setLoginError(`Connection error: ${err?.message || 'Please try again.'}`); }
        setLoading(false);
    };


    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 420, background: C.card, borderRadius: 20, padding: 32, border: `1px solid ${C.border}` }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    {client.logo_url
                        ? <div style={{ height: 48, marginBottom: 16, overflow: 'hidden', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={logoSrc(client.logo_url)!} alt="" style={{ ...logoStyle(client.logo_scale, client.logo_offset_x, client.logo_offset_y), height: 48 }} />
                        </div>
                        : <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.accentLight, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22, fontWeight: 900, color: C.accent }}>{client.company_name[0]}</div>
                    }
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Welcome Back</h2>
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Sign in to your {client.company_name} candidate portal</p>
                </div>

                {/* Deleted account warning */}
                {isDeleted && (
                    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 12, background: 'rgba(214,69,69,0.1)', border: '1px solid rgba(214,69,69,0.4)', color: '#f87171' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Account Deactivated</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>{loginError}</div>
                    </div>
                )}

                {/* Generic error */}
                {loginError && !isDeleted && (
                    <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(214,69,69,0.08)', border: '1px solid rgba(214,69,69,0.3)', color: '#f87171', fontSize: 13 }}>
                        {loginError}
                    </div>
                )}

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={inp} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password" style={inp} />
                    </div>
                    <button type="submit" disabled={loading || isDeleted} style={{ marginTop: 4, padding: '13px', borderRadius: 10, border: 'none', background: isDeleted ? '#4B3030' : C.accent, color: C.white, fontWeight: 700, fontSize: 15, cursor: loading || isDeleted ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                        {loading ? 'Signing in...' : 'Sign In →'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
                    Don't have an account?{' '}
                    <button onClick={onGoCV} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Apply with CV</button>
                </div>
            </div>
        </div>
    );
}

function Dashboard({ client, token, onLogout, onToast }: {
    client: ClientInfo; token: string; onLogout: () => void; onToast: (m: string) => void;
}) {
    const [tab, setTab] = useState<DashTab>('profile');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const authFetch = useCallback((url: string, opts: RequestInit = {}) =>
        fetch(url, { ...opts, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } }),
        [token]);

    const loadProfile = useCallback(() => {
        authFetch(`${API}/api/candidate/me`)
            .then(r => { if (!r.ok) throw new Error('unauth'); return r.json(); })
            .then(d => { setProfile(d); setLoading(false); })
            .catch(() => onLogout());
    }, [authFetch]);

    useEffect(() => { loadProfile(); }, []);

    const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Profile', icon: <User size={16} /> },
        { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
        { id: 'messages', label: 'Messages', icon: <MessageSquare size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings2 size={16} /> },
    ];

    if (loading && !profile) return <Spinner />;

    const completion = profile ? (() => {
        const fields = ['name', 'email', 'phone', 'location', 'nationality', 'current_title', 'skills', 'availability', 'visa_status', 'linkedin_url', 'languages', 'years_of_experience'];
        const filled = fields.filter(f => (profile as any)[f]);
        return Math.round((filled.length / fields.length) * 100);
    })() : 0;
    const initials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

    return (
        <div style={{ minHeight: '100vh', background: C.bg }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .dash-tab:hover { background: rgba(255,255,255,0.04) !important; }
                .stat-card:hover { border-color: rgba(74,107,80,0.4) !important; transform: translateY(-2px); }
            `}</style>
            {/* Header */}
            <div className="px-4 py-3 sm:py-0 sm:px-6 border-b border-[rgba(255,255,255,0.09)] bg-[#1F1F1F]">
                <div className="flex flex-wrap items-center justify-between gap-4 max-w-4xl mx-auto min-h-[64px]">
                    <div className="flex items-center gap-3">
                        {client.logo_url
                            ? <div style={{ height: 32, overflow: 'hidden', borderRadius: 8, display: 'inline-flex', alignItems: 'center' }}>
                                <img src={logoSrc(client.logo_url)!} alt="" style={logoStyle(client.logo_scale, client.logo_offset_x, client.logo_offset_y)} />
                            </div>
                            : <div style={{ width: 34, height: 34, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.white, fontSize: 14 }}>{client.company_name[0]}</div>
                        }
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{client.company_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.white, fontSize: 13 }}>{initials}</div>
                        <span className="hidden sm:inline" style={{ fontSize: 13, color: C.muted }}>{profile?.name || profile?.email || ''}</span>
                        <button onClick={onLogout} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>Logout</button>
                    </div>
                </div>
            </div>

            {/* Profile Hero */}
            <div className="px-5 py-6 sm:px-6 sm:py-7 border-b border-[rgba(255,255,255,0.09)]" style={{ background: `linear-gradient(135deg, rgba(74,107,80,0.12) 0%, rgba(74,107,80,0.02) 100%)` }}>
                <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Avatar + Info */}
                    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flex: 1, minWidth: 280 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}, #3A5540)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.white, fontSize: 22, flexShrink: 0, boxShadow: '0 4px 16px rgba(74,107,80,0.3)' }}>{initials}</div>
                        <div>
                            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{profile?.name || 'Welcome!'}</h2>
                            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 6px' }}>
                                {profile?.current_title || 'Complete your profile to get started'}
                                {profile?.current_company && <span> at {profile.current_company}</span>}
                            </p>
                            {memberSince && <span style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>Member since {memberSince}</span>}
                        </div>
                    </div>

                    {/* Stat Cards */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Profile', value: `${completion}%`, icon: <User size={16} />, color: C.accent },
                            { label: 'Experience', value: profile?.years_of_experience ? `${profile.years_of_experience} yrs` : '—', icon: <Briefcase size={16} />, color: C.gold },
                            { label: 'Status', value: profile?.availability || 'Available', icon: <Clock size={16} />, color: '#4ADE80' },
                        ].map((s, i) => (
                            <div key={i} className="stat-card" style={{ minWidth: 110, background: C.card, borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.border}`, transition: 'all 0.25s ease', cursor: 'default' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                                    <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Profile Strength */}
                <div style={{ maxWidth: 960, margin: '18px auto 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
                        <span>Profile Strength</span>
                        <span style={{ color: completion >= 80 ? '#4ADE80' : completion >= 50 ? C.gold : '#f87171' }}>{completion}%{completion < 50 ? ' — Add more details' : completion < 80 ? ' — Almost there!' : ' — Looking great!'}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${completion}%`, background: completion >= 80 ? 'linear-gradient(90deg, #4ADE80, #22C55E)' : completion >= 50 ? `linear-gradient(90deg, ${C.gold}, #F59E0B)` : 'linear-gradient(90deg, #f87171, #EF4444)', borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="overflow-x-auto hide-scrollbar border-b border-[rgba(255,255,255,0.09)] bg-[#1F1F1F]">
                <div className="flex gap-0 px-4 sm:px-6 max-w-4xl mx-auto w-max sm:w-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} className="dash-tab shrink-0"
                            style={{ padding: '15px 22px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}`, color: tab === t.id ? C.text : C.muted, fontWeight: tab === t.id ? 700 : 500, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', borderRadius: '4px 4px 0 0' }}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-7" style={{ animation: 'fadeIn 0.3s ease' }}>
                {tab === 'profile' && <ProfileTab profile={profile} authFetch={authFetch} onToast={onToast} onRefresh={loadProfile} />}
                {tab === 'documents' && <DocumentsTab authFetch={authFetch} onToast={onToast} token={token} />}
                {tab === 'messages' && <MessagesTab authFetch={authFetch} onToast={onToast} />}
                {tab === 'settings' && <SettingsTab authFetch={authFetch} onToast={onToast} />}
            </div>
        </div>
    );
}

function ProfileSectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-[#1F1F1F] rounded-2xl border border-[rgba(255,255,255,0.09)] p-5 sm:p-6 transition-colors duration-200 hover:border-[rgba(255,255,255,0.15)]">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ color: C.accent }}>{icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                {children}
            </div>
        </div>
    );
}

function ProfileField({
    label, field, icon, type = 'text', editing, form, profile, setForm, inputStyle,
}: {
    label: string;
    field: string;
    icon: React.ReactNode;
    type?: string;
    editing: boolean;
    form: Record<string, any>;
    profile: Profile | null;
    setForm: React.Dispatch<React.SetStateAction<any>>;
    inputStyle: React.CSSProperties;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(74,107,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                {editing
                    ? <input type={type} value={form[field] ?? ''} onChange={e => setForm((p: any) => ({ ...p, [field]: e.target.value }))} style={inputStyle} placeholder={`Enter ${label.toLowerCase()}`} />
                    : <div style={{ fontSize: 14, color: (profile as any)?.[field] ? C.text : 'rgba(255,255,255,0.25)', padding: '4px 0', lineHeight: 1.5 }}>{(profile as any)?.[field] || 'Not provided'}</div>
                }
            </div>
        </div>
    );
}

function ProfileTab({ profile, authFetch, onToast, onRefresh }: { profile: Profile | null; authFetch: any; onToast: (m: string) => void; onRefresh: () => void; }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (profile) setForm({ ...profile }); }, [profile]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await authFetch(`${API}/api/candidate/me`, { method: 'PUT', body: JSON.stringify(form) });
            if (res.ok) { onToast('Profile updated successfully'); setEditing(false); onRefresh(); }
            else { const d = await res.json(); onToast(d.detail || 'Save failed'); }
        } catch { onToast('Network error'); }
        setSaving(false);
    };

    const inp: React.CSSProperties = {
        width: '100%', padding: '10px 13px', borderRadius: 10, border: `1px solid rgba(255,255,255,0.12)`,
        background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, background 0.2s',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Action bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div style={{ fontSize: 13, color: C.muted }}>
                    {editing ? <><Edit3 size={13} style={{ display: 'inline', marginRight: 4 }} /> Edit mode — update your details below</> : 'View and manage your profile information'}
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {editing ? <>
                        <button onClick={() => { setForm({ ...profile }); setEditing(false); }} className="flex-1 sm:flex-none justify-center" style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}><X size={14} /> Cancel</button>
                        <button onClick={save} disabled={saving} className="flex-1 sm:flex-none justify-center" style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: C.accent, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1, transition: 'all 0.2s' }}><Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button>
                    </> : <button onClick={() => setEditing(true)} className="flex-1 sm:flex-none justify-center" style={{ padding: '9px 22px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(74,107,80,0.08)', color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}><Edit3 size={14} /> Edit Profile</button>}
                </div>
            </div>

            <ProfileSectionCard title="Personal Information" icon={<User size={17} />}>
                <ProfileField label="Full Name" field="name" icon={<User size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Email" field="email" icon={<Mail size={15} color={C.muted} />} type="email" editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Phone" field="phone" icon={<Phone size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Location" field="location" icon={<MapPin size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Nationality" field="nationality" icon={<Globe size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Languages" field="languages" icon={<Languages size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
            </ProfileSectionCard>

            <ProfileSectionCard title="Professional Details" icon={<Briefcase size={17} />}>
                <ProfileField label="Current Title" field="current_title" icon={<Briefcase size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Current Company" field="current_company" icon={<ClipboardList size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Years of Experience" field="years_of_experience" icon={<Clock size={15} color={C.muted} />} type="number" editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Skills" field="skills" icon={<Award size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Education" field="education" icon={<GraduationCap size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Certifications" field="certifications" icon={<Award size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
            </ProfileSectionCard>

            <ProfileSectionCard title="Preferences & Availability" icon={<Clock size={17} />}>
                <ProfileField label="Desired Role" field="desired_role" icon={<Briefcase size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Availability" field="availability" icon={<Clock size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Notice Period" field="notice_period" icon={<Calendar size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Salary Expectation" field="salary_expectation" icon={<DollarSign size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Remote Preference" field="remote_preference" icon={<Globe size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Desired Location" field="desired_location" icon={<MapPin size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
            </ProfileSectionCard>

            <ProfileSectionCard title="Visa & Authorization" icon={<Shield size={17} />}>
                <ProfileField label="Visa Status" field="visa_status" icon={<Shield size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Work Authorization" field="work_authorization" icon={<Shield size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
            </ProfileSectionCard>

            <ProfileSectionCard title="Links & Online Presence" icon={<Globe size={17} />}>
                <ProfileField label="LinkedIn URL" field="linkedin_url" icon={<Linkedin size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
                <ProfileField label="Portfolio / Website" field="portfolio_url" icon={<Globe size={15} color={C.muted} />} editing={editing} form={form} profile={profile} setForm={setForm} inputStyle={inp} />
            </ProfileSectionCard>
        </div>
    );
}

function DocumentsTab({ authFetch, onToast, token }: { authFetch: any; onToast: (m: string) => void; token: string; }) {
    const [cvs, setCvs] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const cvRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        authFetch(`${API}/api/candidate/cv`)
            .then((r: any) => r.json())
            .then((d: any) => setCvs(Array.isArray(d) ? d : (d.cvs || [])))
            .catch(() => { });
    }, []);

    const uploadCV = async (file: File) => {
        setUploading(true);
        const form = new FormData(); form.append('file', file);
        try {
            const res = await fetch(`${API}/api/candidate/cv/upload`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form,
            });
            const d = await res.json();
            if (res.ok) { onToast('CV uploaded successfully'); setCvs(p => [d, ...p]); }
            else onToast(d.detail || 'Upload failed');
        } catch { onToast('Upload error'); }
        setUploading(false);
        if (cvRef.current) cvRef.current.value = '';
    };

    const deleteCV = async (cvId: number) => {
        try {
            const res = await authFetch(`${API}/api/candidate/cv/${cvId}`, { method: 'DELETE' });
            if (res.ok) { setCvs(p => p.filter(c => c.id !== cvId)); onToast('CV deleted'); }
            else onToast('Delete failed');
        } catch { onToast('Network error'); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadCV(file);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Upload Area */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => cvRef.current?.click()}
                className="p-6 sm:p-10 text-center rounded-2xl cursor-pointer transition-all duration-300 ease-in-out"
                style={{
                    background: dragOver ? 'rgba(74,107,80,0.12)' : C.card,
                    border: `2px dashed ${dragOver ? C.accent : C.border}`,
                }}
            >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(74,107,80,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Upload size={24} color={C.accent} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                    {uploading ? 'Uploading...' : 'Drop your CV here or click to browse'}
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Supports PDF, DOC, DOCX • Max 10MB</p>
                <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCV(f); }} style={{ display: 'none' }} />
            </div>

            {/* CV List */}
            {cvs.length > 0 && (
                <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={16} color={C.accent} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Your Documents</span>
                        <span style={{ fontSize: 12, color: C.muted, marginLeft: 'auto' }}>{cvs.length} file{cvs.length !== 1 ? 's' : ''}</span>
                    </div>
                    {cvs.map((cv: any, i: number) => (
                        <div key={cv.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < cvs.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', transition: 'background 0.15s' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,107,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={18} color={C.accent} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.original_filename || cv.filename || 'CV Document'}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                    {cv.created_at ? new Date(cv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {cv.storage_path && (
                                    <a href={`${API}/api/candidate/cv/${cv.id}/download`} target="_blank" rel="noreferrer"
                                        style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, textDecoration: 'none', transition: 'all 0.2s' }}>
                                        <Download size={15} />
                                    </a>
                                )}
                                <button onClick={() => deleteCV(cv.id)}
                                    style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid rgba(214,69,69,0.3)`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {cvs.length === 0 && !uploading && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: 13 }}>
                    <FileText size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <div>No documents uploaded yet</div>
                </div>
            )}
        </div>
    );
}

function MessagesTab({ authFetch, onToast }: { authFetch: any; onToast: (m: string) => void; }) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const chatEnd = useRef<HTMLDivElement>(null);

    const load = () =>
        authFetch(`${API}/api/candidate/messages`)
            .then((r: any) => r.json())
            .then((d: any) => setMessages(d.messages || []))
            .catch(() => { });

    useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = async () => {
        if (!newMsg.trim() || sending) return;
        const txt = newMsg.trim(); setNewMsg(''); setSending(true);
        try {
            const res = await authFetch(`${API}/api/candidate/messages/send`, {
                method: 'POST', body: JSON.stringify({ message: txt }),
            });
            if (res.ok) { await load(); }
            else onToast('Message failed to send');
        } catch { onToast('Network error'); }
        setSending(false);
    };

    return (
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', height: 520, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MessageSquare size={17} color={C.accent} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Messages</span>
                <span className="hidden sm:inline" style={{ fontSize: 12, color: C.muted }}>• Chat with the recruitment team</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0 && (
                    <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <MessageSquare size={36} style={{ opacity: 0.15 }} />
                        <div>No messages yet</div>
                        <div style={{ fontSize: 12 }}>Send a message to start the conversation</div>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_type === 'candidate' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%' }}>
                            {m.sender_type !== 'candidate' && <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600, paddingLeft: 2 }}>{m.sender_name}</div>}
                            <div style={{
                                padding: '12px 16px', borderRadius: m.sender_type === 'candidate' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                fontSize: 13, lineHeight: 1.6,
                                background: m.sender_type === 'candidate' ? C.accent : 'rgba(255,255,255,0.06)',
                                color: C.text,
                            }}>
                                {m.message}
                            </div>
                            {m.created_at && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: m.sender_type === 'candidate' ? 'right' : 'left', paddingLeft: 2, paddingRight: 2 }}>
                                {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>}
                        </div>
                    </div>
                ))}
                <div ref={chatEnd} />
            </div>
            <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, background: 'rgba(255,255,255,0.02)' }}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." disabled={sending}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.input, color: C.text, fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }} />
                <button onClick={send} disabled={!newMsg.trim() || sending}
                    style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: !newMsg.trim() || sending ? 'rgba(74,107,80,0.2)' : C.accent, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}

function SettingsTab({ authFetch, onToast }: { authFetch: any; onToast: (m: string) => void; }) {
    const [current, setCurrent] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const inp: React.CSSProperties = {
        width: '100%', padding: '11px 14px', borderRadius: 10,
        border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)',
        color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPwd.length < 6) { onToast('New password must be at least 6 characters'); return; }
        if (newPwd !== confirm) { onToast('Passwords do not match'); return; }
        setSaving(true);
        try {
            const res = await authFetch(`${API}/api/candidate/password`, {
                method: 'PUT', body: JSON.stringify({ current_password: current, new_password: newPwd }),
            });
            const d = await res.json();
            if (res.ok) { onToast('Password updated successfully'); setCurrent(''); setNewPwd(''); setConfirm(''); }
            else onToast(d.detail || 'Failed to update password');
        } catch { onToast('Network error'); }
        setSaving(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.09)] bg-[#1F1F1F] p-4 sm:p-6 text-[13px]">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                    <Shield size={17} color={C.accent} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Change Password</h3>
                </div>
                <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} placeholder="Enter current password" style={inp} />
                            <button type="button" onClick={() => setShowCurrent(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
                                <Eye size={15} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} required minLength={6} placeholder="Min 6 characters" style={inp} />
                            <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}>
                                <Eye size={15} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirm New Password</label>
                        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat new password" style={inp} />
                        {confirm && newPwd && confirm !== newPwd && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Passwords do not match</div>}
                        {confirm && newPwd && confirm === newPwd && <div style={{ fontSize: 11, color: '#4ADE80', marginTop: 4 }}>Passwords match ✓</div>}
                    </div>
                    <button type="submit" disabled={saving} style={{ marginTop: 4, padding: '12px', borderRadius: 10, border: 'none', background: C.accent, color: C.white, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}>
                        <Shield size={15} /> {saving ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

/* FloatingAssistant removed — merged into CVScreen text bar */

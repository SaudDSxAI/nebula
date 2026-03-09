'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { COLORS } from '@/lib/theme';
import {
    LayoutDashboard, User, Briefcase, FileText, File, LogOut,
    CheckCircle, AlertCircle, MapPin, Building, DollarSign, Star,
    Calendar, Clock, Trash2, Upload, MessageCircle, Settings,
    Send, Lock, Mail, Shield, Eye, EyeOff, Save, Hand, Edit3, XCircle
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Profile {
    id: number; name: string; email: string; phone: string | null;
    location: string | null; linkedin_url: string | null; portfolio_url: string | null;
    current_title: string | null; current_company: string | null;
    years_of_experience: number | null; skills: string | null;
    desired_role: string | null; desired_location: string | null;
    remote_preference: string | null; salary_expectation: string | null;
    availability: string | null; notice_period: string | null;
    work_authorization: string | null; languages: string | null;
    tags: string | null; created_at: string | null; updated_at: string | null;
    company_name: string | null; company_slug: string | null;
}
interface Job {
    id: number; title: string; description: string; location: string | null;
    employment_type: string | null; experience_level: string | null;
    salary_range: string | null; skills_required: string | null;
    created_at: string | null; already_applied: boolean;
}
interface Application {
    id: number;
    requirement: { id: number; title: string; location: string | null; employment_type: string | null; experience_level: string | null; };
    status: string; applied_at: string | null; current_stage: string | null; updated_at: string | null;
}
interface Msg { id: number; sender_type: string; sender_name: string; message: string; is_read: boolean; created_at: string | null; }

type Tab = 'dashboard' | 'profile' | 'jobs' | 'applications' | 'cv' | 'messages' | 'settings';

export default function CandidatePortalPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [token, setToken] = useState<string | null>(null);
    const tokenRef = useRef<string | null>(null); // stable ref so callbacks don't go stale
    const [profile, setProfile] = useState<Profile | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [cvs, setCvs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    // Stable ref to loadData — lets handleUpdate have zero deps (never recreates)
    const loadDataRef = useRef<((t: string) => Promise<void>) | null>(null);

    useEffect(() => {
        const t = localStorage.getItem('candidate_token');
        const tokenSlug = localStorage.getItem('candidate_slug');
        // Shared job links should remain public. If no valid candidate session
        // exists for this slug, send visitor to the public landing page.
        if (!t || tokenSlug !== slug) { router.replace(`/c/${slug}`); return; }
        tokenRef.current = t;
        setToken(t);
        loadData(t);
    }, [slug, router]);

    const loadData = useCallback(async (t: string) => {
        try {
            const headers = { Authorization: `Bearer ${t}` };
            const [profileRes, jobsRes, appsRes, cvsRes, unreadRes] = await Promise.all([
                fetch(`${API}/api/candidate/me`, { headers }),
                fetch(`${API}/api/candidate/jobs`, { headers }),
                fetch(`${API}/api/candidate/applications`, { headers }),
                fetch(`${API}/api/candidate/cv`, { headers }),
                fetch(`${API}/api/candidate/messages/unread`, { headers }),
            ]);
            if (profileRes.status === 401) {
                localStorage.removeItem('candidate_token');
                localStorage.removeItem('candidate_name');
                localStorage.removeItem('candidate_slug');
                router.replace(`/c/${slug}/auth?mode=login`);
                return;
            }
            const [pd, jd, ad, cd, ud] = await Promise.all([profileRes.json(), jobsRes.json(), appsRes.json(), cvsRes.json(), unreadRes.json()]);
            // Batch all updates together to cause only ONE re-render
            setProfile(pd);
            setJobs(jd.jobs || []);
            setApplications(ad.applications || []);
            setCvs(cd.cv_uploads || []);
            setUnreadMessages(ud.unread_count || 0);
        } catch (err) { console.error('Error loading data:', err); }
        setLoading(false);
    }, [slug]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('candidate_token');
        localStorage.removeItem('candidate_name');
        localStorage.removeItem('candidate_slug');
        router.push(`/c/${slug}`);
    }, [slug, router]);

    const showMsg = useCallback((msg: string) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 4000);
    }, []);

    // Keep loadDataRef in sync with the latest loadData without changing handleUpdate's identity
    loadDataRef.current = loadData;

    // handleUpdate has ZERO deps — its reference NEVER changes, so ProfileTab never remounts
    const handleUpdate = useCallback(() => {
        if (tokenRef.current && loadDataRef.current) loadDataRef.current(tokenRef.current);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading || !profile) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.background }}>
                <div style={{ width: 48, height: 48, border: `3px solid ${COLORS.border}`, borderTop: `3px solid ${COLORS.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { key: 'profile', label: 'My Profile', icon: <User size={18} /> },
        { key: 'jobs', label: 'Open Positions', icon: <Briefcase size={18} /> },
        { key: 'applications', label: 'My Applications', icon: <FileText size={18} /> },
        { key: 'cv', label: 'My CV', icon: <File size={18} /> },
        { key: 'messages', label: 'Messages', icon: <MessageCircle size={18} />, badge: unreadMessages },
        { key: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];

    return (
        <div style={{ minHeight: '100vh', background: COLORS.background, fontFamily: "'Inter', sans-serif", color: COLORS.textPrimary }}>
            <nav style={{ background: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                        {profile.company_name?.charAt(0) || 'P'}
                    </div>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>{profile.company_name}</h2>
                        <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: 0 }}>Candidate Portal</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> {profile.name}</span>
                    <button onClick={handleLogout} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: '#FFFFFF', fontSize: 13, cursor: 'pointer', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            </nav>

            <div style={{ background: '#FFFFFF', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 0, padding: '0 24px', overflowX: 'auto' }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'messages') setUnreadMessages(0); }}
                        style={{ padding: '14px 20px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: activeTab === tab.key ? COLORS.primary : COLORS.textSecondary, borderBottom: `2px solid ${activeTab === tab.key ? COLORS.primary : 'transparent'}`, transition: 'all 0.2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                        {tab.icon} {tab.label}
                        {tab.badge && tab.badge > 0 ? <span style={{ position: 'absolute', top: 8, right: 4, width: 18, height: 18, borderRadius: '50%', background: COLORS.accent, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.badge}</span> : null}
                    </button>
                ))}
            </div>

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
                {message && (
                    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: message.startsWith('SUCCESS:') ? COLORS.success.bg : COLORS.warning.bg, border: `1px solid ${message.startsWith('SUCCESS:') ? COLORS.success.border : COLORS.warning.border}`, color: message.startsWith('SUCCESS:') ? COLORS.success.text : COLORS.warning.text, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {message.startsWith('SUCCESS:') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {message.replace(/^(SUCCESS:|ERROR:)\s*/g, '').trim()}
                    </div>
                )}
                {activeTab === 'dashboard' && <DashboardTab profile={profile} applications={applications} jobs={jobs} cvs={cvs} unread={unreadMessages} onNavigate={setActiveTab} />}
                {activeTab === 'profile' && <ProfileTab profile={profile} token={token!} onUpdate={handleUpdate} onMessage={showMsg} />}
                {activeTab === 'jobs' && <JobsTab jobs={jobs} token={token!} onApply={handleUpdate} onMessage={showMsg} />}
                {activeTab === 'applications' && <ApplicationsTab applications={applications} />}
                {activeTab === 'cv' && <CVTab cvs={cvs} token={token!} onUpload={handleUpdate} onMessage={showMsg} />}
                {activeTab === 'messages' && <MessagesTab token={token!} onMessage={showMsg} />}
                {activeTab === 'settings' && <SettingsTab profile={profile} token={token!} onMessage={showMsg} />}
            </div>
        </div>
    );
}

/* ─── DASHBOARD TAB ─── */
function DashboardTab({ profile, applications, jobs, cvs, unread, onNavigate }: { profile: Profile; applications: Application[]; jobs: Job[]; cvs: any[]; unread: number; onNavigate: (tab: Tab) => void; }) {
    const cards = [
        { icon: <Briefcase size={28} />, label: 'Open Positions', value: jobs.length, color: COLORS.primary, tab: 'jobs' as Tab },
        { icon: <FileText size={28} />, label: 'My Applications', value: applications.length, color: COLORS.accent, tab: 'applications' as Tab },
        { icon: <File size={28} />, label: 'CVs Uploaded', value: cvs.length, color: COLORS.secondary, tab: 'cv' as Tab },
        { icon: <MessageCircle size={28} />, label: 'Unread Messages', value: unread, color: '#8B5CF6', tab: 'messages' as Tab },
    ];
    const profileFields = [profile.phone, profile.location, profile.current_title, profile.skills, profile.desired_role, profile.linkedin_url, profile.languages, profile.work_authorization];
    const pct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back, {profile.name.split(' ')[0]}!</h2>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Here&apos;s an overview of your activity.</p>

            {/* Onboarding banner for brand-new empty profiles */}
            {pct === 0 && (
                <div style={{ background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}10)`, border: `1px solid ${COLORS.primary}30`, borderRadius: 14, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${COLORS.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, flexShrink: 0 }}><Hand size={28} /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: COLORS.textPrimary }}>Complete your profile to get started!</h3>
                        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>Your profile is empty. Upload your CV to auto-fill your details, or fill in your profile manually.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={() => onNavigate('cv')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={14} /> Upload CV</button>
                        <button onClick={() => onNavigate('profile')} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Edit3 size={14} /> Fill Profile</button>
                    </div>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {cards.map(c => (
                    <div key={c.label} onClick={() => onNavigate(c.tab)} style={{ background: '#FFFFFF', borderRadius: 14, padding: '22px 20px', border: `1px solid ${COLORS.border}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 500 }}>{c.label}</div>
                    </div>
                ))}
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Profile Completeness</h3>
                        <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>{pct < 100 ? 'Complete your profile to get better job matches!' : <><CheckCircle size={14} style={{ color: COLORS.success.text }} /> Your profile is complete!</>}</p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: pct === 100 ? COLORS.success.text : COLORS.primary }}>{pct}%</span>
                </div>
                <div style={{ background: COLORS.background, borderRadius: 10, height: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 10, background: pct === 100 ? COLORS.success.text : COLORS.primary, transition: 'width 0.5s ease' }} />
                </div>
                {pct < 100 && <button onClick={() => onNavigate('profile')} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: 'none', background: `${COLORS.primary}10`, color: COLORS.primary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Complete Profile →</button>}
            </div>
            {applications.length > 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Applications</h3>
                    {applications.slice(0, 3).map(app => (
                        <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{app.requirement.title}</p>
                                <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: '2px 0 0' }}>Applied {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '-'}</p>
                            </div>
                            <StatusBadge status={app.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ profile, token, onUpdate, onMessage }: { profile: Profile; token: string; onUpdate: () => void; onMessage: (msg: string) => void; }) {
    const [form, setForm] = useState({
        name: profile.name || '', phone: profile.phone || '', location: profile.location || '',
        linkedin_url: profile.linkedin_url || '', portfolio_url: profile.portfolio_url || '',
        current_title: profile.current_title || '', current_company: profile.current_company || '',
        years_of_experience: profile.years_of_experience ?? '' as string | number,
        skills: profile.skills || '', desired_role: profile.desired_role || '',
        desired_location: profile.desired_location || '', remote_preference: profile.remote_preference || '',
        salary_expectation: profile.salary_expectation || '', availability: profile.availability || '',
        notice_period: profile.notice_period || '', work_authorization: profile.work_authorization || '',
        languages: profile.languages || '', tags: profile.tags || ''
    });
    const [saving, setSaving] = useState(false);

    // ⚠️ NOTE: We intentionally do NOT sync form from profile on every render.
    // Doing so (via useEffect) causes inputs to lose focus on every keystroke
    // because onUpdate() re-fetches profile, which triggers re-renders.
    // Form is initialised once from profile on mount. After a save, the user
    // can keep editing; the parent data refreshes silently in the background.

    const handleSave = async () => {
        setSaving(true);
        try {
            const body: any = { ...form };
            if (body.years_of_experience === '') delete body.years_of_experience; else body.years_of_experience = parseInt(body.years_of_experience);
            const res = await fetch(`${API}/api/candidate/me`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            if (res.ok) { onMessage('SUCCESS: Profile saved successfully!'); onUpdate(); } else onMessage('ERROR: Failed to update profile');
        } catch { onMessage('ERROR: Network error'); }
        setSaving(false);
    };
    const is: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', background: '#FFFFFF', color: COLORS.textPrimary, boxSizing: 'border-box' };

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>My Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>
                <SectionCard title="Personal Information" icon={<User size={18} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label="Full Name"><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={is} /></Field>
                        <Field label="Email"><input value={profile.email} disabled style={{ ...is, background: COLORS.background, color: COLORS.textMuted }} /></Field>
                        <Field label="Phone"><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 234 567 8900" style={is} /></Field>
                        <Field label="Location"><input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Dubai, UAE" style={is} /></Field>
                        <Field label="LinkedIn URL"><input value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." style={is} /></Field>
                        <Field label="Portfolio URL"><input value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://portfolio.com" style={is} /></Field>
                    </div>
                </SectionCard>
                <SectionCard title="Professional Details" icon={<Briefcase size={18} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label="Current Title"><input value={form.current_title} onChange={e => setForm(p => ({ ...p, current_title: e.target.value }))} placeholder="Software Engineer" style={is} /></Field>
                        <Field label="Current Company"><input value={form.current_company} onChange={e => setForm(p => ({ ...p, current_company: e.target.value }))} placeholder="Acme Corp" style={is} /></Field>
                        <Field label="Years of Experience"><input value={form.years_of_experience} onChange={e => setForm(p => ({ ...p, years_of_experience: e.target.value }))} type="number" placeholder="5" style={is} /></Field>
                        <Field label="Availability"><select value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))} style={is}><option value="">Select...</option><option value="immediate">Immediate</option><option value="2_weeks">2 Weeks</option><option value="1_month">1 Month</option><option value="3_months">3 Months</option></select></Field>
                    </div>
                    <Field label="Skills (comma separated)"><textarea value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Python, TypeScript..." rows={2} style={{ ...is, resize: 'vertical' }} /></Field>
                </SectionCard>
                <SectionCard title="Work Details" icon={<Building size={18} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label="Notice Period"><select value={form.notice_period} onChange={e => setForm(p => ({ ...p, notice_period: e.target.value }))} style={is}><option value="">Select...</option><option value="Immediate">Immediate</option><option value="2 weeks">2 Weeks</option><option value="30 days">30 Days</option><option value="60 days">60 Days</option><option value="90 days">90 Days</option></select></Field>
                        <Field label="Work Authorization"><select value={form.work_authorization} onChange={e => setForm(p => ({ ...p, work_authorization: e.target.value }))} style={is}><option value="">Select...</option><option value="Citizen">Citizen</option><option value="Permanent Resident">Permanent Resident</option><option value="Work Visa">Work Visa</option><option value="Needs Sponsorship">Needs Sponsorship</option><option value="Other">Other</option></select></Field>
                    </div>
                    <Field label="Languages (comma separated)"><input value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} placeholder="English, Arabic, French..." style={is} /></Field>
                </SectionCard>
                <SectionCard title="Job Preferences" icon={<Star size={18} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label="Desired Role"><input value={form.desired_role} onChange={e => setForm(p => ({ ...p, desired_role: e.target.value }))} placeholder="Senior Developer" style={is} /></Field>
                        <Field label="Desired Location"><input value={form.desired_location} onChange={e => setForm(p => ({ ...p, desired_location: e.target.value }))} placeholder="Remote / Dubai" style={is} /></Field>
                        <Field label="Remote Preference"><select value={form.remote_preference} onChange={e => setForm(p => ({ ...p, remote_preference: e.target.value }))} style={is}><option value="">Select...</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></Field>
                        <Field label="Salary Expectation"><input value={form.salary_expectation} onChange={e => setForm(p => ({ ...p, salary_expectation: e.target.value }))} placeholder="$80,000 - $120,000" style={is} /></Field>
                    </div>
                </SectionCard>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: saving ? COLORS.textMuted : COLORS.primary, color: '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'wait' : 'pointer', boxShadow: `0 4px 16px ${COLORS.primary}40`, display: 'flex', alignItems: 'center', gap: 8 }}>{saving ? 'Saving...' : <><Save size={16} /> Save Profile</>}</button>
                </div>
            </div>
        </div>
    );
}

/* ─── JOBS TAB ─── */
function JobsTab({ jobs, token, onApply, onMessage }: { jobs: Job[]; token: string; onApply: () => void; onMessage: (msg: string) => void; }) {
    const [applying, setApplying] = useState<number | null>(null);
    const handleApply = async (jobId: number) => {
        setApplying(jobId);
        try {
            const res = await fetch(`${API}/api/candidate/jobs/${jobId}/apply`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) { onMessage('SUCCESS: Application submitted successfully!'); onApply(); } else onMessage(`ERROR: ${data.detail || 'Failed to apply'}`);
        } catch { onMessage('ERROR: Network error'); }
        setApplying(null);
    };
    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Open Positions</h2>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Browse and apply to available opportunities.</p>
            {jobs.length === 0 ? (
                <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ marginBottom: 12, color: COLORS.textMuted }}><Briefcase size={48} /></div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Open Positions</h3>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary }}>Check back later for new opportunities!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {jobs.map(job => (
                        <div key={job.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>{job.title}</h3>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                        {job.location && <Badge text={job.location} icon={<MapPin size={12} />} />}
                                        {job.employment_type && <Badge text={job.employment_type} icon={<Building size={12} />} />}
                                        {job.experience_level && <Badge text={job.experience_level} icon={<Star size={12} />} />}
                                        {job.salary_range && <Badge text={job.salary_range} icon={<DollarSign size={12} />} />}
                                    </div>
                                    {job.description && <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>{job.description.length > 200 ? job.description.slice(0, 200) + '...' : job.description}</p>}
                                    {job.skills_required && (
                                        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {(typeof job.skills_required === 'string' ? job.skills_required.split(',') : []).slice(0, 5).map((s, i) => (
                                                <span key={i} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, background: `${COLORS.primary}15`, color: COLORS.primary, fontWeight: 500 }}>{s.trim()}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginLeft: 20, flexShrink: 0 }}>
                                    {job.already_applied ? (
                                        <span style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, background: COLORS.success.bg, color: COLORS.success.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Applied</span>
                                    ) : (
                                        <button onClick={() => handleApply(job.id)} disabled={applying === job.id} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 13, cursor: applying === job.id ? 'wait' : 'pointer', opacity: applying === job.id ? 0.6 : 1 }}>
                                            {applying === job.id ? 'Applying...' : 'Apply Now →'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── APPLICATIONS TAB ─── */
function ApplicationsTab({ applications }: { applications: Application[] }) {
    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>My Applications</h2>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Track the status of your job applications.</p>
            {applications.length === 0 ? (
                <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ marginBottom: 12, color: COLORS.textMuted }}><FileText size={48} /></div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Applications Yet</h3>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary }}>Browse open positions and submit your first application!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {applications.map(app => (
                        <div key={app.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 24px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{app.requirement.title}</h4>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {app.requirement.location && <Badge text={app.requirement.location} icon={<MapPin size={12} />} />}
                                    {app.current_stage && <Badge text={app.current_stage} icon={<CheckCircle size={12} />} />}
                                    <Badge text={app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '-'} icon={<Calendar size={12} />} />
                                </div>
                            </div>
                            <StatusBadge status={app.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── CV TAB ─── */
function CVTab({ cvs, token, onUpload, onMessage }: { cvs: any[]; token: string; onUpload: () => void; onMessage: (msg: string) => void; }) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true);
        const formData = new FormData(); formData.append('file', file);
        try {
            const res = await fetch(`${API}/api/candidate/cv/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
            const data = await res.json();
            if (res.ok) { onMessage(data.profile_updated ? `SUCCESS: CV uploaded! AI extracted ${data.extracted_fields?.length || 0} fields.` : 'SUCCESS: CV uploaded successfully!'); onUpload(); }
            else onMessage(`ERROR: ${data.detail || 'Upload failed'}`);
        } catch { onMessage('ERROR: Network error'); }
        setUploading(false); e.target.value = '';
    };
    const handleDelete = async (cvId: number) => {
        if (!confirm('Delete this CV?')) return;
        setDeleting(cvId);
        try { const res = await fetch(`${API}/api/candidate/cv/${cvId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { onMessage('SUCCESS: CV deleted'); onUpload(); } else onMessage('ERROR: Failed to delete'); } catch { onMessage('ERROR: Network error'); }
        setDeleting(null);
    };
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div><h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>My CV</h2><p style={{ fontSize: 14, color: COLORS.textSecondary }}>Upload and manage your CVs.</p></div>
                <label style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {uploading ? 'Uploading...' : <><Upload size={16} /> Upload CV</>}
                    <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
            </div>
            {cvs.length === 0 ? (
                <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: `2px dashed ${COLORS.border}` }}>
                    <div style={{ marginBottom: 12, color: COLORS.textMuted }}><File size={48} /></div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No CVs Uploaded</h3>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary }}>Upload your CV to complete your profile.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cvs.map((cv: any) => (
                        <div key={cv.id} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 24px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textTertiary }}><FileText size={20} /></div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{cv.original_filename}</p>
                                    <p style={{ fontSize: 12, color: COLORS.textSecondary, margin: '2px 0 0' }}>{cv.file_size ? `${(cv.file_size / 1024).toFixed(1)} KB` : ''}{cv.uploaded_at ? ` · ${new Date(cv.uploaded_at).toLocaleDateString()}` : ''}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: cv.parsing_status === 'completed' ? COLORS.success.bg : COLORS.warning.bg, color: cv.parsing_status === 'completed' ? COLORS.success.text : COLORS.warning.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {cv.parsing_status === 'completed' ? <><CheckCircle size={12} /> Parsed</> : <><Clock size={12} /> Pending</>}
                                </span>
                                <button onClick={() => handleDelete(cv.id)} disabled={deleting === cv.id} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${COLORS.warning.border}`, background: COLORS.warning.bg, color: COLORS.warning.text, fontSize: 12, fontWeight: 600, cursor: deleting === cv.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {deleting === cv.id ? 'Deleting...' : <><Trash2 size={12} /> Delete</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── MESSAGES TAB ─── */
function MessagesTab({ token, onMessage }: { token: string; onMessage: (msg: string) => void; }) {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const chatEnd = useRef<HTMLDivElement>(null);

    const loadMessages = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/candidate/messages`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) { const data = await res.json(); setMessages(data.messages || []); }
        } catch { /* ignore */ }
        setLoading(false);
    }, [token]);

    useEffect(() => { loadMessages(); const interval = setInterval(loadMessages, 15000); return () => clearInterval(interval); }, [loadMessages]);
    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async () => {
        if (!newMsg.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`${API}/api/candidate/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ message: newMsg.trim() }) });
            if (res.ok) { setNewMsg(''); loadMessages(); } else onMessage('ERROR: Failed to send message');
        } catch { onMessage('ERROR: Network error'); }
        setSending(false);
    };

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Messages</h2>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Chat with the recruitment team.</p>
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                <div style={{ height: 440, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {loading ? <p style={{ textAlign: 'center', color: COLORS.textMuted }}>Loading messages...</p> :
                        messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>
                                <MessageCircle size={40} style={{ marginBottom: 12 }} />
                                <p style={{ fontSize: 15, fontWeight: 600 }}>No messages yet</p>
                                <p style={{ fontSize: 13 }}>Start a conversation with the recruitment team.</p>
                            </div>
                        ) : messages.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_type === 'candidate' ? 'flex-end' : 'flex-start' }}>
                                <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: 14, background: m.sender_type === 'candidate' ? COLORS.primary : COLORS.background, color: m.sender_type === 'candidate' ? '#fff' : COLORS.textPrimary, borderBottomRightRadius: m.sender_type === 'candidate' ? 4 : 14, borderBottomLeftRadius: m.sender_type === 'admin' ? 4 : 14 }}>
                                    {m.sender_type === 'admin' && <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, margin: '0 0 4px' }}>{m.sender_name || 'Admin'}</p>}
                                    <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>{m.message}</p>
                                    <p style={{ fontSize: 10, margin: '6px 0 0', opacity: 0.6 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</p>
                                </div>
                            </div>
                        ))}
                    <div ref={chatEnd} />
                </div>
                <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 16, display: 'flex', gap: 12 }}>
                    <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..."
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none', background: '#fff', color: COLORS.textPrimary }} />
                    <button onClick={handleSend} disabled={sending || !newMsg.trim()} style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: sending || !newMsg.trim() ? 0.5 : 1 }}>
                        <Send size={16} /> {sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── SETTINGS TAB ─── */
function SettingsTab({ profile, token, onMessage }: { profile: Profile; token: string; onMessage: (msg: string) => void; }) {
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [changingPw, setChangingPw] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);

    const handleChangePassword = async () => {
        if (newPw.length < 6) { onMessage('ERROR: Password must be at least 6 characters'); return; }
        if (newPw !== confirmPw) { onMessage('ERROR: Passwords do not match'); return; }
        setChangingPw(true);
        try {
            const res = await fetch(`${API}/api/candidate/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ current_password: currentPw, new_password: newPw }) });
            const data = await res.json();
            if (res.ok) { onMessage('SUCCESS: Password changed successfully!'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); } else onMessage(`ERROR: ${data.detail}`);
        } catch { onMessage('ERROR: Network error'); }
        setChangingPw(false);
    };

    const handleSendOTP = async () => {
        setOtpSending(true);
        try {
            const res = await fetch(`${API}/api/candidate/otp/send`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) { onMessage('SUCCESS: Verification code sent!'); setOtpSent(true); } else onMessage(`ERROR: ${data.detail}`);
        } catch { onMessage('ERROR: Network error'); }
        setOtpSending(false);
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) { onMessage('ERROR: Enter the 6-digit code'); return; }
        setVerifying(true);
        try {
            const res = await fetch(`${API}/api/candidate/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: otpCode }) });
            const data = await res.json();
            if (res.ok) { onMessage('SUCCESS: Email verified!'); setVerified(true); } else onMessage(`ERROR: ${data.detail}`);
        } catch { onMessage('ERROR: Network error'); }
        setVerifying(false);
    };

    const is: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid ${COLORS.border}`, fontSize: 14, outline: 'none', background: '#FFFFFF', color: COLORS.textPrimary, boxSizing: 'border-box' };

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
                <SectionCard title="Change Password" icon={<Lock size={18} />}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <Field label="Current Password">
                            <div style={{ position: 'relative' }}>
                                <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" style={is} />
                                <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>
                        <Field label="New Password"><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" style={is} /></Field>
                        <Field label="Confirm New Password"><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" style={is} /></Field>
                        <button onClick={handleChangePassword} disabled={changingPw || !currentPw || !newPw} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: changingPw || !currentPw || !newPw ? 0.5 : 1, alignSelf: 'flex-start' }}>
                            {changingPw ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </SectionCard>

                <SectionCard title="Email Verification" icon={<Mail size={18} />}>
                    {verified ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.success.text, fontWeight: 600 }}><Shield size={20} /> Email Verified <CheckCircle size={16} /></div>
                    ) : !otpSent ? (
                        <div>
                            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 }}>Verify your email ({profile.email}) to secure your account.</p>
                            <button onClick={handleSendOTP} disabled={otpSending} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: otpSending ? 0.5 : 1 }}>
                                {otpSending ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <p style={{ fontSize: 14, color: COLORS.textSecondary }}>Enter the 6-digit code sent to your email.</p>
                            <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6}
                                style={{ ...is, textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 8, fontFamily: "'Courier New', monospace" }} />
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleVerifyOTP} disabled={verifying || otpCode.length !== 6} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: verifying || otpCode.length !== 6 ? 0.5 : 1 }}>
                                    {verifying ? 'Verifying...' : 'Verify'}
                                </button>
                                <button onClick={handleSendOTP} disabled={otpSending} style={{ padding: '10px 24px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.textSecondary, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                    Resend Code
                                </button>
                            </div>
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Account Info" icon={<User size={18} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div><p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Email</p><p style={{ fontSize: 14, fontWeight: 600 }}>{profile.email}</p></div>
                        <div><p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Member Since</p><p style={{ fontSize: 14, fontWeight: 600 }}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p></div>
                        <div><p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Company</p><p style={{ fontSize: 14, fontWeight: 600 }}>{profile.company_name}</p></div>
                        <div><p style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>Last Updated</p><p style={{ fontSize: 14, fontWeight: 600 }}>{profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : '-'}</p></div>
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}

/* ─── SHARED COMPONENTS ─── */
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 24, border: `1px solid ${COLORS.border}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: COLORS.textTertiary }}>{icon}</span> {title}
            </h3>
            {children}
        </div>
    );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (<div><label style={{ fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, display: 'block', marginBottom: 5 }}>{label}</label>{children}</div>);
}
function Badge({ text, icon }: { text: string; icon?: React.ReactNode }) {
    return (<span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', gap: 6, borderRadius: 6, background: COLORS.background, fontSize: 12, color: COLORS.textSecondary, fontWeight: 500 }}>{icon && <span style={{ color: COLORS.textTertiary }}>{icon}</span>}{text}</span>);
}
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        applied: { bg: COLORS.info.bg, color: COLORS.info.text, label: 'Applied' },
        screening: { bg: COLORS.warning.bg, color: COLORS.warning.text, label: 'Screening' },
        interviewing: { bg: `${COLORS.primary}15`, color: COLORS.primary, label: 'Interviewing' },
        offered: { bg: COLORS.success.bg, color: COLORS.success.text, label: 'Offered' },
        accepted: { bg: COLORS.success.bg, color: COLORS.success.text, label: 'Accepted' },
        rejected: { bg: COLORS.warning.bg, color: COLORS.warning.text, label: 'Rejected' },
        withdrawn: { bg: COLORS.background, color: COLORS.textMuted, label: 'Withdrawn' },
    };
    const sc = config[status] || { bg: COLORS.background, color: COLORS.textMuted, label: status };
    return (<span style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{sc.label}</span>);
}

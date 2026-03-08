'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Building2, Lock, Bell, CheckCircle2, XCircle, KeyRound, RefreshCw, Eye, EyeOff, Copy, Check, AlertTriangle, Info, Shield, Save, Globe, Upload, X, ImageIcon, Brain, FileCode, Database, RotateCcw, Phone, Cake, Globe2, MapPin, UserCircle, Languages, Briefcase, ClipboardList, Timer, CalendarDays, Banknote, Monitor, PlaneTakeoff, GraduationCap, Award, ShieldCheck, Linkedin, ExternalLink } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
    company_name: string; email: string; website: string; phone: string;
    industry: string; headquarters: string; team_size: string;
    api_key: string; plan: string; created_at: string | null;
    unique_subdomain: string; user_type: string; role: string;
    logo_url: string | null;
    portal_headline: string | null; portal_tagline: string | null; portal_contact_email: string | null;
    portal_stat1_num: string | null; portal_stat1_label: string | null;
    portal_stat2_num: string | null; portal_stat2_label: string | null;
    portal_stat3_num: string | null; portal_stat3_label: string | null;
}
interface NotifData { email_notifications: boolean; weekly_digest: boolean; notification_email: string; }
interface Toast { id: number; type: 'success' | 'error'; msg: string; }

interface ToggleField {
    field: string;       // machine key  e.g. "Phone"
    label: string;       // display label e.g. "Phone Number"
    type: 'text' | 'number' | 'email' | 'select';
    placeholder: string;
    options: string[];
    category: string;
    icon: React.ReactNode; // Lucide icon element
    defaultOn: boolean;
}

const ALL_SCREENING_FIELDS: ToggleField[] = [
    // Personal
    { field: 'Phone', label: 'Phone Number', type: 'text', placeholder: '', options: [], category: 'Personal', icon: <Phone size={16} />, defaultOn: true },
    { field: 'Age', label: 'Age (years)', type: 'number', placeholder: '', options: [], category: 'Personal', icon: <Cake size={16} />, defaultOn: true },
    { field: 'Nationality', label: 'Nationality', type: 'text', placeholder: '', options: [], category: 'Personal', icon: <Globe2 size={16} />, defaultOn: true },
    { field: 'Location', label: 'Current Location', type: 'text', placeholder: '', options: [], category: 'Personal', icon: <MapPin size={16} />, defaultOn: true },
    { field: 'Gender', label: 'Gender', type: 'select', placeholder: '', options: ['Male', 'Female', 'Prefer not to say'], category: 'Personal', icon: <UserCircle size={16} />, defaultOn: false },
    { field: 'Languages', label: 'Languages Spoken', type: 'text', placeholder: 'e.g. English, Arabic', options: [], category: 'Personal', icon: <Languages size={16} />, defaultOn: false },
    // Professional
    { field: 'JobTitle', label: 'Current / Recent Job Title', type: 'text', placeholder: '', options: [], category: 'Professional', icon: <Briefcase size={16} />, defaultOn: true },
    { field: 'EmploymentStatus', label: 'Employment Status', type: 'select', placeholder: '', options: ['Employed', 'Unemployed'], category: 'Professional', icon: <ClipboardList size={16} />, defaultOn: true },
    { field: 'Experience', label: 'Total Experience (years)', type: 'number', placeholder: '', options: [], category: 'Professional', icon: <Timer size={16} />, defaultOn: true },
    { field: 'NoticePeriod', label: 'When can you start?', type: 'select', placeholder: '', options: ['Immediate', '2 weeks', '1 month', '2 months', 'Other'], category: 'Professional', icon: <CalendarDays size={16} />, defaultOn: true },
    { field: 'Salary', label: 'Current / Previous Salary', type: 'text', placeholder: '', options: [], category: 'Professional', icon: <Banknote size={16} />, defaultOn: false },
    { field: 'RemotePref', label: 'Work Preference', type: 'select', placeholder: '', options: ['Remote', 'On-site', 'Hybrid'], category: 'Professional', icon: <Monitor size={16} />, defaultOn: false },
    { field: 'WillingToReloc', label: 'Willing to Relocate?', type: 'select', placeholder: '', options: ['Yes', 'No', 'Open to discussion'], category: 'Professional', icon: <PlaneTakeoff size={16} />, defaultOn: false },
    // Background
    { field: 'Qualification', label: 'Highest Qualification', type: 'select', placeholder: '', options: ["High School", "Diploma", "Bachelor's", "Master's", "PhD", "Other"], category: 'Background', icon: <GraduationCap size={16} />, defaultOn: true },
    { field: 'Certifications', label: 'Professional Certifications', type: 'text', placeholder: 'e.g. PMP, AWS, etc.', options: [], category: 'Background', icon: <Award size={16} />, defaultOn: true },
    { field: 'VisaStatus', label: 'Visa / Work Permit Status', type: 'select', placeholder: '', options: ['Citizen', 'Permanent Resident', 'Work Visa', 'Require Sponsorship'], category: 'Background', icon: <ShieldCheck size={16} />, defaultOn: false },
    // Online
    { field: 'LinkedIn', label: 'LinkedIn Profile URL', type: 'text', placeholder: 'https://linkedin.com/in/...', options: [], category: 'Online', icon: <Linkedin size={16} />, defaultOn: false },
    { field: 'Portfolio', label: 'Portfolio / Website', type: 'text', placeholder: 'https://', options: [], category: 'Online', icon: <ExternalLink size={16} />, defaultOn: false },
];


const CATEGORIES = ['Personal', 'Professional', 'Background', 'Online'];





const PRIMARY = 'var(--color-primary)';
const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1px solid var(--color-border)', borderRadius: 10,
    fontSize: 14, outline: 'none', background: 'var(--color-input-bg, var(--color-card))', color: 'var(--color-text-primary)',
    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const lbl: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px',
};
const card: React.CSSProperties = {
    background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14,
    padding: 28, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
};
const ta: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1px solid var(--color-border)', borderRadius: 10,
    fontSize: 13, outline: 'none', background: 'var(--color-input-bg, var(--color-card))',
    color: 'var(--color-text-primary)', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace",
    boxSizing: 'border-box' as const, resize: 'vertical' as const, lineHeight: 1.65,
};
const sectionTitle = (icon: React.ReactNode, title: string, sub?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(74,107,80,0.12)`, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
    </div>
);

const TABS = [
    { id: 'account', label: 'Account', icon: <Building2 size={15} />, title: 'Account Settings' },
    { id: 'portal', label: 'Portal', icon: <Globe size={15} />, title: 'Portal Customization' },
    { id: 'knowledge', label: 'AI Setup', icon: <Database size={15} />, title: 'AI Setup — Knowledge & Prompt' },
    { id: 'cv_eval', label: 'Screening', icon: <FileCode size={15} />, title: 'CV Screening — Fields to Collect' },
    { id: 'security', label: 'Security', icon: <Lock size={15} />, title: 'Security Settings' },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} />, title: 'Notification Preferences' },
];

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const [tab, setTab] = useState(() => searchParams.get('tab') || 'account');
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [notif, setNotif] = useState<NotifData | null>(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Account form
    const [aForm, setAForm] = useState({ company_name: '', website: '', phone: '', industry: '', headquarters: '', team_size: '' });
    const [aBusy, setABusy] = useState(false);

    // Logo upload + adjustment
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoBusy, setLogoBusy] = useState(false);
    const [logoScale, setLogoScale] = useState('1');
    const [logoX, setLogoX] = useState(0);
    const [logoY, setLogoY] = useState(0);
    const [logoAdjBusy, setLogoAdjBusy] = useState(false);
    const logoRef = useRef<HTMLInputElement>(null);
    // Drag state
    const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

    // Portal customisation form
    const [pForm, setPForm] = useState({
        portal_headline: '', portal_tagline: '', portal_contact_email: '',
        portal_stat1_num: '500+', portal_stat1_label: 'PLACEMENTS',
        portal_stat2_num: 'AI', portal_stat2_label: 'POWERED',
        portal_stat3_num: '24/7', portal_stat3_label: 'ACCESS',
    });
    const [pBusy, setPBusy] = useState(false);

    // Knowledge Base state
    const [kbText, setKbText] = useState('');
    const [kbPrompt, setKbPrompt] = useState('');
    const [kbSubdomain, setKbSubdomain] = useState<string | null>(null);
    const [kbBusy, setKbBusy] = useState(false);
    const [kbPromptBusy, setKbPromptBusy] = useState(false);
    const [kbUploading, setKbUploading] = useState(false);
    const kbFileRef = useRef<HTMLInputElement>(null);

    // ── Screening Toggle Cards ─────────────────────────────────────────────
    const [enabledFields, setEnabledFields] = useState<Set<string> | null>(null); // null = not loaded yet
    const [screeningLoading, setScreeningLoading] = useState(true);

    const [screeningBusy, setScreeningBusy] = useState(false);


    // Security form
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwBusy, setPwBusy] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeyDate, setApiKeyDate] = useState('');
    const [apiVisible, setApiVisible] = useState(false);
    const [rgnBusy, setRgnBusy] = useState(false);
    const [apiCopied, setApiCopied] = useState(false);

    // Notifications form
    const [nForm, setNForm] = useState({ email_notifications: true, weekly_digest: true, notification_email: '' });
    const [nBusy, setNBusy] = useState(false);


    // ── Toast helper ──────────────────────────────────────────────────────
    const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(p => [...p, { id, type, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);

    // ── Load data ─────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [meRes, notifRes] = await Promise.all([
                    apiClient.get('/api/client/auth/me'),
                    apiClient.get('/api/client/auth/me/notifications'),
                ]);
                const me = meRes.data;
                setProfile(me);
                setApiKey(me.api_key || '');
                setLogoUrl(me.logo_url || null);
                setAForm({
                    company_name: me.company_name || '', website: me.website || '',
                    phone: me.phone || '', industry: me.industry || '',
                    headquarters: me.headquarters || '', team_size: me.team_size || '',
                });
                setPForm({
                    portal_headline: me.portal_headline || '',
                    portal_tagline: me.portal_tagline || '',
                    portal_contact_email: me.portal_contact_email || '',
                    portal_stat1_num: me.portal_stat1_num || '500+',
                    portal_stat1_label: me.portal_stat1_label || 'PLACEMENTS',
                    portal_stat2_num: me.portal_stat2_num || 'AI',
                    portal_stat2_label: me.portal_stat2_label || 'POWERED',
                    portal_stat3_num: me.portal_stat3_num || '24/7',
                    portal_stat3_label: me.portal_stat3_label || 'ACCESS',
                });
                setLogoScale(me.logo_scale || '1');
                setLogoX(me.logo_offset_x ?? 0);
                setLogoY(me.logo_offset_y ?? 0);

                const n = notifRes.data;
                setNotif(n);
                setNForm({ email_notifications: n.email_notifications, weekly_digest: n.weekly_digest, notification_email: n.notification_email || '' });
            } catch { toast('Failed to load settings', 'error'); }
            finally { setLoading(false); }
        };
        load();
    }, [toast]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const saveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setABusy(true);
        try {
            const res = await apiClient.put('/api/client/auth/me/profile', aForm);
            setProfile(p => p ? { ...p, ...res.data } : p);
            toast('Profile updated successfully');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Update failed', 'error'); }
        finally { setABusy(false); }
    };

    const savePortal = async (e: React.FormEvent) => {
        e.preventDefault();
        setPBusy(true);
        try {
            await apiClient.put('/api/client/auth/me/profile', pForm);
            toast('Portal settings saved');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setPBusy(false); }
    };

    const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoBusy(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await apiClient.post('/api/client/company/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = res.data.logo_url;
            setLogoUrl(url);
            setProfile(p => p ? { ...p, logo_url: url } : p);
            toast('Logo uploaded successfully');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Upload failed', 'error'); }
        finally { setLogoBusy(false); if (logoRef.current) logoRef.current.value = ''; }
    };

    const removeLogo = async () => {
        setLogoBusy(true);
        try {
            await apiClient.delete('/api/client/company/logo');
            setLogoUrl(null);
            setProfile(p => p ? { ...p, logo_url: null } : p);
            toast('Logo removed');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Remove failed', 'error'); }
        finally { setLogoBusy(false); }
    };

    const saveLogoAdj = async () => {
        setLogoAdjBusy(true);
        try {
            await apiClient.put('/api/client/auth/me/profile', {
                logo_scale: logoScale,
                logo_offset_x: logoX,
                logo_offset_y: logoY,
            });
            toast('Logo adjustments saved');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setLogoAdjBusy(false); }
    };

    // Drag-to-pan handlers for logo editor
    const onLogoDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, ox: logoX, oy: logoY };
        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            setLogoX(dragRef.current.ox + dx);
            setLogoY(dragRef.current.oy + dy);
        };
        const onUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pwForm.new_password) { toast('Enter a new password', 'error'); return; }
        if (pwForm.new_password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
        if (pwForm.new_password !== pwForm.confirm) { toast('Passwords do not match', 'error'); return; }
        setPwBusy(true);
        try {
            await apiClient.post('/api/client/auth/me/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
            toast('Password changed successfully');
            setPwForm({ current_password: '', new_password: '', confirm: '' });
        } catch (err: any) { toast(err?.response?.data?.detail || 'Change failed', 'error'); }
        finally { setPwBusy(false); }
    };

    const regenerateApiKey = async () => {
        if (!confirm('Regenerate API key? All existing integrations using the old key will stop working.')) return;
        setRgnBusy(true);
        try {
            const res = await apiClient.post('/api/client/auth/me/regenerate-api-key');
            setApiKey(res.data.api_key);
            setApiKeyDate(res.data.api_key_created_at);
            toast('API key regenerated successfully');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Failed to regenerate', 'error'); }
        finally { setRgnBusy(false); }
    };

    const copyApiKey = () => {
        navigator.clipboard.writeText(apiKey);
        setApiCopied(true);
        setTimeout(() => setApiCopied(false), 2000);
    };

    const saveNotifs = async (e: React.FormEvent) => {
        e.preventDefault();
        setNBusy(true);
        try {
            const res = await apiClient.put('/api/client/auth/me/notifications', nForm);
            setNotif(res.data);
            toast('Notification preferences saved');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setNBusy(false); }
    };

    // ── Knowledge Base handlers ────────────────────────────────────────────
    const loadKb = useCallback(async () => {
        try {
            const r = await apiClient.get('/api/client/company');
            setKbText(r.data.company_data || r.data.company_description || '');
            setKbPrompt(r.data.assistant_prompt || '');
            setKbSubdomain(r.data.unique_subdomain || null);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { if (tab === 'knowledge') loadKb(); }, [tab, loadKb]);

    const saveKnowledge = async () => {
        if (!kbText.trim()) { toast('Enter some knowledge base content first', 'error'); return; }
        setKbBusy(true);
        try {
            await apiClient.put('/api/client/company', { company_data: kbText });
            toast('Knowledge base saved & embeddings rebuilt');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setKbBusy(false); }
    };

    const saveAssistantPrompt = async () => {
        setKbPromptBusy(true);
        try {
            await apiClient.put('/api/client/company', { assistant_prompt: kbPrompt });
            toast('Assistant prompt saved');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setKbPromptBusy(false); }
    };

    const uploadKbFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setKbUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            await apiClient.post('/api/client/company/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast(`"${file.name}" processed — embeddings rebuilt`);
            await loadKb();
        } catch (err: any) { toast(err?.response?.data?.detail || 'Upload failed', 'error'); }
        finally { setKbUploading(false); if (kbFileRef.current) kbFileRef.current.value = ''; }
    };


    // ── Screening Visual Field Builder handlers ────────────────────────────

    const uid = () => Math.random().toString(36).slice(2, 9);

    // ── Screening Toggle Card handlers ────────────────────────────────────
    const loadScreeningFields = useCallback(async () => {
        setScreeningLoading(true);
        try {
            const r = await apiClient.get('/api/client/company/screening-fields');
            const keys = new Set<string>((r.data.fields as any[]).map((f: any) => f.field));
            setEnabledFields(keys);
        } catch {
            // On error fall back to defaults so the UI is still usable
            setEnabledFields(new Set(ALL_SCREENING_FIELDS.filter(f => f.defaultOn).map(f => f.field)));
        } finally { setScreeningLoading(false); }
    }, []);

    // Load once on mount (not just when the Screening tab is open)
    useEffect(() => { loadScreeningFields(); }, [loadScreeningFields]);

    const toggleField = (field: string) =>
        setEnabledFields(prev => {
            const next = new Set(prev ?? []);
            next.has(field) ? next.delete(field) : next.add(field);
            return next;
        });

    const saveScreeningFields = async () => {
        if (!enabledFields) return;
        setScreeningBusy(true);
        try {
            const fields = ALL_SCREENING_FIELDS
                .filter(f => enabledFields.has(f.field))
                .map(({ icon: _i, category: _c, defaultOn: _d, ...rest }) => rest);
            await apiClient.put('/api/client/company/screening-fields', { fields });
            toast('Screening fields saved — evaluator updated');
        } catch (err: any) { toast(err?.response?.data?.detail || 'Save failed', 'error'); }
        finally { setScreeningBusy(false); }
    };

    const resetScreeningDefaults = async () => {
        setScreeningBusy(true);
        try {
            await apiClient.delete('/api/client/company/screening-fields');
            const defaults = new Set(ALL_SCREENING_FIELDS.filter(f => f.defaultOn).map(f => f.field));
            setEnabledFields(defaults);
            toast('Reset to default fields — evaluator updated');
        } catch { toast('Reset failed', 'error'); }
        finally { setScreeningBusy(false); }
    };


    const btnPrimary = (busy?: boolean): React.CSSProperties => ({
        padding: '11px 24px', background: busy ? 'var(--color-text-muted)' : 'var(--color-primary)', border: 'none',
        borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600,
        cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
    });

    const btnSecondary: React.CSSProperties = {
        padding: '11px 20px', background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 10, color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}}' }} />
        </div>
    );

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin{to{transform:rotate(360deg)}} @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}} input:focus{border-color:#0274BD!important;background:#fff!important}' }} />

            {/* ── Toasts ──────────────────────────────────────────────── */}
            <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        padding: '14px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                        animation: 'toastIn 0.3s ease', minWidth: 280, display: 'flex', alignItems: 'center', gap: 10,
                        background: t.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${t.type === 'success' ? '#86efac' : '#fca5a5'}`,
                        color: t.type === 'success' ? '#166534' : '#991b1b',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                    }}>
                        {t.type === 'success'
                            ? <CheckCircle2 size={16} />
                            : <XCircle size={16} />} {t.msg}
                    </div>
                ))}
            </div>

            {/* ── Page header ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Settings</h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, margin: 0 }}>Manage your account, security, and preferences</p>
            </div>

            {/* ── Profile Banner ───────────────────────────────────────── */}
            {profile && (
                <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: 'linear-gradient(135deg, rgba(2,116,189,0.06), rgba(2,116,189,0.02))', borderColor: 'rgba(2,116,189,0.15)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: `rgba(2,116,189,0.1)`, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>
                        {profile.company_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)' }}>{profile.company_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{profile.email}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(2,116,189,0.1)', color: 'var(--color-primary)', textTransform: 'uppercase' }}>{profile.plan || 'free'} plan</span>
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10b981', textTransform: 'uppercase' }}>Active</span>
                            {profile.unique_subdomain && (
                                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                                    /c/{profile.unique_subdomain}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab Bar ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--color-background)', padding: 6, borderRadius: 12, marginBottom: 24, width: 'fit-content', border: '1px solid var(--color-border)' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: tab === t.id ? 'var(--color-card)' : 'transparent',
                        color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                        boxShadow: tab === t.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ACCOUNT TAB
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'account' && (
                <form onSubmit={saveAccount}>
                    {/* Logo section (separate from form submit) */}
                    <div style={{ ...card, marginBottom: 16 }}>
                        {sectionTitle(<ImageIcon size={18} />, 'Company Logo', 'Upload, reposition and zoom your logo')}

                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
                            {/* ── Drag canvas ── */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                                    Drag logo to reposition
                                </div>
                                <div
                                    onMouseDown={logoUrl ? onLogoDragStart : undefined}
                                    style={{
                                        width: 200, height: 140, borderRadius: 14,
                                        border: '2px dashed var(--color-border)',
                                        background: 'var(--color-background)',
                                        overflow: 'hidden', position: 'relative',
                                        cursor: logoUrl ? 'grab' : 'default',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        userSelect: 'none',
                                    }}
                                >
                                    {logoUrl
                                        ? <img
                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${logoUrl}`}
                                            alt="Logo"
                                            draggable={false}
                                            style={{
                                                transform: `translate(${logoX}px, ${logoY}px) scale(${logoScale})`,
                                                transformOrigin: 'center center',
                                                transition: 'none',
                                                maxWidth: 180, maxHeight: 120, objectFit: 'contain',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                        : <ImageIcon size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
                                    }
                                    {logoUrl && (
                                        <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 10, color: 'var(--color-text-muted)', opacity: 0.6 }}>drag to move</div>
                                    )}
                                </div>
                            </div>

                            {/* ── Controls ── */}
                            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Zoom slider */}
                                <div>
                                    <label style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Zoom</span>
                                        <span style={{ fontWeight: 400, color: 'var(--color-primary)' }}>{Math.round(parseFloat(logoScale) * 100)}%</span>
                                    </label>
                                    <input type="range" min="0.5" max="3" step="0.05"
                                        value={logoScale}
                                        onChange={e => setLogoScale(e.target.value)}
                                        style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        <span>50%</span><span>100%</span><span>300%</span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                                    <button type="button" onClick={() => logoRef.current?.click()} disabled={logoBusy}
                                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                                        <Upload size={13} /> {logoBusy ? 'Uploading…' : 'Upload'}
                                    </button>
                                    {logoUrl && <>
                                        <button type="button" onClick={() => { setLogoX(0); setLogoY(0); setLogoScale('1'); }}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Reset
                                        </button>
                                        <button type="button" onClick={saveLogoAdj} disabled={logoAdjBusy}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontWeight: 600 }}>
                                            <Save size={13} /> {logoAdjBusy ? 'Saving…' : 'Save Adjustments'}
                                        </button>
                                        <button type="button" onClick={removeLogo} disabled={logoBusy}
                                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(214,69,69,0.4)', background: 'rgba(214,69,69,0.08)', color: '#f87171', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                                            <X size={13} /> Remove
                                        </button>
                                    </>}
                                </div>
                                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: 'none' }} onChange={uploadLogo} />

                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                    PNG, JPG, GIF or WebP · Max 5MB<br />
                                    Drag the canvas to reposition · Use the slider to zoom in/out.<br />
                                    Click <strong>Save Adjustments</strong> to apply changes to your portal.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={card}>
                        {sectionTitle(<Building2 size={18} />, 'Company Profile', 'Update your company information')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={lbl}>Company Name</label>
                                <input value={aForm.company_name} onChange={e => setAForm(p => ({ ...p, company_name: e.target.value }))} style={inp} placeholder="Acme Corp" />
                            </div>
                            <div>
                                <label style={lbl}>Website</label>
                                <input value={aForm.website} onChange={e => setAForm(p => ({ ...p, website: e.target.value }))} style={inp} placeholder="https://company.com" />
                            </div>
                            <div>
                                <label style={lbl}>Phone</label>
                                <input value={aForm.phone} onChange={e => setAForm(p => ({ ...p, phone: e.target.value }))} style={inp} placeholder="+1 (555) 000-0000" />
                            </div>
                            <div>
                                <label style={lbl}>Industry</label>
                                <input value={aForm.industry} onChange={e => setAForm(p => ({ ...p, industry: e.target.value }))} style={inp} placeholder="Technology, Finance, Healthcare…" />
                            </div>
                            <div>
                                <label style={lbl}>Headquarters</label>
                                <input value={aForm.headquarters} onChange={e => setAForm(p => ({ ...p, headquarters: e.target.value }))} style={inp} placeholder="Dubai, UAE" />
                            </div>
                            <div>
                                <label style={lbl}>Team Size</label>
                                <select value={aForm.team_size} onChange={e => setAForm(p => ({ ...p, team_size: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                                    <option value="">Select size…</option>
                                    {['1-10', '11-50', '51-200', '201-500', '500+'].map(s => <option key={s} value={s}>{s} employees</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
                            <button type="submit" style={btnPrimary(aBusy)} disabled={aBusy}>
                                {aBusy ? 'Saving…' : <><Save size={14} style={{ marginRight: 6 }} />Save Profile</>}
                            </button>
                        </div>
                    </div>
                </form>
            )}


            {/* ══════════════════════════════════════════════════════════════
                PORTAL TAB
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'portal' && (
                <form onSubmit={savePortal}>
                    <div style={card}>
                        {sectionTitle(<Globe size={18} />, 'Portal Customization', 'Customize the landing page your candidates see')}

                        {/* Portal URL Info */}
                        {profile?.unique_subdomain && (
                            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-background)', border: '1px solid var(--color-border)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Globe size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your Portal URL</div>
                                    <a href={`/c/${profile.unique_subdomain}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                        {typeof window !== 'undefined' ? window.location.origin : ''}/c/{profile.unique_subdomain}
                                    </a>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={lbl}>Hero Headline <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown on portal landing page)</span></label>
                                <input value={pForm.portal_headline} onChange={e => setPForm(p => ({ ...p, portal_headline: e.target.value }))} style={inp} placeholder={`Your ${profile?.company_name || 'Company'} Career Starts Here`} maxLength={120} />
                                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Leave blank to use the default headline.</p>
                            </div>
                            <div>
                                <label style={lbl}>Tagline / Description</label>
                                <textarea value={pForm.portal_tagline} onChange={e => setPForm(p => ({ ...p, portal_tagline: e.target.value }))} style={{ ...inp, height: 80, resize: 'vertical' as const }} placeholder="Upload your CV and let our AI build your professional profile in seconds." maxLength={300} />
                            </div>
                            <div>
                                <label style={lbl}>Contact Email <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown to candidates)</span></label>
                                <input type="email" value={pForm.portal_contact_email} onChange={e => setPForm(p => ({ ...p, portal_contact_email: e.target.value }))} style={inp} placeholder="careers@yourcompany.com" />
                            </div>

                            {/* Stats editor */}
                            <div>
                                <label style={lbl}>Portal Stats <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(shown below headline)</span></label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { numKey: 'portal_stat1_num' as const, labelKey: 'portal_stat1_label' as const, placeholder: ['500+', 'PLACEMENTS'] },
                                        { numKey: 'portal_stat2_num' as const, labelKey: 'portal_stat2_label' as const, placeholder: ['AI', 'POWERED'] },
                                        { numKey: 'portal_stat3_num' as const, labelKey: 'portal_stat3_label' as const, placeholder: ['24/7', 'ACCESS'] },
                                    ].map((stat, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 16, textAlign: 'center' }}>{i + 1}</span>
                                            <input value={(pForm as any)[stat.numKey]} onChange={e => setPForm(p => ({ ...p, [stat.numKey]: e.target.value }))} style={{ ...inp, width: 90, flex: 'none' }} placeholder={stat.placeholder[0]} maxLength={20} />
                                            <input value={(pForm as any)[stat.labelKey]} onChange={e => setPForm(p => ({ ...p, [stat.labelKey]: e.target.value }))} style={{ ...inp, flex: 1 }} placeholder={stat.placeholder[1]} maxLength={40} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Live Preview</div>
                            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, marginBottom: 6, lineHeight: 1.3 }}>
                                {pForm.portal_headline || `Your ${profile?.company_name || 'Company'} Career Starts Here`}
                            </div>
                            <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
                                {pForm.portal_tagline || 'Upload your CV and let our AI build your professional profile in seconds.'}
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                                {[
                                    { num: pForm.portal_stat1_num || '500+', label: pForm.portal_stat1_label || 'PLACEMENTS' },
                                    { num: pForm.portal_stat2_num || 'AI', label: pForm.portal_stat2_label || 'POWERED' },
                                    { num: pForm.portal_stat3_num || '24/7', label: pForm.portal_stat3_label || 'ACCESS' },
                                ].map((s, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{s.num}</div>
                                        <div style={{ fontSize: 9, color: '#666', letterSpacing: '0.5px' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            {pForm.portal_contact_email && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#5D8564' }}>Contact: {pForm.portal_contact_email}</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
                            <button type="submit" style={btnPrimary(pBusy)} disabled={pBusy}>
                                {pBusy ? 'Saving…' : <><Save size={14} style={{ marginRight: 6 }} />Save Portal Settings</>}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECURITY TAB
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'security' && (
                <>
                    {/* Change Password */}
                    <form onSubmit={changePassword}>
                        <div style={card}>
                            {sectionTitle(<Shield size={18} />, 'Change Password', 'Update your login credentials')}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={lbl}>Current Password</label>
                                    <input type="password" value={pwForm.current_password} onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} style={inp} placeholder="Enter current password" required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={lbl}>New Password</label>
                                        <input type="password" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} style={inp} placeholder="Min 6 characters" required />
                                    </div>
                                    <div>
                                        <label style={lbl}>Confirm New Password</label>
                                        <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} style={inp} placeholder="Re-enter password" required />
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
                                <button type="submit" style={btnPrimary(pwBusy)} disabled={pwBusy}>
                                    {pwBusy ? 'Changing…' : <><KeyRound size={14} style={{ marginRight: 6 }} />Change Password</>}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* API Key */}
                    {profile?.user_type === 'client' && (
                        <div style={card}>
                            {sectionTitle(<KeyRound size={18} />, 'API Key', 'Use this key to access the API programmatically')}
                            <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <code style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'monospace', wordBreak: 'break-all', opacity: apiVisible ? 1 : 0.3 }}>
                                        {apiVisible ? (apiKey || 'No API key generated yet') : '•'.repeat(Math.min(apiKey.length || 40, 40))}
                                    </code>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button type="button" onClick={() => setApiVisible(v => !v)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {apiVisible ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                                        </button>
                                        <button type="button" onClick={copyApiKey} disabled={!apiKey} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, color: apiCopied ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {apiCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertTriangle size={14} /> Regenerating will invalidate the existing key immediately.
                                </p>
                                <button type="button" onClick={regenerateApiKey} disabled={rgnBusy} style={{ ...btnSecondary, borderColor: '#fca5a5', color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {rgnBusy ? 'Regenerating…' : <><RefreshCw size={13} /> Regenerate Key</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Account Info */}
                    <div style={card}>
                        {sectionTitle(<Info size={18} />, 'Account Information', 'Read-only account details')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                            {[
                                ['Email', profile?.email || '—'],
                                ['Plan', (profile?.plan || 'free').toUpperCase()],
                                ['Member Since', profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'],
                                ['Portal URL', profile?.unique_subdomain ? `/c/${profile.unique_subdomain}` : '—'],
                            ].map(([k, v]) => (
                                <div key={k as string} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{k}</div>
                                    <div style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                NOTIFICATIONS TAB
            ══════════════════════════════════════════════════════════════ */}
            {tab === 'notifications' && (
                <form onSubmit={saveNotifs}>
                    <div style={card}>
                        {sectionTitle(<Bell size={18} />, 'Email Notifications', 'Control how and when you receive emails')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Toggle rows */}
                            {[
                                { key: 'email_notifications' as keyof typeof nForm, label: 'Email Notifications', desc: 'Receive emails for new candidates, status changes, and team activity' },
                                { key: 'weekly_digest' as keyof typeof nForm, label: 'Weekly Digest', desc: 'Get a weekly summary of requirements, candidates, and team workload every Monday' },
                            ].map(row => (
                                <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{row.label}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{row.desc}</div>
                                    </div>
                                    {/* Toggle switch */}
                                    <div
                                        onClick={() => setNForm(p => ({ ...p, [row.key]: !p[row.key] }))}
                                        style={{
                                            width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0, marginLeft: 16,
                                            background: nForm[row.key] ? PRIMARY : '#e2e8f0',
                                            position: 'relative', transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', top: 3, left: nForm[row.key] ? 23 : 3,
                                            width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </div>
                            ))}

                            {/* Notification email override */}
                            <div>
                                <label style={lbl}>Notification Email <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional override)</span></label>
                                <input value={nForm.notification_email} onChange={e => setNForm(p => ({ ...p, notification_email: e.target.value }))} type="email" style={inp} placeholder="notifications@company.com" />
                                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Leave blank to use your account email address.</p>
                            </div>
                        </div>
                        <div style={{ marginTop: 20, borderTop: '1px solid var(--color-border)', paddingTop: 18 }}>
                            <button type="submit" style={btnPrimary(nBusy)} disabled={nBusy}>
                                {nBusy ? 'Saving…' : '✓ Save Preferences'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ══  KNOWLEDGE BASE TAB  ══════════════════════════════════════════ */}
            {tab === 'knowledge' && (
                <div>
                    {/* Portal URL bar */}
                    {kbSubdomain && (
                        <div style={{ ...card, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Globe size={15} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>Portal URL</span>
                            <span style={{ fontSize: 13, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                                {typeof window !== 'undefined' ? window.location.origin : ''}/c/{kbSubdomain}
                            </span>
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/c/${kbSubdomain}`); toast('Portal link copied'); }}
                                style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Copy
                            </button>
                        </div>
                    )}

                    {/* Knowledge Base editor */}
                    <div style={card}>
                        {sectionTitle(<Database size={18} />, 'AI Knowledge Base', 'Everything the AI assistant knows about your company. Paste text or upload a document to rebuild.')}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                            <button type="button" onClick={() => kbFileRef.current?.click()} disabled={kbUploading}
                                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                                <Upload size={13} /> {kbUploading ? 'Processing…' : 'Upload File'}
                            </button>
                            <input ref={kbFileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={uploadKbFile} />
                        </div>
                        <textarea value={kbText} onChange={e => setKbText(e.target.value)} rows={14} style={ta}
                            placeholder={"Paste your company information here...\n\nInclude: services, team, culture, FAQs, policies, benefits, contact info."} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                {kbText.length > 0 ? `${kbText.length.toLocaleString()} characters` : 'No content yet'}
                            </span>
                            <button onClick={saveKnowledge} disabled={kbBusy} style={btnPrimary(kbBusy)}>
                                {kbBusy ? 'Saving…' : <><Save size={14} style={{ marginRight: 6 }} />Save & Rebuild</>}
                            </button>
                        </div>
                    </div>

                    {/* Assistant prompt editor */}
                    <div style={card}>
                        {sectionTitle(<Brain size={18} />, 'AI Assistant System Prompt', "Define the assistant's role, tone, and rules. Leave blank to use the default.")}
                        {kbPrompt.length > 0 && (
                            <button type="button" onClick={() => setKbPrompt('')}
                                style={{ marginBottom: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                                <RotateCcw size={11} /> Reset to default
                            </button>
                        )}
                        <textarea value={kbPrompt} onChange={e => setKbPrompt(e.target.value)} rows={10} style={ta}
                            placeholder={"You are a helpful AI assistant for {company_name}.\n\nHelp candidates learn about the company, open roles, and the application process.\nBe professional, friendly, and concise. If you don't know something, say so honestly."} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                {kbPrompt.length > 0 ? `${kbPrompt.length.toLocaleString()} characters` : 'Using default prompt'}
                            </span>
                            <button onClick={saveAssistantPrompt} disabled={kbPromptBusy} style={btnPrimary(kbPromptBusy)}>
                                {kbPromptBusy ? 'Saving…' : <><Save size={14} style={{ marginRight: 6 }} />Save Prompt</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══  SCREENING TAB — Toggle Cards  ════════════════════════════════ */}
            {tab === 'cv_eval' && (
                <div>
                    {/* Header */}
                    <div style={{ ...card, padding: '18px 24px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,107,80,0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileCode size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                                        CV Screening Fields
                                        <span style={{ marginLeft: 10, padding: '2px 9px', borderRadius: 20, background: 'rgba(74,107,80,0.12)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 700 }}>
                                            {(enabledFields?.size ?? 0)} / {ALL_SCREENING_FIELDS.length} active
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                        Toggle the fields you want the AI to collect from candidates
                                    </div>
                                </div>
                            </div>
                            <button onClick={resetScreeningDefaults}
                                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                                <RotateCcw size={12} /> Reset to Defaults
                            </button>
                        </div>
                    </div>

                    {/* Grouped Toggle Cards */}
                    {screeningLoading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            <div style={{ width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Loading…
                        </div>
                    ) : (
                        CATEGORIES.map(cat => {
                            const catFields = ALL_SCREENING_FIELDS.filter(f => f.category === cat);
                            return (
                                <div key={cat} style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 10 }}>{cat}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                                        {catFields.map(f => {
                                            const on = enabledFields?.has(f.field) ?? false;
                                            const typeBadge: Record<string, string> = { text: '#6366f1', number: '#f59e0b', email: '#10b981', select: '#3b82f6' };
                                            return (
                                                <div key={f.field}
                                                    onClick={() => toggleField(f.field)}
                                                    style={{
                                                        background: on ? 'rgba(74,107,80,0.07)' : 'var(--color-card)',
                                                        border: `1.5px solid ${on ? 'rgba(74,107,80,0.3)' : 'var(--color-border)'}`,
                                                        borderRadius: 12, padding: '14px 16px',
                                                        cursor: 'pointer', transition: 'all 0.15s',
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        userSelect: 'none',
                                                    }}>
                                                    {/* Icon */}
                                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: on ? 'rgba(74,107,80,0.15)' : 'rgba(148,163,184,0.1)', color: on ? 'var(--color-primary)' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                                        {f.icon}
                                                    </div>

                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', lineHeight: 1.3 }}>{f.label}</div>
                                                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${typeBadge[f.type]}1a`, color: typeBadge[f.type], textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-block', marginTop: 3 }}>
                                                            {f.type}
                                                        </span>
                                                    </div>

                                                    {/* Toggle switch */}
                                                    <div style={{
                                                        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                                                        background: on ? 'var(--color-primary)' : '#cbd5e1',
                                                        position: 'relative', transition: 'background 0.2s',
                                                    }}>
                                                        <div style={{
                                                            position: 'absolute', top: 2, left: on ? 18 : 2,
                                                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Save bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 4px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {(enabledFields?.size ?? 0)} field{(enabledFields?.size ?? 0) !== 1 ? 's' : ''} selected · Save to update the AI evaluator
                        </span>
                        <button onClick={saveScreeningFields} disabled={screeningBusy} style={btnPrimary(screeningBusy)}>
                            {screeningBusy ? 'Saving…' : <><Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Save Fields</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}




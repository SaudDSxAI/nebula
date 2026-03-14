'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { getClientMe } from '@/lib/api/clientPortal';
import {
    Plus, ClipboardList, Trash2, Search, User, MapPin,
    Briefcase, DollarSign, Clock, Users, Building2,
    ChevronDown, Sparkles, Bot, Send, AlertTriangle, CheckCircle, FileText
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

const BLUE = COLORS.primary;

/* ═══════════════════════════════════════════════════════════
   COLOR MAPS
   ═══════════════════════════════════════════════════════════ */
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: COLORS.success.bg, text: COLORS.success.text, label: 'Open' },
    in_progress: { bg: COLORS.info.bg, text: COLORS.info.text, label: 'In Progress' },
    filled: { bg: COLORS.primaryAlpha, text: COLORS.primary, label: 'Filled' },
    closed: { bg: 'transparent', text: COLORS.textMuted, label: 'Closed' },
};

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
    urgent: { bg: COLORS.info.bg, text: COLORS.info.text, label: 'Urgent' },
    high: { bg: COLORS.warning.bg, text: COLORS.warning.text, label: 'High' },
    normal: { bg: COLORS.primaryAlpha, text: COLORS.primary, label: 'Normal' },
    medium: { bg: COLORS.primaryAlpha, text: COLORS.primary, label: 'Medium' },
    low: { bg: 'transparent', text: COLORS.textMuted, label: 'Low' },
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function RequirementsListPage() {
    const router = useRouter();
    const [requirements, setRequirements] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [userRole, setUserRole] = useState('admin');
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [search, setSearch] = useState('');
    const [filterAssigned, setFilterAssigned] = useState('all');

    // AI Create
    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);

    // Team members for assignment
    const [teamMembers, setTeamMembers] = useState<any[]>([]);

    const canWrite = userRole === 'admin' || userRole === 'member';
    const isAdmin = userRole === 'admin';

    /* ── Load requirements ── */
    const loadRequirements = useCallback(async () => {
        setLoadError('');
        try {
            const params: Record<string, any> = { page: 1, page_size: 200 };
            if (filterStatus) params.status = filterStatus;
            if (filterPriority) params.priority = filterPriority;
            if (search) params.search = search;
            if (filterAssigned === 'me') params.assigned_to = 'me';
            const res = await apiClient.get('/api/client/requirements', { params });
            setRequirements(res.data.requirements || []);
        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || 'Failed to load requirements';
            console.error('Error loading requirements:', err);
            setLoadError(msg);
        }
    }, [filterStatus, filterPriority, search, filterAssigned]);

    /* ── Load stats ── */
    const loadStats = useCallback(async () => {
        try {
            const res = await apiClient.get('/api/client/requirements/stats/overview');
            setStats(res.data);
        } catch { }
    }, []);

    /* ── Load team members ── */
    const loadTeamMembers = async () => {
        try {
            const res = await apiClient.get('/api/client/team');
            // Team endpoint returns { team_members: [...] }
            const members = res.data.team_members || res.data.users || [];
            // exclude owner (is_owner:true) from assign dropdown — they're not a client_user ID
            setTeamMembers(members.filter((m: any) => !m.is_owner));
        } catch { }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const me = await getClientMe();
                setUserRole(me.role || 'admin');
            } catch { }
            await Promise.all([loadRequirements(), loadStats(), loadTeamMembers()]);
            setLoading(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        init();
    }, []);

    useEffect(() => { loadRequirements(); }, [filterStatus, filterPriority, filterAssigned]);

    /* ── AI Create ── */
    const handleAICreate = async () => {
        if (!aiText.trim()) return;
        setAiLoading(true);
        setAiResult(null);
        try {
            const res = await apiClient.post('/api/client/requirements/ai-create', { raw_text: aiText });
            setAiResult(res.data);
            setAiText('');
            loadRequirements();
            loadStats();
        } catch (err: any) {
            setAiResult({ error: err.response?.data?.detail || 'Failed to parse requirement' });
        } finally {
            setAiLoading(false);
        }
    };

    /* ── Status change ── */
    const handleStatusChange = async (reqId: number, newStatus: string) => {
        try {
            await apiClient.put(`/api/client/requirements/${reqId}`, { status: newStatus });
            loadRequirements();
            loadStats();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    /* ── Delete ── */
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiClient.delete(`/api/client/requirements/${deleteTarget.id}`);
            loadRequirements();
            loadStats();
            setDeleteTarget(null);
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    /* ── Search submit ── */
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadRequirements();
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0', color: COLORS.textMuted }}>
                <div style={{
                    width: 40, height: 40, border: `3px solid ${COLORS.secondary}`,
                    borderTopColor: BLUE, borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                }} />
                Loading requirements...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: COLORS.textPrimary, margin: 0, letterSpacing: '-0.02em' }}>
                        Requirements
                    </h1>
                    <p style={{ fontSize: 14, color: COLORS.textSecondary, margin: '4px 0 0' }}>
                        Manage job postings and track hiring progress
                    </p>
                </div>
                {canWrite && (
                    <Link href="/client/requirements/new" style={{ textDecoration: 'none' }}>
                        <button style={{
                            padding: '10px 20px', background: BLUE,
                            border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: `0 4px 15px rgba(74,107,80,0.3)`, transition: 'all 0.15s',
                        }}>
                            <Plus size={16} /> Add Requirement
                        </button>
                    </Link>
                )}
            </div>

            {/* ── 5 Stat Cards (matches old app) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                <StatCard label="Total" value={stats?.total ?? 0} icon={<ClipboardList size={18} />} />
                <StatCard label="Open" value={stats?.open ?? 0} icon={<FileText size={18} />} color={COLORS.success.text} />
                <StatCard label="In Progress" value={stats?.in_progress ?? 0} icon={<Clock size={18} />} color={COLORS.info.text} />
                <StatCard label="Filled" value={stats?.filled ?? 0} icon={<CheckCircle size={18} />} color={COLORS.primary} />
                <StatCard label="Closed" value={stats?.closed ?? 0} icon={<AlertTriangle size={18} />} color={COLORS.textMuted} />
            </div>

            {/* ── AI Create Section ── */}
            {canWrite && (
                <div style={{
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 14, padding: 20, marginBottom: 24,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Bot size={18} color={BLUE} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>Create Requirement (AI)</span>
                    </div>
                    <textarea
                        value={aiText}
                        onChange={(e) => setAiText(e.target.value)}
                        placeholder="Type requirement in plain text. Example: Need 2 Safety Officers in Dubai with 5+ years, NEBOSH, immediate joiners, AED 6-8k."
                        style={{
                            width: '100%', minHeight: 90, padding: 14, border: `1px solid ${COLORS.border}`,
                            borderRadius: 10, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                            lineHeight: 1.6, background: COLORS.card, color: COLORS.textPrimary,
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                        <button
                            onClick={handleAICreate}
                            disabled={aiLoading || !aiText.trim()}
                            style={{
                                padding: '10px 20px', background: BLUE, border: 'none', borderRadius: 8,
                                color: '#fff', fontSize: 13, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6, opacity: aiLoading ? 0.7 : 1,
                            }}
                        >
                            <Sparkles size={14} /> {aiLoading ? 'Analyzing...' : 'Analyze & Create'}
                        </button>
                    </div>
                    {/* AI Result */}
                    {aiResult && (
                        <div style={{
                            marginTop: 14, padding: 14, borderRadius: 10,
                            background: aiResult.error ? COLORS.info.bg : COLORS.success.bg,
                            border: `1px solid ${aiResult.error ? COLORS.info.border : COLORS.success.border}`,
                        }}>
                            {aiResult.error ? (
                                <div style={{ color: COLORS.info.text, fontSize: 13 }}>❌ {aiResult.error}</div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.success.text, marginBottom: 6 }}>
                                        ✅ Requirement #{aiResult.requirement_id} Created
                                    </div>
                                    {aiResult.parsed && (
                                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                                            {aiResult.parsed.title || aiResult.parsed.role || 'Requirement'}
                                            {aiResult.parsed.company_name && ` — ${aiResult.parsed.company_name}`}
                                            {aiResult.parsed.location && ` · ${aiResult.parsed.location}`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Filters ── */}
            <div style={{
                background: COLORS.card, border: `1px solid ${COLORS.border}`,
                borderRadius: 14, padding: 20, marginBottom: 24,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Search size={16} color={COLORS.textMuted} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary }}>Filter Requirements</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap sm:items-center">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[200px] w-full sm:w-auto">
                        <input
                            type="text" placeholder="Search by title, company..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 14px', border: `1px solid ${COLORS.border}`,
                                borderRadius: 8, fontSize: 13, background: COLORS.card, color: COLORS.textPrimary,
                            }}
                        />
                    </form>
                    <SelectFilter value={filterStatus} onChange={(v) => setFilterStatus(v)}>
                        <option value="">All Status</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="filled">Filled</option>
                        <option value="closed">Closed</option>
                    </SelectFilter>
                    <SelectFilter value={filterPriority} onChange={(v) => setFilterPriority(v)}>
                        <option value="">All Priority</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                    </SelectFilter>
                    <SelectFilter value={filterAssigned} onChange={(v) => setFilterAssigned(v)}>
                        <option value="all">All Assignments</option>
                        <option value="me">Assigned to Me</option>
                    </SelectFilter>
                    <button
                        onClick={() => { setFilterStatus(''); setFilterPriority(''); setSearch(''); setFilterAssigned('all'); }}
                        style={{
                            padding: '10px 16px', background: 'transparent', border: `1px solid ${COLORS.border}`,
                            borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: COLORS.textSecondary,
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* ── Results count ── */}
            <div style={{ marginBottom: 14, fontSize: 13, fontWeight: 600, color: COLORS.textSecondary }}>
                Showing {requirements.length} requirement{requirements.length !== 1 ? 's' : ''}
            </div>

            {/* ── Requirement Cards Grid (matches old app) ── */}
            {loadError && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                    ⚠ {loadError}
                </div>
            )}
            {requirements.length === 0 && !loadError ? (
                <div style={{
                    background: COLORS.card, border: `1px dashed ${COLORS.border}`, borderRadius: 16,
                    padding: 60, textAlign: 'center',
                }}>
                    <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 12, color: BLUE }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 6 }}>No requirements found</div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Use the AI creator above to add your first requirement</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requirements.map((req) => (
                        <RequirementCard
                            key={req.id}
                            req={req}
                            isAdmin={isAdmin}
                            canWrite={canWrite}
                            teamMembers={teamMembers}
                            onStatusChange={handleStatusChange}
                            onDelete={(id, title) => setDeleteTarget({ id, title })}
                            onRefresh={() => { loadRequirements(); loadStats(); }}
                        />
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                }}>
                    <div style={{
                        background: COLORS.card, padding: 24, borderRadius: 16,
                        width: '100%', maxWidth: 400, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 12px' }}>Delete Requirement</h3>
                        <p style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>
                            &quot;{deleteTarget.title}&quot; will be permanently removed along with all candidate assignments.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            <button onClick={() => setDeleteTarget(null)} className="order-2 sm:order-1" style={{
                                padding: '10px 16px', background: 'transparent', border: `1px solid ${COLORS.border}`,
                                borderRadius: 8, color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={confirmDelete} style={{
                                padding: '10px 16px', background: '#DC2626', border: 'none', borderRadius: 8,
                                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


/* ═══════════════════════════════════════════════════════════
   REQUIREMENT CARD — matches old app's rcard
   ═══════════════════════════════════════════════════════════ */
function RequirementCard({ req, isAdmin, canWrite, teamMembers, onStatusChange, onDelete, onRefresh }: {
    req: any; isAdmin: boolean; canWrite: boolean; teamMembers: any[];
    onStatusChange: (id: number, status: string) => void;
    onDelete: (id: number, title: string) => void;
    onRefresh: () => void;
}) {
    const router = useRouter();
    const [showAssign, setShowAssign] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [localAssigned, setLocalAssigned] = useState<any>(req.assigned_user || null);

    // Sync if parent refreshes
    useEffect(() => { setLocalAssigned(req.assigned_user || null); }, [req.assigned_user]);

    // Parse structured data (from AI)
    let sd: any = null;
    if (req.structured_data) {
        try {
            sd = typeof req.structured_data === 'string' ? JSON.parse(req.structured_data) : req.structured_data;
        } catch { sd = null; }
    }

    const title = (sd?.title) || req.job_title || req.requirement_name || 'Untitled';
    const company = (sd?.company_name) || req.company_name || '';
    const role = (sd?.role) || req.role_title || '';
    const location = (sd?.location) || req.location || '';
    const experience = (sd?.experience_required) || req.experience_required || '';
    const positions = sd?.positions || req.total_positions || '';
    const status = req.status || 'open';
    const priority = req.priority || 'normal';
    const sConf = statusConfig[status] || statusConfig.closed;
    const pConf = priorityConfig[priority] || priorityConfig.normal;

    // Salary
    let salaryStr = '';
    if (sd?.salary_min || sd?.salary_max) {
        const cur = sd.salary_currency || 'AED';
        const min = sd.salary_min ? Number(sd.salary_min).toLocaleString() : '';
        const max = sd.salary_max ? Number(sd.salary_max).toLocaleString() : '';
        salaryStr = min && max ? `${cur} ${min} – ${max}` : `${cur} ${min || max}`;
    } else if (req.salary_min || req.salary_max) {
        salaryStr = `${req.salary_min || '?'} – ${req.salary_max || '?'}`;
    }

    // Pills (skills, certs, benefits)
    const skills = (sd?.skills) || [];
    const certs = (sd?.certifications) || [];
    const benefits = (sd?.benefits) || [];
    const allPills = [...skills.slice(0, 3), ...certs.slice(0, 2), ...benefits.slice(0, 2)];
    const extraCount = (skills.length + certs.length + benefits.length) - allPills.length;

    const createdDate = req.created_at ? new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

    /* ── Assign to team member ── */
    const handleAssign = async (userId: number | null) => {
        setAssigning(true);
        setShowAssign(false);
        try {
            if (userId === null) {
                await apiClient.put(`/api/client/requirements/${req.id}/unassign-team`);
                setLocalAssigned(null);
            } else {
                const res = await apiClient.put(`/api/client/requirements/${req.id}/assign-team`, { user_id: userId });
                setLocalAssigned(res.data.assigned_to || teamMembers.find(m => m.id === userId));
            }
            onRefresh();
        } catch (err: any) {
            console.error('Assign failed:', err?.response?.data?.detail || err);
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s',
            borderLeft: `4px solid ${sConf.text}`,
        }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
        >
            {/* Card body — clickable */}
            <div
                style={{ padding: '18px 20px', cursor: 'pointer' }}
                onClick={() => router.push(`/client/requirements/${req.id}`)}
            >
                {/* Top — badges + ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <Badge label={sConf.label} bg={sConf.bg} color={sConf.text} />
                        <Badge label={pConf.label} bg={pConf.bg} color={pConf.text} />
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>#{req.id}</span>
                </div>

                {/* Title */}
                <h4 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: '0 0 4px', lineHeight: 1.3 }}>{title}</h4>

                {/* Company */}
                {company && (
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <Building2 size={12} /> {company}
                    </div>
                )}
                {/* Role (if different from title) */}
                {role && role !== title && (
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <Briefcase size={12} /> {role}
                    </div>
                )}

                {/* Meta items */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
                    {location && <MetaItem icon={<MapPin size={12} />} text={location} />}
                    {experience && <MetaItem icon={<Clock size={12} />} text={experience} />}
                    {positions && <MetaItem icon={<Users size={12} />} text={`${positions} positions`} />}
                    {salaryStr && <MetaItem icon={<DollarSign size={12} />} text={salaryStr} />}
                </div>

                {/* Pills */}
                {allPills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                        {allPills.map((p, i) => (
                            <span key={i} style={{
                                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                                background: i < skills.slice(0, 3).length ? COLORS.info.bg :
                                    i < skills.slice(0, 3).length + certs.slice(0, 2).length ? COLORS.warning.bg : COLORS.success.bg,
                                color: i < skills.slice(0, 3).length ? COLORS.info.text :
                                    i < skills.slice(0, 3).length + certs.slice(0, 2).length ? COLORS.warning.text : COLORS.success.text,
                            }}>{p}</span>
                        ))}
                        {extraCount > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: COLORS.primaryAlpha, color: COLORS.textMuted }}>
                                +{extraCount} more
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Card footer */}
            <div style={{
                padding: '12px 20px', borderTop: `1px solid ${COLORS.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: COLORS.primaryAlpha,
            }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Inline status change */}
                    {canWrite && (
                        <select
                            value={status}
                            onChange={(e) => onStatusChange(req.id, e.target.value)}
                            style={{
                                padding: '5px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                                border: `1px solid ${sConf.text}30`, background: sConf.bg, color: sConf.text,
                                cursor: 'pointer',
                            }}
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="filled">Filled</option>
                            <option value="closed">Closed</option>
                        </select>
                    )}

                    {/* ── Inline Team Assignment ── */}
                    {canWrite && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowAssign(!showAssign)}
                                disabled={assigning}
                                title={localAssigned ? `Assigned to ${localAssigned.name}` : 'Assign to team member'}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '5px 10px', borderRadius: 6, border: `1px solid ${BLUE}30`,
                                    background: localAssigned ? `rgba(74,107,80,0.1)` : 'transparent',
                                    color: localAssigned ? BLUE : COLORS.textMuted,
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <User size={12} />
                                {assigning ? 'Saving…' : localAssigned ? localAssigned.name || localAssigned.email?.split('@')[0] : 'Assign'}
                                <ChevronDown size={10} />
                            </button>

                            {showAssign && (
                                <div style={{
                                    position: 'absolute', bottom: '110%', left: 0, zIndex: 100,
                                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                    minWidth: 200, overflow: 'hidden',
                                }}>
                                    <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}` }}>
                                        Assign to
                                    </div>
                                    {teamMembers.length === 0 && (
                                        <div style={{ padding: '10px 12px', fontSize: 12, color: COLORS.textMuted }}>No team members</div>
                                    )}
                                    {teamMembers.map(m => (
                                        <button key={m.id} onClick={() => handleAssign(m.id)} style={{
                                            width: '100%', padding: '9px 12px', border: 'none', background: m.id === localAssigned?.id ? COLORS.primaryAlpha : 'transparent',
                                            textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                            fontSize: 12, color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.border}20`,
                                        }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(74,107,80,0.1)', color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                                                {(m.name || m.email)?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{m.name || m.email}</div>
                                                <div style={{ fontSize: 10, color: COLORS.textMuted }}>{m.role}</div>
                                            </div>
                                            {m.id === localAssigned?.id && <span style={{ marginLeft: 'auto', color: BLUE, fontSize: 10 }}>✓</span>}
                                        </button>
                                    ))}
                                    {localAssigned && (
                                        <button onClick={() => handleAssign(null)} style={{
                                            width: '100%', padding: '8px 12px', border: 'none', background: 'transparent',
                                            textAlign: 'left', cursor: 'pointer', fontSize: 11, color: '#ef4444',
                                            fontWeight: 600, borderTop: `1px solid ${COLORS.border}`,
                                        }}>
                                            ✕ Remove Assignment
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {createdDate && <span style={{ fontSize: 11, color: COLORS.textMuted }}>{createdDate}</span>}
                    {isAdmin && (
                        <button
                            onClick={() => onDelete(req.id, title)}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: COLORS.textMuted, padding: 4, borderRadius: 6,
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
    return (
        <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: '16px 20px', transition: 'all 0.2s',
        }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color || BLUE; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = 'none'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                <span style={{ color: color || BLUE }}>{icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: color || COLORS.textPrimary, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {value}
            </div>
        </div>
    );
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: bg, color, textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>{label}</span>
    );
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
            {icon} {text}
        </div>
    );
}

function SelectFilter({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                padding: '10px 14px', border: `1px solid ${COLORS.border}`,
                borderRadius: 8, fontSize: 13, background: COLORS.card, color: COLORS.textPrimary,
                cursor: 'pointer',
            }}
        >
            {children}
        </select>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRequirement, updateRequirement, deleteRequirement,
    getTeamMembers, assignRequirementToTeam, unassignRequirementFromTeam,
    getRequirementPipeline, updatePipelineStage,
    getCandidates, assignCandidateToRequirement, unassignCandidateFromRequirement,
    getClientMe,
} from '@/lib/api/clientPortal';
import apiClient from '@/lib/api/client';
import {
    ArrowLeft, MapPin, Edit2, Trash2, Users, Calendar, Briefcase, DollarSign,
    UserPlus, X, ChevronRight, Check, AlertCircle, GripVertical, Clock, User,
} from 'lucide-react';
import { COLORS } from '@/lib/theme';

const statusColors: Record<string, { bg: string; text: string; border?: string }> = {
    open: COLORS.success,
    in_progress: COLORS.info,
    filled: { bg: COLORS.primaryAlpha, text: COLORS.primary, border: COLORS.primary },
    closed: { bg: 'transparent', text: COLORS.textMuted, border: COLORS.border },
};

const PIPELINE_STAGES = ['screening', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected'];
const STAGE_THEMES: Record<string, { bg: string, text: string }> = {
    screening: { bg: COLORS.primaryAlpha, text: COLORS.primary },
    shortlisted: { bg: COLORS.warning.bg, text: COLORS.warning.text },
    interview: { bg: COLORS.info.bg, text: COLORS.info.text },
    offered: { bg: COLORS.warning.bg, text: COLORS.warning.text },
    accepted: { bg: COLORS.success.bg, text: COLORS.success.text },
    rejected: { bg: COLORS.info.bg, text: COLORS.info.text },
};

export default function RequirementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Number(params.id);

    const [req, setReq] = useState<any>(null);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    // Role & team
    const [userRole, setUserRole] = useState<string>('admin');
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [showAssignTeam, setShowAssignTeam] = useState(false);

    // Pipeline
    const [pipeline, setPipeline] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'pipeline'>('details');

    // Candidate assignment modal
    const [showAssignCandidate, setShowAssignCandidate] = useState(false);
    const [allCandidates, setAllCandidates] = useState<any[]>([]);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [assigningCandidate, setAssigningCandidate] = useState(false);

    // Feedback
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isAdmin = userRole === 'admin';
    const canWrite = userRole === 'admin' || userRole === 'member';

    useEffect(() => {
        const load = async () => {
            try {
                const [meData, reqData] = await Promise.all([
                    getClientMe(),
                    getRequirement(id),
                ]);
                setUserRole(meData.role || 'admin');
                setReq(reqData);
                setEditForm(reqData);

                // Load applicants
                try {
                    const appRes = await apiClient.get(`/api/client/requirements/${id}/applicants`);
                    setApplicants(appRes.data.applicants || []);
                } catch { /* no applicants */ }

                // Load pipeline
                try {
                    const pipeData = await getRequirementPipeline(id);
                    setPipeline(pipeData);
                } catch { /* no pipeline */ }

                // Load team members for admin
                if (meData.role === 'admin' || !meData.role) {
                    try {
                        const teamData = await getTeamMembers();
                        setTeamMembers(teamData.team_members || []);
                    } catch { /* no team */ }
                }
            } catch {
                router.push('/client/requirements');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    const showFeedback = (msg: string, type: 'success' | 'error') => {
        if (type === 'success') { setSuccess(msg); setError(''); }
        else { setError(msg); setSuccess(''); }
        setTimeout(() => { setSuccess(''); setError(''); }, 4000);
    };

    const reload = async () => {
        const reqData = await getRequirement(id);
        setReq(reqData);
        setEditForm(reqData);
        try {
            const pipeData = await getRequirementPipeline(id);
            setPipeline(pipeData);
        } catch { }
        try {
            const appRes = await apiClient.get(`/api/client/requirements/${id}/applicants`);
            setApplicants(appRes.data.applicants || []);
        } catch { }
    };

    const handleSave = async () => {
        // Build a clean update payload — only send fields that exist and are valid
        const validRemoteTypes = ['remote', 'hybrid', 'onsite'];
        const payload: Record<string, any> = {
            job_title: editForm.job_title,
            job_description: editForm.job_description,
        };
        if (editForm.required_skills !== undefined && editForm.required_skills !== null)
            payload.required_skills = editForm.required_skills;
        if (editForm.location !== undefined && editForm.location !== null)
            payload.location = editForm.location;
        if (editForm.salary_range !== undefined && editForm.salary_range !== null)
            payload.salary_range = editForm.salary_range;
        if (editForm.priority)
            payload.priority = editForm.priority;
        if (editForm.experience_level !== undefined && editForm.experience_level !== null && editForm.experience_level !== '')
            payload.experience_level = editForm.experience_level;
        if (editForm.remote_type && validRemoteTypes.includes(editForm.remote_type))
            payload.remote_type = editForm.remote_type;
        if (editForm.company_name !== undefined && editForm.company_name !== null)
            payload.company_name = editForm.company_name;
        if (editForm.notes !== undefined && editForm.notes !== null)
            payload.notes = editForm.notes;

        try {
            const updated = await updateRequirement(id, payload);
            setReq(updated);
            setEditing(false);
            showFeedback('Requirement updated', 'success');
        } catch (err: any) {
            // Handle Pydantic validation error array
            const detail = err?.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join('; ')
                : detail || 'Update failed';
            showFeedback(msg, 'error');
        }
    };



    const handleDelete = async () => {
        if (!confirm('Delete this requirement?')) return;
        await deleteRequirement(id);
        router.push('/client/requirements');
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            const updated = await updateRequirement(id, { status: newStatus } as any);
            setReq(updated);
            showFeedback(`Status changed to ${newStatus.replace('_', ' ')}`, 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to change status', 'error');
        }
    };

    const handlePriorityChange = async (newPriority: string) => {
        try {
            const updated = await updateRequirement(id, { priority: newPriority } as any);
            setReq(updated);
            showFeedback(`Priority changed to ${newPriority}`, 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to change priority', 'error');
        }
    };

    const handleAssignTeam = async (userId: number) => {
        try {
            await assignRequirementToTeam(id, userId);
            setShowAssignTeam(false);
            await reload();
            showFeedback('Requirement assigned to team member', 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to assign', 'error');
        }
    };

    const handleUnassignTeam = async () => {
        try {
            await unassignRequirementFromTeam(id);
            await reload();
            showFeedback('Requirement unassigned', 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to unassign', 'error');
        }
    };

    const handleAssignCandidate = async (candidateId: number) => {
        setAssigningCandidate(true);
        try {
            await assignCandidateToRequirement(id, candidateId);
            setShowAssignCandidate(false);
            await reload();
            showFeedback('Candidate assigned successfully', 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to assign candidate', 'error');
        } finally {
            setAssigningCandidate(false);
        }
    };

    const handleUnassignCandidate = async (candidateId: number) => {
        if (!confirm('Unassign this candidate from the requirement?')) return;
        try {
            await unassignCandidateFromRequirement(id, candidateId);
            await reload();
            showFeedback('Candidate unassigned', 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to unassign', 'error');
        }
    };

    const handleStageChange = async (applicantId: number, newStage: string) => {
        try {
            await updatePipelineStage(id, applicantId, newStage);
            await reload();
            showFeedback(`Stage updated to ${newStage}`, 'success');
        } catch (err: any) {
            showFeedback(err?.response?.data?.detail || 'Failed to update stage', 'error');
        }
    };

    const openAssignCandidateModal = async () => {
        setShowAssignCandidate(true);
        setCandidateSearch('');
        try {
            const data = await getCandidates({ page_size: 100 });
            setAllCandidates(data.candidates || []);
        } catch { setAllCandidates([]); }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!req) return null;

    const statusStyle = statusColors[req.status] || statusColors.closed;

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', background: COLORS.card,
        border: `1px solid ${COLORS.border}`, borderRadius: '8px',
        color: COLORS.textPrimary, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle, cursor: 'pointer', padding: '6px 10px', fontSize: '12px', fontWeight: 600,
    };

    const filteredCandidates = allCandidates.filter((c: any) =>
        !candidateSearch || c.name?.toLowerCase().includes(candidateSearch.toLowerCase()) || c.email?.toLowerCase().includes(candidateSearch.toLowerCase())
    );

    return (
        <>
            {/* Feedback */}
            {error && (
                <div style={{ background: COLORS.info.bg, border: `1px solid ${COLORS.info.border}`, color: COLORS.info.text, padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> {error}</span>
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setError('')} />
                </div>
            )}
            {success && (
                <div style={{ background: COLORS.success.bg, border: `1px solid ${COLORS.success.border}`, color: COLORS.success.text, padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={14} /> {success}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <button onClick={() => router.push('/client/requirements')} style={{
                    background: 'none', border: 'none', color: COLORS.textSecondary, fontSize: '13px',
                    cursor: 'pointer', marginBottom: '8px', padding: 0,
                    display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                    <ArrowLeft size={14} /> Back to Requirements
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        {editing ? (
                            <input value={editForm.job_title} onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                                style={{ ...inputStyle, fontSize: '24px', fontWeight: 800, marginBottom: '8px' }} />
                        ) : (
                            <h1 style={{ fontSize: '26px', fontWeight: 800, color: COLORS.textPrimary, margin: '0 0 8px' }}>{req.job_title}</h1>
                        )}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Status dropdown */}
                            {canWrite ? (
                                <select value={req.status} onChange={e => handleStatusChange(e.target.value)}
                                    style={{ ...selectStyle, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border || statusStyle.text}`, borderRadius: 20, textTransform: 'capitalize', width: 'auto' }}>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="filled">Filled</option>
                                    <option value="closed">Closed</option>
                                </select>
                            ) : (
                                <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: statusStyle.bg, color: statusStyle.text, border: statusStyle.border ? `1px solid ${statusStyle.border}` : 'none', textTransform: 'capitalize' }}>{req.status.replace('_', ' ')}</span>
                            )}

                            {/* Priority dropdown */}
                            {canWrite ? (
                                <select value={req.priority} onChange={e => handlePriorityChange(e.target.value)}
                                    style={{ ...selectStyle, borderRadius: 20, textTransform: 'capitalize', width: 'auto' }}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            ) : (
                                <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', background: COLORS.info.bg, color: COLORS.info.text, textTransform: 'capitalize' }}>{req.priority}</span>
                            )}

                            <span style={{ fontSize: '13px', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} /> {req.location || 'No location'}
                            </span>
                            <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>· {req.remote_type}</span>
                        </div>
                    </div>

                    {canWrite && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {editing ? (
                                <>
                                    <button onClick={handleSave} style={{ padding: '8px 18px', background: COLORS.primary, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                                    <button onClick={() => { setEditing(false); setEditForm(req); }} style={{ padding: '8px 18px', background: '#FFFFFF', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setEditing(true)} style={{ padding: '8px 18px', background: COLORS.primaryAlpha, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.primary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    {isAdmin && (
                                        <button onClick={handleDelete} style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.info.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Assigned to team member */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: COLORS.textTertiary, fontWeight: 600 }}>ASSIGNED TO:</span>
                    {req.assigned_user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS.primaryAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, fontWeight: 700, fontSize: 12 }}>
                                {req.assigned_user.name?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 600 }}>{req.assigned_user.name}</span>
                            <span style={{ fontSize: 12, color: COLORS.textMuted }}>({req.assigned_user.role})</span>
                            {isAdmin && (
                                <button onClick={handleUnassignTeam} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 11 }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <span style={{ fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>Unassigned</span>
                    )}
                    {isAdmin && (
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowAssignTeam(!showAssignTeam)} style={{
                                padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                                background: 'rgba(74,107,80,0.1)', border: `1px solid ${COLORS.primary}30`, color: COLORS.primary, cursor: 'pointer',
                            }}>
                                <User size={12} /> {req.assigned_user ? 'Reassign' : 'Assign'}
                            </button>
                            {showAssignTeam && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
                                    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 220, overflow: 'hidden',
                                }}>
                                    <div style={{ padding: '8px 12px', fontSize: 11, color: COLORS.textTertiary, fontWeight: 600, borderBottom: `1px solid ${COLORS.border}`, textTransform: 'uppercase' }}>Select Team Member</div>
                                    {teamMembers.filter(m => m.is_active).map(m => (
                                        <button key={m.id} onClick={() => handleAssignTeam(m.id)} style={{
                                            width: '100%', padding: '10px 12px', border: 'none', background: 'transparent',
                                            textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                            fontSize: 13, color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.border}20`,
                                        }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: COLORS.primaryAlpha, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.primary, fontSize: 11, fontWeight: 700 }}>
                                                {m.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{m.name}</div>
                                                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.role}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {teamMembers.filter(m => m.is_active).length === 0 && (
                                        <div style={{ padding: 16, fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>No active team members</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${COLORS.border}` }}>
                {['details', 'pipeline'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
                        padding: '10px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
                        fontSize: 14, fontWeight: 600, color: activeTab === tab ? COLORS.primary : COLORS.textTertiary,
                        borderBottom: activeTab === tab ? `2px solid ${COLORS.primary}` : '2px solid transparent',
                        marginBottom: -2, transition: 'all 0.2s', textTransform: 'capitalize',
                    }}>
                        {tab === 'pipeline' ? `Pipeline (${pipeline?.total_candidates || 0})` : 'Details'}
                    </button>
                ))}
            </div>

            {activeTab === 'details' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Left: Details */}
                    <div>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textPrimary, marginTop: 0, marginBottom: '16px' }}>Job Description</h3>
                            {editing ? (
                                <textarea value={editForm.job_description} onChange={(e) => setEditForm({ ...editForm, job_description: e.target.value })} rows={8} style={{ ...inputStyle, resize: 'vertical' as any }} />
                            ) : (
                                <p style={{ fontSize: '14px', color: COLORS.textSecondary, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{req.job_description}</p>
                            )}
                        </div>

                        {/* Applicants */}
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '28px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>
                                    Applicants ({applicants.length})
                                </h3>
                                {canWrite && (
                                    <button onClick={openAssignCandidateModal} style={{
                                        padding: '6px 14px', background: COLORS.primary, border: 'none', borderRadius: 8,
                                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        <UserPlus size={13} /> Assign Candidate
                                    </button>
                                )}
                            </div>
                            {applicants.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: COLORS.textMuted, background: COLORS.background, borderRadius: '12px', border: `1px dashed ${COLORS.border}` }}>
                                    <Users size={32} style={{ marginBottom: 8, opacity: 0.5, color: COLORS.primary }} />
                                    <div>No applicants yet</div>
                                </div>
                            ) : (
                                applicants.map((app: any) => (
                                    <div key={app.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', border: `1px solid ${COLORS.border}`, borderRadius: '10px', marginBottom: '8px',
                                        transition: 'background 0.15s',
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 107, 80, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div>
                                            <Link href={`/client/candidates/${app.candidate_id}`} style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textPrimary, textDecoration: 'none' }}>{app.candidate_name}</Link>
                                            <div style={{ fontSize: '12px', color: COLORS.textSecondary }}>{app.candidate_email}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                                background: STAGE_THEMES[app.status]?.bg || COLORS.border, color: STAGE_THEMES[app.status]?.text || COLORS.textMuted,
                                                textTransform: 'capitalize',
                                            }}>{app.status}</span>
                                            {canWrite && (
                                                <button onClick={() => handleUnassignCandidate(app.candidate_id)} title="Unassign" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.textMuted, padding: 4 }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Info cards */}
                    <div>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textPrimary, marginTop: 0, marginBottom: '16px' }}>Quick Info</h3>
                            {[
                                { label: 'Experience', value: req.experience_level },
                                { label: 'Remote', value: req.remote_type },
                                { label: 'Priority', value: req.priority },
                                { label: 'Positions', value: `${req.positions_filled || 0} / ${req.positions_count}` },
                                { label: 'Salary', value: req.salary_range || '—' },
                                { label: 'Deadline', value: req.deadline ? new Date(req.deadline).toLocaleDateString() : '—' },
                                { label: 'Created', value: new Date(req.created_at).toLocaleDateString() },
                            ].map((item) => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}40`, fontSize: '13px' }}>
                                    <span style={{ color: COLORS.textTertiary }}>{item.label}</span>
                                    <span style={{ color: COLORS.textPrimary, fontWeight: 600, textTransform: 'capitalize' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textPrimary, marginTop: 0, marginBottom: '12px' }}>Required Skills</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {req.required_skills ? req.required_skills.split(',').map((s: string) => (
                                    <span key={s} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: COLORS.primaryAlpha, color: COLORS.primary, fontWeight: 600 }}>{s.trim()}</span>
                                )) : (
                                    <span style={{ fontSize: '13px', color: COLORS.textMuted }}>No skills specified</span>
                                )}
                            </div>
                            {req.preferred_skills && (
                                <>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: COLORS.textPrimary, marginTop: '20px', marginBottom: '12px' }}>Preferred Skills</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {req.preferred_skills.split(',').map((s: string) => (
                                            <span key={s} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: COLORS.info.bg, color: COLORS.info.text, fontWeight: 600 }}>{s.trim()}</span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ======================== PIPELINE TAB ======================== */
                <div>
                    {/* Pipeline header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                            {pipeline?.total_candidates || 0} candidate{(pipeline?.total_candidates || 0) !== 1 ? 's' : ''} in pipeline
                            {' · '}{req.positions_filled || 0}/{req.positions_count} positions filled
                        </div>
                        {canWrite && (
                            <button onClick={openAssignCandidateModal} style={{
                                padding: '8px 16px', background: COLORS.primary, border: 'none', borderRadius: 8,
                                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <UserPlus size={14} /> Add Candidate
                            </button>
                        )}
                    </div>

                    {/* Kanban columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`, gap: 12, overflowX: 'auto' }}>
                        {PIPELINE_STAGES.map(stage => {
                            const candidates = pipeline?.stages?.[stage] || [];
                            const stageTheme = STAGE_THEMES[stage] || { bg: COLORS.border, text: COLORS.textPrimary };
                            return (
                                <div key={stage} style={{
                                    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14,
                                    minWidth: 180, display: 'flex', flexDirection: 'column',
                                }}>
                                    {/* Column header */}
                                    <div style={{
                                        padding: '12px 14px', borderBottom: `2px solid ${stageTheme.text}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: stageTheme.text, textTransform: 'capitalize' }}>{stage}</span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700, background: stageTheme.bg, color: stageTheme.text,
                                            padding: '2px 8px', borderRadius: 10,
                                        }}>{candidates.length}</span>
                                    </div>

                                    {/* Cards */}
                                    <div style={{ padding: 8, flex: 1, minHeight: 100 }}>
                                        {candidates.length === 0 ? (
                                            <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: COLORS.textMuted }}>No candidates</div>
                                        ) : (
                                            candidates.map((c: any) => (
                                                <div key={c.applicant_id} style={{
                                                    background: COLORS.background, border: `1px solid ${COLORS.border}`,
                                                    borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                                                    transition: 'box-shadow 0.2s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: stageTheme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stageTheme.text, fontSize: 10, fontWeight: 700 }}>
                                                            {c.candidate_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <Link href={`/client/candidates/${c.candidate_id}`} style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, textDecoration: 'none' }}>
                                                            {c.candidate_name}
                                                        </Link>
                                                    </div>
                                                    {c.current_title && (
                                                        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>{c.current_title}</div>
                                                    )}
                                                    {c.ai_match_score && (
                                                        <div style={{ fontSize: 10, color: COLORS.primary, fontWeight: 700, marginBottom: 6 }}>
                                                            AI Match: {Math.round(c.ai_match_score * 100)}%
                                                        </div>
                                                    )}

                                                    {/* Stage buttons */}
                                                    {canWrite && stage !== 'accepted' && stage !== 'rejected' && (
                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                                            {PIPELINE_STAGES.filter(s => s !== stage && s !== 'screening').slice(0, 3).map(nextStage => (
                                                                <button key={nextStage} onClick={() => handleStageChange(c.applicant_id, nextStage)} style={{
                                                                    padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 6,
                                                                    background: STAGE_THEMES[nextStage]?.bg || COLORS.border, border: `1px solid ${COLORS.border}`,
                                                                    color: STAGE_THEMES[nextStage]?.text || COLORS.textPrimary, cursor: 'pointer', textTransform: 'capitalize',
                                                                }}>
                                                                    {nextStage === 'rejected' ? 'Reject' : nextStage}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Unassign */}
                                                    {canWrite && (
                                                        <button onClick={() => handleUnassignCandidate(c.candidate_id)} style={{
                                                            marginTop: 6, padding: '2px 6px', fontSize: 10, color: COLORS.textMuted,
                                                            background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: 4, cursor: 'pointer',
                                                        }}>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ==================== ASSIGN CANDIDATE MODAL ==================== */}
            {showAssignCandidate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: COLORS.card, borderRadius: 16, width: 500, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, margin: 0 }}>Assign Candidate</h2>
                            <button onClick={() => setShowAssignCandidate(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.textMuted }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
                            <input placeholder="Search candidates by name or email..." value={candidateSearch}
                                onChange={e => setCandidateSearch(e.target.value)}
                                style={{ ...inputStyle, width: '100%' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
                            {filteredCandidates.length === 0 ? (
                                <div style={{ padding: 32, textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>No candidates found</div>
                            ) : (
                                filteredCandidates.map((c: any) => (
                                    <div key={c.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 0', borderBottom: `1px solid ${COLORS.border}30`,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{c.name}</div>
                                            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{c.email}{c.current_title ? ` · ${c.current_title}` : ''}</div>
                                        </div>
                                        <button onClick={() => handleAssignCandidate(c.id)} disabled={assigningCandidate}
                                            style={{
                                                padding: '6px 14px', background: COLORS.primary, border: 'none', borderRadius: 8,
                                                color: '#fff', fontSize: 12, fontWeight: 600, cursor: assigningCandidate ? 'not-allowed' : 'pointer',
                                                opacity: assigningCandidate ? 0.6 : 1,
                                            }}>
                                            Assign
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

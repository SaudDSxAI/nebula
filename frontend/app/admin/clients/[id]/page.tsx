'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import * as adminApi from '@/lib/api/admin';
import { format } from 'date-fns';
import {
  Building2, Settings, Calendar, Key, Globe, PauseCircle,
  PlayCircle, CheckCircle, XCircle, Shield, Circle,
  ArrowLeft, Edit2, Trash2, Lock, CreditCard, X, AlertTriangle,
  Save, Eye, EyeOff,
} from 'lucide-react';

type Modal = 'edit' | 'delete' | 'resetPwd' | 'changePlan' | null;

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<adminApi.Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (params.id) loadClient(parseInt(params.id as string));
  }, [params.id]);

  async function loadClient(id: number) {
    try {
      const data = await adminApi.getClient(id);
      setClient(data);
    } catch { router.push('/admin/clients'); }
    finally { setLoading(false); }
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const closeModal = () => setActiveModal(null);

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </AdminLayout>
  );

  if (!client) return null;

  const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active: { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: 'Active' },
    suspended: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Suspended' },
    inactive: { bg: 'var(--color-background)', text: 'var(--color-text-secondary)', dot: 'var(--color-text-muted)', label: 'Inactive' },
  };
  const sc = statusConfig[client.status] || statusConfig.inactive;

  const planConfig: Record<string, { bg: string; text: string; label: string }> = {
    free: { bg: 'var(--color-background)', text: 'var(--color-text-secondary)', label: 'Free' },
    professional: { bg: '#dbeafe', text: '#1e40af', label: 'Professional' },
    enterprise: { bg: '#f3e8ff', text: '#6b21a8', label: 'Enterprise' },
  };
  const pc = planConfig[client.plan] || planConfig.free;

  const card: React.CSSProperties = { background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 24 };

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', animation: 'slideDown 0.3s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
          {activeModal === 'edit' && <EditModal client={client} onClose={closeModal} onSaved={c => { setClient(c); showToast('Client updated successfully'); }} />}
          {activeModal === 'delete' && <DeleteModal client={client} onClose={closeModal} onDeleted={() => router.push('/admin/clients')} />}
          {activeModal === 'resetPwd' && <ResetPwdModal client={client} onClose={closeModal} onDone={msg => showToast(msg)} />}
          {activeModal === 'changePlan' && <ChangePlanModal client={client} onClose={closeModal} onSaved={c => { setClient(c); showToast(`Plan changed to ${c.plan}`); }} />}
        </div>
      )}

      <div>
        {/* Back */}
        <button onClick={() => router.push('/admin/clients')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Clients
        </button>

        {/* Header Card */}
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', borderRadius: 16, padding: 32, marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, backdropFilter: 'blur(10px)' }}>
                {client.company_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{client.company_name}</h1>
                <p style={{ fontSize: 15, opacity: 0.85, margin: '4px 0 0' }}>{client.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: pc.bg, color: pc.text }}>{pc.label}</span>
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: sc.bg, color: sc.text, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot }} />{sc.label}
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <Card title="Company Information" icon={<Building2 size={17} />}>
            <InfoRow label="Company Name" value={client.company_name} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Website" value={client.website || '—'} isLink={!!client.website} />
            <InfoRow label="Phone" value={client.phone || '—'} />
            <InfoRow label="Subdomain" value={client.unique_subdomain || '—'} />
          </Card>

          <Card title="Account Details" icon={<Settings size={17} />}>
            <InfoRow label="Plan" value={<span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: pc.bg, color: pc.text, textTransform: 'capitalize' }}>{client.plan}</span>} />
            <InfoRow label="Status" value={<span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />{sc.label}</span>} />
            <InfoRow label="Email Verified" value={<span style={{ color: client.email_verified ? '#16a34a' : '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{client.email_verified ? <><CheckCircle size={14} /> Verified</> : <><XCircle size={14} /> Not Verified</>}</span>} />
            <InfoRow label="Two-Factor Auth" value={<span style={{ color: client.two_factor_enabled ? '#16a34a' : 'var(--color-text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{client.two_factor_enabled ? <><Shield size={14} /> Enabled</> : <><Circle size={14} /> Disabled</>}</span>} />
            <InfoRow label="GDPR Consent" value={<span style={{ color: client.gdpr_consent ? '#16a34a' : '#dc2626', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{client.gdpr_consent ? <><CheckCircle size={14} /> Granted</> : <><XCircle size={14} /> Not Granted</>}</span>} />
          </Card>

          <Card title="Activity" icon={<Calendar size={17} />}>
            <InfoRow label="Account Created" value={format(new Date(client.created_at), 'MMMM d, yyyy • h:mm a')} />
            <InfoRow label="Last Login" value={client.last_login ? format(new Date(client.last_login), 'MMMM d, yyyy • h:mm a') : <span style={{ color: 'var(--color-text-muted)' }}>Never logged in</span>} />
          </Card>

          <Card title="API Access" icon={<Key size={17} />}>
            <div style={{ marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>API Key</span></div>
            {client.api_key ? (
              <div style={{ padding: '10px 14px', background: 'var(--color-background)', borderRadius: 8, border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
                {client.api_key}
              </div>
            ) : (
              <div style={{ padding: '14px', background: 'var(--color-background)', borderRadius: 8, border: '1px dashed var(--color-border)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No API key generated
              </div>
            )}
          </Card>
        </div>

        {/* Actions Bar */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Quick Actions</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Edit */}
            <ActionBtn icon={<Edit2 size={14} />} label="Edit Client" onClick={() => setActiveModal('edit')}
              bg="var(--color-primary-alpha)" color="var(--color-primary)" border="var(--color-primary)" />
            {/* Change Plan */}
            <ActionBtn icon={<CreditCard size={14} />} label="Change Plan" onClick={() => setActiveModal('changePlan')}
              bg="#f5f3ff" color="#7c3aed" border="#c4b5fd" />
            {/* Reset Password */}
            <ActionBtn icon={<Lock size={14} />} label="Reset Password" onClick={() => setActiveModal('resetPwd')}
              bg="#fffbeb" color="#92400e" border="#fcd34d" />
            {/* Suspend / Activate */}
            <SuspendBtn client={client} onDone={c => { setClient(c); showToast(`Account ${c.status}`); }} />
            {/* View Portal */}
            <ActionBtn icon={<Globe size={14} />} label="View Portal" onClick={() => window.open(`/c/${client.unique_subdomain}`, '_blank')}
              bg="var(--color-background)" color="var(--color-text-primary)" border="var(--color-border)"
              disabled={!client.unique_subdomain} />
            {/* Delete */}
            <ActionBtn icon={<Trash2 size={14} />} label="Delete Client" onClick={() => setActiveModal('delete')}
              bg="#fef2f2" color="#991b1b" border="#fca5a5" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary-alpha)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: React.ReactNode; isLink?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
      {isLink && typeof value === 'string' ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>{value} ↗</a>
      ) : (
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, bg, color, border, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  bg: string; color: string; border: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 8, border: `1px solid ${border}`,
      fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
      background: bg, color, opacity: disabled ? 0.5 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
    }}>{icon} {label}</button>
  );
}

function SuspendBtn({ client, onDone }: { client: adminApi.Client; onDone: (c: adminApi.Client) => void }) {
  const [loading, setLoading] = useState(false);
  const isSuspended = client.status === 'suspended';
  const handleClick = async () => {
    setLoading(true);
    try {
      const updated = await adminApi.updateClientStatus(client.id, isSuspended ? 'active' : 'suspended');
      onDone(updated);
    } catch { /* handled by caller */ }
    finally { setLoading(false); }
  };
  return (
    <ActionBtn icon={isSuspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
      label={loading ? 'Updating...' : isSuspended ? 'Activate Account' : 'Suspend Account'}
      onClick={handleClick}
      bg={isSuspended ? '#dcfce7' : '#fef2f2'}
      color={isSuspended ? '#166534' : '#991b1b'}
      border={isSuspended ? '#86efac' : '#fca5a5'}
      disabled={loading}
    />
  );
}

// ─── Modal base ────────────────────────────────────────────────────────────────

function ModalBox({ title, icon, children, onClose, danger }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; onClose: () => void; danger?: boolean;
}) {
  return (
    <div style={{ background: 'var(--color-card)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.22s ease', overflow: 'hidden' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--color-border)', background: danger ? '#fef2f2' : 'var(--color-background)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16, color: danger ? '#991b1b' : 'var(--color-text-primary)' }}>
          {icon} {title}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          <X size={20} />
        </button>
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

function ModalFooter({ onClose, onSubmit, submitLabel, submitting, danger }: {
  onClose: () => void; onSubmit: () => void; submitLabel: string; submitting: boolean; danger?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
      <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Cancel
      </button>
      <button onClick={onSubmit} disabled={submitting} style={{
        padding: '10px 22px', borderRadius: 10, border: 'none',
        background: danger ? '#dc2626' : 'var(--color-primary)',
        color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
        opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {submitting ? 'Working...' : submitLabel}
      </button>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
  fontSize: 14, outline: 'none', background: 'var(--color-background)',
  color: 'var(--color-text-primary)', boxSizing: 'border-box', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' };

// ─── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ client, onClose, onSaved }: { client: adminApi.Client; onClose: () => void; onSaved: (c: adminApi.Client) => void }) {
  const [form, setForm] = useState({ company_name: client.company_name, email: client.email, website: client.website || '', phone: client.phone || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const upd = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleSave = async () => {
    if (!form.company_name.trim()) return setError('Company name is required');
    if (!form.email.trim()) return setError('Email is required');
    setSaving(true);
    try {
      const updated = await adminApi.updateClient(client.id, { company_name: form.company_name.trim(), email: form.email.trim(), website: form.website.trim() || undefined, phone: form.phone.trim() || undefined });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update client');
    } finally { setSaving(false); }
  };

  return (
    <ModalBox title="Edit Client" icon={<Edit2 size={18} />} onClose={onClose}>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={lbl}>Company Name *</label><input style={inp} value={form.company_name} onChange={e => upd('company_name', e.target.value)} /></div>
        <div><label style={lbl}>Email *</label><input style={inp} type="email" value={form.email} onChange={e => upd('email', e.target.value)} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Website</label><input style={inp} value={form.website} onChange={e => upd('website', e.target.value)} placeholder="https://..." /></div>
          <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="+1 555..." /></div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={handleSave} submitLabel="Save Changes" submitting={saving} />
    </ModalBox>
  );
}

// ─── Change Plan Modal ─────────────────────────────────────────────────────────

function ChangePlanModal({ client, onClose, onSaved }: { client: adminApi.Client; onClose: () => void; onSaved: (c: adminApi.Client) => void }) {
  const [selectedPlan, setSelectedPlan] = useState(client.plan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const plans = [
    { id: 'free', label: 'Free', desc: 'Basic features, limited candidates', color: '#6b7280', bg: 'var(--color-background)' },
    { id: 'professional', label: 'Professional', desc: 'Advanced tools, more candidates', color: '#1e40af', bg: '#dbeafe' },
    { id: 'enterprise', label: 'Enterprise', desc: 'Full platform, unlimited access', color: '#6b21a8', bg: '#f3e8ff' },
  ];

  const handleSave = async () => {
    if (selectedPlan === client.plan) return onClose();
    setSaving(true);
    try {
      const updated = await adminApi.updateClient(client.id, { plan: selectedPlan });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to change plan');
    } finally { setSaving(false); }
  };

  return (
    <ModalBox title="Change Subscription Plan" icon={<CreditCard size={18} />} onClose={onClose}>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Current plan: <strong style={{ color: 'var(--color-text-primary)' }}>{client.plan}</strong>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plans.map(p => (
          <button key={p.id} onClick={() => setSelectedPlan(p.id)} style={{
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
            border: selectedPlan === p.id ? `2px solid var(--color-primary)` : '1px solid var(--color-border)',
            background: selectedPlan === p.id ? 'var(--color-primary-alpha)' : 'var(--color-card)',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: p.bg, color: p.color }}>{p.label}</span>
          </button>
        ))}
      </div>
      <ModalFooter onClose={onClose} onSubmit={handleSave} submitLabel="Change Plan" submitting={saving} />
    </ModalBox>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────

function ResetPwdModal({ client, onClose, onDone }: { client: adminApi.Client; onClose: () => void; onDone: (msg: string) => void }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!pwd) return setError('New password is required');
    if (pwd.length < 8) return setError('Password must be at least 8 characters');
    if (pwd !== confirm) return setError('Passwords do not match');
    setSaving(true);
    try {
      await adminApi.resetClientPassword(client.id, pwd);
      onDone('Password reset successfully');
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to reset password');
    } finally { setSaving(false); }
  };

  return (
    <ModalBox title="Reset Client Password" icon={<Lock size={18} />} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Set a new password for <strong style={{ color: 'var(--color-text-primary)' }}>{client.company_name}</strong>. The client will need to use this new password to log in.
      </p>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>New Password *</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inp, paddingRight: 40 }} type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => { setPwd(e.target.value); setError(''); }} placeholder="Min 8 characters" />
            <button onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label style={lbl}>Confirm Password *</label>
          <input style={inp} type={showPwd ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} placeholder="Re-enter password" />
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={handleReset} submitLabel="Reset Password" submitting={saving} />
    </ModalBox>
  );
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({ client, onClose, onDeleted }: { client: adminApi.Client; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const confirmed = confirm === client.company_name;

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await adminApi.deleteClient(client.id);
      onDeleted();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to delete client');
      setDeleting(false);
    }
  };

  return (
    <ModalBox title="Delete Client" icon={<AlertTriangle size={18} />} onClose={onClose} danger>
      <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fca5a5', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: '#991b1b', margin: 0, lineHeight: 1.6 }}>
          <strong>This action cannot be undone.</strong> The client account will be permanently deactivated and all access revoked. Their data is retained for audit purposes.
        </p>
      </div>
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div>
        <label style={lbl}>Type <strong style={{ color: 'var(--color-text-primary)' }}>{client.company_name}</strong> to confirm</label>
        <input style={inp} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={client.company_name} />
      </div>
      <ModalFooter onClose={onClose} onSubmit={handleDelete} submitLabel="Delete Client" submitting={deleting || !confirmed} danger />
    </ModalBox>
  );
}

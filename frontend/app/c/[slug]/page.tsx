'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, LogIn, Send } from 'lucide-react';

import { COLORS } from '@/lib/theme';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ClientInfo {
    company_name: string;
    slug: string;
    portal_headline: string | null;
    portal_tagline: string | null;
    portal_contact_email: string | null;
}

interface RegisterResponse {
    status: string;
    message: string;
}

const initialForm = { name: '', email: '', phone: '' };

export default function PublicCandidatePortalPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [client, setClient] = useState<ClientInfo | null>(null);
    const [loadingClient, setLoadingClient] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<RegisterResponse | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadClient = async () => {
            try {
                setLoadingClient(true);
                const res = await fetch(`${API}/api/portal/${slug}`);
                if (!res.ok) throw new Error('Portal not found');
                const data = await res.json();
                if (!mounted) return;
                setClient(data);
                setLoadError('');
            } catch {
                if (!mounted) return;
                setLoadError('This candidate portal link is invalid or unavailable.');
            } finally {
                if (!mounted) return;
                setLoadingClient(false);
            }
        };

        loadClient();
        return () => { mounted = false; };
    }, [slug]);

    const validate = () => {
        const nextErrors: Record<string, string> = {};

        if (!form.name.trim()) nextErrors.name = 'Name is required';
        if (!form.email.trim()) nextErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSubmitting(true);
            const res = await fetch(`${API}/api/portal/${slug}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    phone: form.phone.trim(),
                }),
            });

            const data = await res.json();
            setResult({
                status: data.status || (res.ok ? 'created' : 'error'),
                message: data.message || (res.ok ? 'Registration submitted.' : 'Registration failed. Please try again.'),
            });
        } catch {
            setResult({
                status: 'error',
                message: 'Could not submit now. Please try again in a moment.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingClient) {
        return (
            <div style={centeredLayout}>
                <div style={spinner} />
                <style jsx global>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (loadError || !client) {
        return (
            <div style={centeredLayout}>
                <div style={errorCard}>
                    <AlertCircle size={26} color={COLORS.warning.text} />
                    <h1 style={{ margin: 0, fontSize: 20, color: COLORS.textPrimary }}>Portal unavailable</h1>
                    <p style={{ margin: 0, color: COLORS.textSecondary, lineHeight: 1.6 }}>
                        {loadError || 'This candidate portal link is invalid or unavailable.'}
                    </p>
                </div>
            </div>
        );
    }

    if (result) {
        const ok = result.status === 'created' || result.status === 'exists';
        return (
            <div style={centeredLayout}>
                <div style={successCard}>
                    {ok ? <CheckCircle2 size={42} color={COLORS.success.text} /> : <AlertCircle size={42} color={COLORS.warning.text} />}
                    <h1 style={{ margin: 0, fontSize: 24, color: COLORS.textPrimary }}>
                        {ok ? 'Submission received' : 'Submission failed'}
                    </h1>
                    <p style={{ margin: 0, color: COLORS.textSecondary, lineHeight: 1.6 }}>{result.message}</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => { setResult(null); setForm(initialForm); setErrors({}); }}
                            style={primaryButton}
                        >
                            Submit another response
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push(`/c/${slug}/auth?mode=login`)}
                            style={secondaryButton}
                        >
                            <LogIn size={14} />
                            Candidate login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={container}>
            <div style={formCard}>
                <div style={{ marginBottom: 28 }}>
                    <p style={kicker}>Public Candidate Form</p>
                    <h1 style={title}>{client.portal_headline || `Apply to ${client.company_name}`}</h1>
                    <p style={subtitle}>
                        {client.portal_tagline || `Submit your details and the ${client.company_name} team will contact you for matching roles.`}
                    </p>
                </div>

                <form onSubmit={onSubmit}>
                    <Field
                        id="name"
                        label="Full name"
                        value={form.name}
                        placeholder="John Doe"
                        onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                        error={errors.name}
                    />
                    <Field
                        id="email"
                        label="Email address"
                        value={form.email}
                        placeholder="john@example.com"
                        onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                        error={errors.email}
                    />
                    <Field
                        id="phone"
                        label="Phone (optional)"
                        value={form.phone}
                        placeholder="+1 555 123 4567"
                        onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    />

                    <button type="submit" disabled={submitting} style={{ ...primaryButton, width: '100%', marginTop: 6 }}>
                        <Send size={15} />
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </form>

                <div style={footerRow}>
                    <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        Already registered?
                    </span>
                    <button
                        type="button"
                        onClick={() => router.push(`/c/${slug}/auth?mode=login`)}
                        style={linkButton}
                    >
                        Candidate login
                    </button>
                </div>

                {client.portal_contact_email && (
                    <p style={{ margin: 0, marginTop: 12, color: COLORS.textMuted, fontSize: 12, textAlign: 'center' }}>
                        Support: {client.portal_contact_email}
                    </p>
                )}
            </div>
        </div>
    );
}

function Field({
    id,
    label,
    value,
    placeholder,
    onChange,
    error,
}: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label htmlFor={id} style={fieldLabel}>{label}</label>
            <input
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    ...fieldInput,
                    borderColor: error ? COLORS.warning.border : COLORS.border,
                }}
            />
            {error && <p style={fieldError}>{error}</p>}
        </div>
    );
}

const container: React.CSSProperties = {
    minHeight: '100vh',
    background: COLORS.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Inter', sans-serif",
};

const centeredLayout: React.CSSProperties = {
    ...container,
};

const formCard: React.CSSProperties = {
    width: '100%',
    maxWidth: 520,
    background: '#FFFFFF',
    borderRadius: 20,
    border: `1px solid ${COLORS.border}`,
    padding: 32,
    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
};

const successCard: React.CSSProperties = {
    ...formCard,
    textAlign: 'center',
    display: 'grid',
    gap: 14,
    justifyItems: 'center',
};

const errorCard: React.CSSProperties = {
    ...formCard,
    display: 'grid',
    gap: 10,
    textAlign: 'center',
};

const title: React.CSSProperties = {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.25,
    color: COLORS.textPrimary,
};

const subtitle: React.CSSProperties = {
    margin: 0,
    marginTop: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 1.6,
};

const kicker: React.CSSProperties = {
    margin: 0,
    color: COLORS.primary,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: 700,
};

const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.textSecondary,
    marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    outline: 'none',
    fontSize: 14,
    color: COLORS.textPrimary,
    background: '#FFFFFF',
    boxSizing: 'border-box',
};

const fieldError: React.CSSProperties = {
    margin: 0,
    marginTop: 6,
    fontSize: 12,
    color: COLORS.warning.text,
};

const primaryButton: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 12,
    background: COLORS.primary,
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 14,
    padding: '12px 16px',
    cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    background: '#FFFFFF',
    color: COLORS.textSecondary,
    fontWeight: 600,
    fontSize: 14,
    padding: '12px 16px',
    cursor: 'pointer',
};

const linkButton: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    color: COLORS.primary,
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
};

const footerRow: React.CSSProperties = {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
};

const spinner: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: '50%',
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.primary,
    animation: 'spin 0.8s linear infinite',
};

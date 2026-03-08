'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';

const PRIMARY = '#0274BD';

export default function NewRequirementPage() {
    const router = useRouter();

    // Step: 'input' | 'preview' | 'submitting' | 'done'
    const [step, setStep] = useState<'input' | 'preview' | 'submitting' | 'done'>('input');
    const [rawText, setRawText] = useState('');
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState('');
    const [parsed, setParsed] = useState<any>(null);
    const [created, setCreated] = useState<any>(null);

    const handleParse = async () => {
        if (!rawText.trim() || rawText.trim().length < 10) {
            setError('Please paste a requirement or job description first (at least 10 characters).');
            return;
        }
        setError('');
        setParsing(true);
        try {
            const res = await apiClient.post('/api/client/requirements/ai-create', {
                raw_text: rawText,
            });
            if (res.data?.success) {
                setParsed(res.data.parsed);
                setCreated(res.data.requirement);
                setStep('done');
            } else {
                setError('AI parsing failed. Please try again with more detailed text.');
            }
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            if (typeof detail === 'string') setError(detail);
            else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(', '));
            else setError('Failed to create requirement. Please try again.');
        } finally {
            setParsing(false);
        }
    };

    const s = {
        page: { maxWidth: '720px' } as React.CSSProperties,
        heading: { fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' } as React.CSSProperties,
        sub: { fontSize: '14px', color: '#64748b', margin: '0 0 28px' } as React.CSSProperties,
        card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '28px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' } as React.CSSProperties,
        label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
        textarea: { width: '100%', minHeight: '260px', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', color: '#0f172a', resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, background: '#f8fafc' },
        btn: (disabled?: boolean) => ({ padding: '12px 28px', background: disabled ? '#94a3b8' : PRIMARY, border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' } as React.CSSProperties),
        btnSecondary: { padding: '12px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' } as React.CSSProperties,
        error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '12px 16px', fontSize: '14px', marginBottom: '20px' } as React.CSSProperties,
        infoRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start', gap: '16px' } as React.CSSProperties,
        infoLabel: { fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.4px', flexShrink: 0, minWidth: '140px' },
        infoValue: { fontSize: '14px', color: '#0f172a', fontWeight: 500, textAlign: 'right' as const, wordBreak: 'break-word' as const },
        tag: (color: string, bg: string) => ({ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: bg, color, display: 'inline-block' }),
        successIcon: { width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' } as React.CSSProperties,
    };

    const priorityColor: Record<string, [string, string]> = {
        urgent: ['#dc2626', 'rgba(220,38,38,0.1)'],
        high: ['#ea580c', 'rgba(234,88,12,0.1)'],
        medium: ['#ca8a04', 'rgba(202,138,4,0.1)'],
        low: ['#64748b', 'rgba(100,116,139,0.1)'],
    };

    if (step === 'done' && parsed && created) {
        const [pc, pb] = priorityColor[parsed.priority] ?? ['#64748b', 'rgba(100,116,139,0.1)'];
        const skills = Array.isArray(parsed.skills) ? parsed.skills : (parsed.skills ? [parsed.skills] : []);
        const benefits = Array.isArray(parsed.benefits) ? parsed.benefits : (parsed.benefits ? [parsed.benefits] : []);

        return (
            <div style={s.page}>
                <button onClick={() => router.push('/client/requirements')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ← Back to Requirements
                </button>

                {/* Success Banner */}
                <div style={{ ...s.card, textAlign: 'center', borderColor: '#bbf7d0', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
                    <div style={s.successIcon}>✓</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Requirement Created Successfully!</h2>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px' }}>
                        AI has parsed and stored the requirement. Review the extracted data below.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => router.push(`/client/requirements/${created.id}`)} style={s.btn()}>
                            View Requirement →
                        </button>
                        <button onClick={() => router.push('/client/requirements')} style={s.btnSecondary}>
                            All Requirements
                        </button>
                        <button onClick={() => { setStep('input'); setParsed(null); setCreated(null); setRawText(''); }} style={s.btnSecondary}>
                            + Create Another
                        </button>
                    </div>
                </div>

                {/* Parsed Summary */}
                <div style={s.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `rgba(2,116,189,0.1)`, color: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>AI-Extracted Data</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Stored as structured JSON in the database</div>
                        </div>
                        <span style={{ ...s.tag(pc, pb), marginLeft: 'auto' }}>{(parsed.priority || 'medium').toUpperCase()}</span>
                    </div>

                    <div style={{ borderRadius: '10px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                        {[
                            ['Job Title', parsed.title || parsed.role || '—'],
                            ['Company', parsed.company_name || 'TBD'],
                            ['Location', parsed.location || '—'],
                            ['Experience', parsed.experience_required || '—'],
                            ['Employment Type', parsed.employment_type || parsed.remote_type || '—'],
                            ['Salary Range', parsed.salary_min ? `${parsed.salary_min}${parsed.salary_max ? ' – ' + parsed.salary_max : ''} ${parsed.salary_currency || ''}`.trim() : '—'],
                            ['Positions', parsed.positions || 1],
                            ['Visa Requirement', parsed.visa_requirement || '—'],
                            ['Nationality Pref', parsed.nationality_preference || '—'],
                            ['Education', parsed.education || '—'],
                            ['Deadline', parsed.due_date || '—'],
                        ].map(([label, value]) => (
                            <div key={label as string} style={s.infoRow}>
                                <span style={s.infoLabel}>{label}</span>
                                <span style={s.infoValue}>{String(value)}</span>
                            </div>
                        ))}
                    </div>

                    {skills.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <span style={s.infoLabel}>Skills / Certifications</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {skills.map((sk: string) => (
                                    <span key={sk} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(2,116,189,0.08)', color: PRIMARY, fontSize: '12px', fontWeight: 600 }}>
                                        {sk}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {benefits.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                            <span style={s.infoLabel}>Benefits / Facilities</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {benefits.map((b: string) => (
                                    <span key={b} style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                                        ✓ {b}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {parsed.description && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            <span style={s.infoLabel}>Description</span>
                            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{parsed.description}</p>
                        </div>
                    )}

                    {/* Raw JSON for debugging */}
                    <details style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                        <summary style={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>View raw JSON (stored in database)</summary>
                        <pre style={{ marginTop: '12px', fontSize: '11px', background: '#f8fafc', padding: '12px', borderRadius: '8px', overflowX: 'auto', color: '#334155', border: '1px solid #e5e7eb' }}>
                            {JSON.stringify(parsed, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        );
    }

    return (
        <div style={s.page}>
            <button onClick={() => router.push('/client/requirements')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ← Back to Requirements
            </button>

            <h1 style={s.heading}>Create Requirement with AI</h1>
            <p style={s.sub}>Paste any raw requirement text — job title, description, skills, salary, visa info, etc. Our AI will extract and structure all the data automatically.</p>

            {error && <div style={s.error}>⚠️ {error}</div>}

            <div style={s.card}>
                {/* How it works */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'rgba(2,116,189,0.04)', border: '1px solid rgba(2,116,189,0.15)', borderRadius: '10px', padding: '14px 18px', flexWrap: 'wrap' }}>
                    {[
                        ['📋', 'Paste raw text', 'Any format: email, WhatsApp, JD, notes'],
                        ['🤖', 'AI parses it', 'Extracts title, skills, salary, visa info…'],
                        ['💾', 'Stored as JSON', 'Structured data saved to the database'],
                    ].map(([icon, title, desc]) => (
                        <div key={title as string} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1', minWidth: '180px' }}>
                            <span style={{ fontSize: '20px' }}>{icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{title}</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <label style={s.label}>Paste Requirement Text *</label>
                <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`Examples:\n\n"Need 5x HSE Officers for Saudi Arabia project. Minimum 5 years Gulf exp, NEBOSH/IOSH certified. Own visa preferred. Salary 3000-4000 USD. Urgent requirement."\n\nOR paste a full job description, email, or WhatsApp message...`}
                    style={s.textarea}
                    onFocus={e => { e.target.style.borderColor = PRIMARY; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f8fafc'; }}
                    disabled={parsing}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {rawText.length} characters
                        {rawText.length < 10 && rawText.length > 0 && ' — write more for better results'}
                    </span>
                    {rawText.length > 0 && (
                        <button onClick={() => setRawText('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>Clear</button>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleParse} disabled={parsing || rawText.trim().length < 10} style={s.btn(parsing || rawText.trim().length < 10)}>
                        {parsing ? (
                            <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> AI is parsing...</>
                        ) : (
                            <>🤖 Parse &amp; Create Requirement</>
                        )}
                    </button>
                    <button onClick={() => router.push('/client/requirements')} style={s.btnSecondary}>
                        Cancel
                    </button>
                </div>

                {parsing && (
                    <div style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(2,116,189,0.05)', border: '1px solid rgba(2,116,189,0.15)', borderRadius: '10px', fontSize: '14px', color: PRIMARY, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🤖</span>
                        <div>
                            <div style={{ fontWeight: 600 }}>AI is extracting requirement data…</div>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>Parsing job title, skills, salary, visa info, and more from your text</div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
        </div>
    );
}

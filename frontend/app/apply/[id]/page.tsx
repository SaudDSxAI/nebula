'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface JobInfo {
    id: number;
    job_title: string;
    company_name: string;
    location: string | null;
    remote_type: string;
}

import { API_BASE_URL } from '@/lib/api/base';

export default function ApplyPage() {
    const params = useParams();
    const jobId = params.id;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [job, setJob] = useState<JobInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [resume, setResume] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const loadJob = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/public/jobs/${jobId}`);
                if (!res.ok) throw new Error('Job not found');
                const data = await res.json();
                setJob(data);
            } catch {
                setError('This position is no longer accepting applications.');
            } finally {
                setLoading(false);
            }
        };
        if (jobId) loadJob();
    }, [jobId]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (isValidFile(file)) setResume(file);
        }
    };

    const isValidFile = (file: File) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            setError('Please upload a PDF, DOC, DOCX, or TXT file.');
            return false;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB.');
            return false;
        }
        setError('');
        return true;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (isValidFile(file)) setResume(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resume) { setError('Please upload your resume.'); return; }
        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (!email.trim()) { setError('Please enter your email.'); return; }

        setSubmitting(true);
        setError('');

        const formData = new FormData();
        formData.append('job_id', String(jobId));
        formData.append('name', name);
        formData.append('email', email);
        formData.append('phone', phone);
        formData.append('resume', resume);

        try {
            const res = await fetch(`${API_BASE_URL}/api/public/apply`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Submission failed');
            }
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Loading state
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px', height: '40px', border: '3px solid #e5e7eb',
                        borderTop: '3px solid #4f46e5', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Loading application form...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif', background: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 50%)',
            }}>
                <div style={{ textAlign: 'center', maxWidth: '480px', padding: '24px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(5,150,105,0.25)',
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                        Application Submitted! 🎉
                    </h1>
                    <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: 1.6, marginBottom: '8px' }}>
                        Your application for <strong style={{ color: '#111827' }}>{job?.job_title}</strong> at <strong style={{ color: '#111827' }}>{job?.company_name}</strong> has been received.
                    </p>
                    <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '32px' }}>
                        Our AI is analyzing your resume. The hiring team will review your profile shortly.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <Link href="/jobs" style={{
                            padding: '12px 28px', backgroundColor: '#4f46e5', color: '#fff',
                            borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '15px',
                        }}>
                            Browse More Jobs
                        </Link>
                        <Link href="/" style={{
                            padding: '12px 28px', backgroundColor: '#fff', color: '#374151',
                            border: '1px solid #e5e7eb', borderRadius: '10px', textDecoration: 'none',
                            fontWeight: 600, fontSize: '15px',
                        }}>
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Error / Not Found
    if (!job) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>😔</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Position Unavailable</h2>
                    <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
                    <Link href="/jobs" style={{
                        padding: '12px 24px', backgroundColor: '#4f46e5', color: '#fff',
                        borderRadius: '8px', textDecoration: 'none', fontWeight: 600,
                    }}>
                        Browse All Jobs
                    </Link>
                </div>
            </div>
        );
    }

    const inputStyle = {
        width: '100%', padding: '14px 16px', border: '1px solid #e5e7eb',
        borderRadius: '10px', fontSize: '15px', outline: 'none', color: '#111827',
        boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s',
        fontFamily: 'Inter, sans-serif',
    };

    const labelStyle = {
        display: 'block', fontSize: '14px', fontWeight: 600 as const, color: '#374151',
        marginBottom: '6px',
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
            {/* Navigation */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
                zIndex: 50, borderBottom: '1px solid #e5e7eb', height: '64px',
            }}>
                <div style={{
                    maxWidth: '1200px', margin: '0 auto', padding: '0 24px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%',
                }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{
                            width: '36px', height: '36px', backgroundColor: '#4f46e5', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>TRM Platform</span>
                    </Link>
                    <Link href={`/jobs/${job.id}`} style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
                        ← Back to Job
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <section style={{
                paddingTop: '104px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px',
                background: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 15%)',
            }}>
                <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '12px', margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '24px', fontWeight: 700, color: '#fff',
                        }}>
                            {job.company_name.charAt(0)}
                        </div>
                        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
                            Apply for {job.job_title}
                        </h1>
                        <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>
                            {job.company_name} · {job.location || job.remote_type}
                        </p>
                    </div>

                    {/* Form Card */}
                    <div style={{
                        background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px',
                        padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                    }}>
                        <form onSubmit={handleSubmit}>
                            {/* Error */}
                            {error && (
                                <div style={{
                                    padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: '10px', color: '#dc2626', fontSize: '14px', fontWeight: 500,
                                    marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Name */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>
                                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text" placeholder="John Smith" value={name}
                                    onChange={(e) => setName(e.target.value)} required
                                    style={inputStyle}
                                    onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            {/* Email */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>
                                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="email" placeholder="john@example.com" value={email}
                                    onChange={(e) => setEmail(e.target.value)} required
                                    style={inputStyle}
                                    onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            {/* Phone */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>
                                    Phone Number <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    type="tel" placeholder="+1 (555) 123-4567" value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    style={inputStyle}
                                    onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            {/* Resume Upload */}
                            <div style={{ marginBottom: '28px' }}>
                                <label style={labelStyle}>
                                    Resume / CV <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div
                                    onDragEnter={handleDrag} onDragLeave={handleDrag}
                                    onDragOver={handleDrag} onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragActive ? '#4f46e5' : resume ? '#059669' : '#d1d5db'}`,
                                        borderRadius: '12px', padding: '32px 24px', textAlign: 'center',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        background: dragActive ? '#eef2ff' : resume ? '#f0fdf4' : '#fafafa',
                                    }}
                                >
                                    <input
                                        ref={fileInputRef} type="file" onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                                    />
                                    {resume ? (
                                        <div>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 12px',
                                                background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" /><polyline points="16 13 12 17 8 13" /><line x1="12" y1="17" x2="12" y2="9" />
                                                </svg>
                                            </div>
                                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                                                {resume.name}
                                            </p>
                                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                                {formatFileSize(resume.size)} · Click or drag to replace
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 12px',
                                                background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                            </div>
                                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                                                Drop your resume here, or <span style={{ color: '#4f46e5' }}>browse</span>
                                            </p>
                                            <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                                                PDF, DOC, DOCX, or TXT · Max 10MB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* AI Badge */}
                            <div style={{
                                background: '#eef2ff', borderRadius: '10px', padding: '14px 16px',
                                display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px',
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#4338ca', margin: 0 }}>
                                        AI-Powered Analysis
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#6366f1', margin: 0 }}>
                                        Your resume will be automatically analyzed and matched against job requirements.
                                    </p>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit" disabled={submitting}
                                style={{
                                    width: '100%', padding: '16px', backgroundColor: submitting ? '#a5b4fc' : '#4f46e5',
                                    color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
                                    cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: submitting ? 'none' : '0 4px 14px rgba(79,70,229,0.3)',
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <div style={{
                                            width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                                            borderTop: '2px solid white', borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                        }}></div>
                                        Submitting Application...
                                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                    </>
                                ) : (
                                    <>
                                        Submit Application
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Privacy Notice */}
                    <p style={{
                        textAlign: 'center', fontSize: '12px', color: '#9ca3af',
                        marginTop: '16px', lineHeight: 1.5,
                    }}>
                        By submitting, you agree to our Terms of Service and Privacy Policy.
                        <br />Your data is processed in accordance with GDPR regulations.
                    </p>
                </div>
            </section>
        </div>
    );
}

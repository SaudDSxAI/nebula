// ─── CSS variable tokens ──────────────────────────────────────────────────────
export const COLORS = {
    background: 'var(--color-background)',
    card: 'var(--color-card)',
    sidebar: 'var(--color-sidebar)',

    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textTertiary: 'var(--color-text-tertiary)',
    textMuted: 'var(--color-text-muted)',
    textInverse: 'var(--color-text-inverse)',

    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    primaryAlpha: 'var(--color-primary-alpha)',

    secondary: 'var(--color-secondary)',
    secondaryHover: 'var(--color-secondary-hover)',
    accent: 'var(--color-accent)',
    accentHover: 'var(--color-accent-hover)',

    border: 'var(--color-border)',
    borderFocus: 'var(--color-border-focus)',

    inputBg: 'var(--color-input-bg, var(--color-card))',
    inputBorder: 'var(--color-input-border, var(--color-border))',
    hover: 'var(--color-hover, rgba(0,0,0,0.04))',

    success: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)', border: 'var(--color-success-border)' },
    warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)', border: 'var(--color-warning-border)' },
    info: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)', border: 'var(--color-info-border)' },

    chartPrimary: 'var(--color-chart-primary)',
    chartSecondary: 'var(--color-chart-secondary)',
    chartTertiary: 'var(--color-chart-tertiary)',
    chartQuaternary: 'var(--color-chart-quaternary)',
};

// ─── Shared style helpers (theme-aware) ───────────────────────────────────────

/** Card / panel surface */
export const cardStyle: React.CSSProperties = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
};

/** Text input */
export const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: 10, fontSize: 14, outline: 'none',
    color: COLORS.textPrimary,
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

/** Field label */
export const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: COLORS.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px',
};

/** Modal overlay */
export const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
};

/** Modal box */
export const modalStyle: React.CSSProperties = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16, width: '100%', maxWidth: 480,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    animation: 'modalEnter 0.22s ease', overflow: 'hidden',
    color: COLORS.textPrimary,
};

/** Modal header */
export const modalHeadStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', borderBottom: `1px solid ${COLORS.border}`,
};

/** Modal body */
export const modalBodyStyle: React.CSSProperties = { padding: '20px 24px' };

/** Modal footer */
export const modalFootStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`,
};

/** Primary button */
export const btnPrimaryStyle: React.CSSProperties = {
    padding: '10px 22px', background: COLORS.primary, border: 'none',
    borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
};

/** Secondary button */
export const btnSecondaryStyle: React.CSSProperties = {
    padding: '10px 18px', background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10, color: COLORS.textSecondary,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};

/** Icon close button */
export const btnCloseStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: COLORS.textMuted, padding: '0 4px',
    fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center',
};

/** Stat card */
export const statCardStyle: React.CSSProperties = {
    background: COLORS.card, border: `1px solid ${COLORS.border}`,
    borderRadius: 14, padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
};

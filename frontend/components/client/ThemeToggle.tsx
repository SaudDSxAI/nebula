'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

const MODES = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'system', icon: Monitor, label: 'System' },
    { key: 'dark', icon: Moon, label: 'Dark' },
] as const;

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();

    useEffect(() => { setMounted(true); }, []);

    if (!mounted) return <div style={{ width: 36, height: 36 }} />;

    const current = MODES.find(m => m.key === theme) ?? MODES[0];
    const nextIdx = (MODES.findIndex(m => m.key === theme) + 1) % MODES.length;
    const next = MODES[nextIdx];
    const Icon = current.icon;

    return (
        <button
            onClick={() => setTheme(next.key)}
            title={`Theme: ${current.label} — click for ${next.label}`}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--color-primary-alpha)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-primary)',
                fontSize: 12, fontWeight: 700,
                transition: 'all 0.2s',
            }}
        >
            <Icon size={14} />
            <span>{current.label}</span>
        </button>
    );
}

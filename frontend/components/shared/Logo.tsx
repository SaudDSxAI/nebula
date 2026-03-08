import Link from 'next/link';
import { Zap } from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface LogoProps {
    className?: string;
    href?: string;
    dark?: boolean;
}

export function Logo({ href = '/', dark = false }: LogoProps) {
    return (
        <Link href={href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: COLORS.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(2, 116, 189, 0.25)',
            }}>
                <Zap size={20} fill="currentColor" />
            </div>
            <span style={{
                fontSize: 20, fontWeight: 800,
                color: dark ? '#FFFFFF' : COLORS.textPrimary,
                letterSpacing: '-0.02em',
            }}>
                Nebula
            </span>
        </Link>
    );
}

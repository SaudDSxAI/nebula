'use client';

import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'white';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    iconPosition = 'right',
    fullWidth = false,
    disabled,
    ...props
}: ButtonProps) {
    const [hovered, setHovered] = useState(false);

    const sizeMap = {
        sm: { padding: '8px 16px', fontSize: 14 },
        md: { padding: '12px 24px', fontSize: 15 },
        lg: { padding: '14px 28px', fontSize: 16 },
        icon: { padding: '10px', fontSize: 14 },
    };

    const getStyles = (): React.CSSProperties => {
        const base: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 10,
            fontWeight: 700,
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
            opacity: disabled || isLoading ? 0.6 : 1,
            width: fullWidth ? '100%' : 'auto',
            ...sizeMap[size],
        };

        switch (variant) {
            case 'primary':
                return {
                    ...base,
                    background: COLORS.primary,
                    color: '#FFFFFF',
                    boxShadow: hovered
                        ? '0 8px 25px rgba(2, 116, 189, 0.35)'
                        : '0 4px 14px rgba(2, 116, 189, 0.25)',
                    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
                };
            case 'secondary':
                return {
                    ...base,
                    background: `${COLORS.primary}12`,
                    color: COLORS.primary,
                    border: `1px solid ${COLORS.primary}30`,
                    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
                };
            case 'outline':
                return {
                    ...base,
                    background: 'transparent',
                    color: COLORS.primary,
                    border: `2px solid ${COLORS.primary}`,
                    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
                };
            case 'white':
                return {
                    ...base,
                    background: '#FFFFFF',
                    color: COLORS.textPrimary,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: hovered
                        ? '0 8px 20px rgba(0,0,0,0.08)'
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
                };
            case 'ghost':
                return {
                    ...base,
                    background: hovered ? `${COLORS.primary}08` : 'transparent',
                    color: COLORS.textSecondary,
                };
            default:
                return base;
        }
    };

    return (
        <button
            style={getStyles()}
            disabled={isLoading || disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            {...props}
        >
            {isLoading ? (
                <svg style={{ animation: 'spin 0.8s linear infinite', width: 16, height: 16 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon size={size === 'lg' ? 18 : 16} />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon size={size === 'lg' ? 18 : 16} />}
                </>
            )}
        </button>
    );
}

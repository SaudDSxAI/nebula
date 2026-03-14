'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';
import { usePathname } from 'next/navigation';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const pathname = usePathname();

    const forceLight = 
        pathname === '/' || 
        pathname === '/login' || 
        pathname?.startsWith('/client/signup') || 
        pathname?.startsWith('/client/login') ||
        pathname?.startsWith('/admin/login') || 
        pathname?.startsWith('/c/') || 
        pathname?.startsWith('/jobs/');

    if (forceLight) {
        return <NextThemesProvider {...props} forcedTheme="light">{children}</NextThemesProvider>;
    }

    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

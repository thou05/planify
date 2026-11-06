'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppShell from './AppShell';

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Standalone routes that have their own custom full-page layouts
  const isStandalone =
    pathname === '/' ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/invite');

  if (isStandalone) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}

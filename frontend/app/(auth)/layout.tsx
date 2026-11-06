import React from 'react';
import { PlayfulBackground } from '@/components/playful/PlayfulBackground';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-[#0b0f19] overflow-hidden">
      <PlayfulBackground variant="auth" />
      <div className="relative z-10 w-full max-w-md my-auto flex justify-center">
        {children}
      </div>
    </div>
  );
}


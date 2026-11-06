import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import AppLayoutClient from '@/components/layout/AppLayoutClient';
import AppDialogHost from '@/components/ui/AppDialog';

export const metadata: Metadata = {
  title: 'Planify — Collaborative Work Management',
  description: 'Nền tảng quản lý công việc và dự án Kanban cộng tác thời gian thực hiện đại, chuyên nghiệp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Zero-FOUC inline script: Sets dark class and CSS variables before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('planify:theme-mode')||'light';var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;if(r==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}var c=localStorage.getItem('planify:primary-color');if(c){document.documentElement.style.setProperty('--color-primary',c);document.documentElement.style.setProperty('--color-brand',c);}}catch(e){}})();`,
          }}
        />
      </head>
      {/* Extensions can inject attributes on body before React hydrates. */}
      <body suppressHydrationWarning className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <ThemeProvider>
            <AppLayoutClient>{children}</AppLayoutClient>
          </ThemeProvider>
        </AuthProvider>
        <AppDialogHost />
      </body>
    </html>
  );
}

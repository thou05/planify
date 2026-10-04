import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import AppLayoutClient from '@/components/layout/AppLayoutClient';

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
    <html lang="vi">
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <AppLayoutClient>{children}</AppLayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}

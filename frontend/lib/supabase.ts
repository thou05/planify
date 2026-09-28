import { createClient } from '@supabase/supabase-js';

function getValidSupabaseUrl(): string {
  const fallback = 'https://pluwlzyxorauyihiewxw.supabase.co';
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return fallback;

  // Remove surrounding quotes if user entered "https://..." in Vercel
  const cleaned = raw.replace(/^["']+|["']+$/g, '').trim();
  const withProtocol = cleaned.startsWith('http://') || cleaned.startsWith('https://')
    ? cleaned
    : `https://${cleaned}`;

  try {
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return fallback;
  }
}

function getValidSupabaseAnonKey(): string {
  const fallback = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXdsenl4b3JhdXlpaGlld3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTkxMjcsImV4cCI6MjEwMjM3NTEyN30.-T2uP9sCq1Qa1QTJ_5r0eWlUDlXUrQRTArYNqWRsSbg';
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!raw) return fallback;
  const cleaned = raw.replace(/^["']+|["']+$/g, '').trim();
  return cleaned || fallback;
}

const supabaseUrl = getValidSupabaseUrl();
const supabaseAnonKey = getValidSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

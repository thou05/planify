import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://pluwlzyxorauyihiewxw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXdsenl4b3JhdXlpaGlld3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTkxMjcsImV4cCI6MjEwMjM3NTEyN30.-T2uP9sCq1Qa1QTJ_5r0eWlUDlXUrQRTArYNqWRsSbg';

function isValidSupabaseJwt(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  // Bỏ qua nếu giá trị bị Vercel mask hoặc dán nhầm chuỗi placeholder
  if (token.toUpperCase().includes('SENSITIVE') || token.includes('placeholder')) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr =
      typeof atob === 'function'
        ? atob(base64Url)
        : Buffer.from(base64Url, 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr);

    if (!payload || !payload.exp || !payload.role) return false;
    // Kiểm tra chưa hết hạn
    if (payload.exp < Date.now() / 1000) return false;

    return true;
  } catch {
    return false;
  }
}

function getValidSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw || raw.toUpperCase().includes('SENSITIVE')) return FALLBACK_SUPABASE_URL;

  const cleaned = raw.replace(/^["']+|["']+$/g, '').trim();
  const withProtocol =
    cleaned.startsWith('http://') || cleaned.startsWith('https://')
      ? cleaned
      : `https://${cleaned}`;

  try {
    const url = new URL(withProtocol);
    if (url.hostname.includes('supabase.co')) {
      return withProtocol;
    }
  } catch {}

  return FALLBACK_SUPABASE_URL;
}

function getValidSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!raw) return FALLBACK_SUPABASE_ANON_KEY;

  const cleaned = raw.replace(/^["']+|["']+$/g, '').trim();
  if (isValidSupabaseJwt(cleaned)) {
    return cleaned;
  }

  // Nếu biến môi trường bị lỗi, dán nhầm hoặc bị [SENSITIVE], an toàn dùng fallback đã được kiểm thử
  console.warn(
    '[Planify Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY không hợp lệ hoặc bị mask (chứa SENSITIVE). Tự động dùng fallback anon key an toàn.'
  );
  return FALLBACK_SUPABASE_ANON_KEY;
}

const supabaseUrl = getValidSupabaseUrl();
const supabaseAnonKey = getValidSupabaseAnonKey();

export function createRealtimeClient() { return createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
  global: {
    headers: {
      apikey: supabaseAnonKey,
    },
  },
});
}

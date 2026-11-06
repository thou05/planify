'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
        };
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  text?: string;
  onSuccess?: (credential: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  className?: string;
  disabled?: boolean;
}

export function GoogleLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  text = 'Đăng nhập với Google',
  onSuccess,
  onError,
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devEmail, setDevEmail] = useState('demo.user@gmail.com');
  const [devName, setDevName] = useState('Google Demo User');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        setIsLoading(true);
        setGoogleError(null);
        if (onSuccess) {
          await onSuccess(credential);
        } else {
          await loginWithGoogle(credential);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Không thể đăng nhập với Google.');
        setGoogleError(error.message);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, loginWithGoogle, onError]
  );

  // Load Google Identity Services script
  useEffect(() => {
    if (!clientId) return;

    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    let active = true;
    let resizeObserver: ResizeObserver | undefined;
    const handleScriptError = () => {
      if (!active) return;
      script?.setAttribute('data-load-error', 'true');
      setGoogleError('Không tải được dịch vụ đăng nhập Google. Hãy kiểm tra kết nối hoặc tiện ích chặn nội dung rồi tải lại trang.');
    };
    const initGsi = () => {
      if (!active) return;
      if (!window.google?.accounts?.id) {
        handleScriptError();
        return;
      }
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              void handleCredential(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const container = googleButtonRef.current;
        if (!container) return;
        const google = window.google.accounts.id;
        let previousWidth = 0;
        const renderButton = () => {
          const width = Math.min(400, Math.floor(container.clientWidth) || 250);
          if (width === previousWidth) return;
          previousWidth = width;
          container.replaceChildren();
          google.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: text.includes('Đăng ký') ? 'signup_with' : 'signin_with',
            width,
          });
        };
        renderButton();
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(renderButton);
        resizeObserver.observe(container);
        setIsGoogleReady(true);
        setGoogleError(null);
      } catch {
        setGoogleError('Không khởi tạo được đăng nhập Google. Hãy kiểm tra cấu hình OAuth và tải lại trang.');
      }
    };

    if (script?.getAttribute('data-load-error') === 'true') {
      script.remove();
      script = null;
    }
    let shouldAppend = false;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      shouldAppend = true;
    }
    script.addEventListener('load', initGsi);
    script.addEventListener('error', handleScriptError);
    if (window.google?.accounts?.id) {
      initGsi();
    } else if (shouldAppend) {
      document.head.appendChild(script);
    }
    const timeout = window.setTimeout(() => {
      if (!window.google?.accounts?.id) handleScriptError();
    }, 15000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      resizeObserver?.disconnect();
      script?.removeEventListener('load', initGsi);
      script?.removeEventListener('error', handleScriptError);
    };
  }, [clientId, handleCredential, text]);

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (!clientId) {
      if (process.env.NODE_ENV === 'development') {
        setShowDevModal(true);
      } else {
        setGoogleError('Bản triển khai này chưa có NEXT_PUBLIC_GOOGLE_CLIENT_ID. Hãy kiểm tra biến môi trường của frontend và build lại.');
      }
    }
  };

  const handleDevSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (process.env.NODE_ENV !== 'development' || clientId) return;
    setShowDevModal(false);

    // Create mock JWT payload for development testing
    const mockPayload = {
      iss: 'https://accounts.google.com',
      sub: 'google_mock_' + Math.random().toString(36).substring(2, 10),
      email: devEmail.trim().toLowerCase(),
      name: devName.trim(),
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(devEmail)}`,
      email_verified: true,
      aud: 'mock-client-id',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const base64Payload =
      typeof window !== 'undefined'
        ? btoa(unescape(encodeURIComponent(JSON.stringify(mockPayload))))
        : '';
    const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.dev_signature`;

    void handleCredential(mockJwt);
  };

  return (
    <>
      <div className={`relative w-full ${className}`}>
        {/* Let the user click Google's button directly, including its iframe. */}
        <div
          ref={googleButtonRef}
          inert={disabled || isLoading || !isGoogleReady}
          aria-hidden={!isGoogleReady}
          className={`w-full flex justify-center ${isGoogleReady && !isLoading ? '' : 'invisible absolute inset-x-0 top-0'} ${disabled ? 'opacity-50' : ''}`}
        />
        {(!isGoogleReady || isLoading) && (
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isLoading || Boolean(clientId)}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-md text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || (clientId && !googleError) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#f28d8d]" />
                <span>{isLoading ? 'Đang xác thực Google...' : 'Đang tải Google...'}</span>
              </>
            ) : (
              <>
                <GoogleLogo className="w-4 h-4 shrink-0" />
                <span>{text}</span>
              </>
            )}
          </button>
        )}
      </div>
      {googleError && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-600 mt-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{googleError}</span>
        </p>
      )}

      {/* Dev Simulation Modal when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured */}
      {process.env.NODE_ENV === 'development' && !clientId && showDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 mb-3 text-amber-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-semibold text-sm text-slate-900">Google Auth (Môi trường Dev)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Chưa tìm thấy <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>. Bạn có thể sử dụng thông tin mô phỏng dưới đây để kiểm thử:
            </p>

            <form onSubmit={handleDevSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Google
                </label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-[#f28d8d] hover:bg-[#e57a7a] text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  Mô phỏng Đăng nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

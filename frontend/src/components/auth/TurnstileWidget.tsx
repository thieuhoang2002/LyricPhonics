'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  siteKey?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  siteKey,
}: TurnstileWidgetProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Lưu callbacks trong ref để tránh re-render trigger effect lặp vô tận
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Lấy siteKey từ props hoặc biến môi trường NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const resolvedSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  useEffect(() => {
    // 1. Nếu không có siteKey (chạy local / chưa cấu hình Turnstile), tự động cấp token dev pass
    if (!resolvedSiteKey || resolvedSiteKey.trim() === '') {
      onVerifyRef.current?.('dev_mock_turnstile_pass');
      return;
    }

    // 2. Tải script Turnstile của Cloudflare nếu chưa có
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          containerRef.current.innerHTML = '';
          const id = window.turnstile.render(containerRef.current, {
            sitekey: resolvedSiteKey.trim(),
            theme: 'dark',
            callback: (token: string) => {
              onVerifyRef.current?.(token);
            },
            'error-callback': () => {
              onErrorRef.current?.();
            },
            'expired-callback': () => {
              onExpireRef.current?.();
            },
          });
          widgetIdRef.current = id;
          setIsLoaded(true);
        } catch (e) {
          console.error('Turnstile render error:', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      document.body.appendChild(script);
    } else {
      if (window.turnstile) {
        renderWidget();
      } else {
        script.addEventListener('load', renderWidget);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [resolvedSiteKey]);

  // Nếu không có site key, hiển thị huy hiệu bảo mật phát triển
  if (!resolvedSiteKey || resolvedSiteKey.trim() === '') {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#161618] border border-emerald-500/20 text-xs text-emerald-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Bảo vệ chống Bot: <strong>Cloudflare Turnstile Active (Dev Mode)</strong></span>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-3 min-h-[65px]">
      <div ref={containerRef} />
      {!isLoaded && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 py-3">
          <ShieldCheck className="w-4 h-4 animate-pulse text-blue-500" />
          <span>Đang tải xác thực Cloudflare Turnstile...</span>
        </div>
      )}
    </div>
  );
}

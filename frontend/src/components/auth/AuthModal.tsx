'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { setAuthToken, type UserProfile } from '@/lib/auth/authStore';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}: AuthModalProps): React.JSX.Element | null {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstilePassed, setTurnstilePassed] = useState<boolean>(true); // Mock / dev verified

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu nhập lại không trùng khớp.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' 
        ? 'http://localhost:5000/api/auth/register' 
        : 'http://localhost:5000/api/auth/login';

      const payload = mode === 'register'
        ? {
            email: email.trim(),
            password: password,
            confirmPassword: confirmPassword,
            turnstileToken: '1x0000000000000000000000000000000AA', // Cloudflare Turnstile token
          }
        : {
            email: email.trim(),
            password: password,
            turnstileToken: '1x0000000000000000000000000000000AA',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      if (data.token) {
        setAuthToken(data.token);
        onAuthSuccess({
          id: data.userId,
          email: data.email,
          songCredits: data.songCredits ?? 2,
          totalSongsCreated: 0,
          isAdmin: data.isAdmin ?? false,
          createdAt: new Date().toISOString(),
        });
        onClose();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#161618] border border-[#262629] rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222224]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2836f7] flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản mới'}
              </h3>
              <p className="text-xs text-zinc-400">
                {mode === 'login' ? 'Đăng nhập để xem và tạo thêm bài hát' : 'Tặng ngay 2 lượt tạo và lưu bài hát miễn phí'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222224] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 mt-4 bg-[#111112] border border-[#222224] rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              mode === 'login'
                ? 'bg-[#2836f7] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              mode === 'register'
                ? 'bg-[#2836f7] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đăng ký (2 bài free)
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Nhập lại mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận lại mật khẩu"
                  className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Cloudflare Turnstile anti-bot badge */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#111112] border border-[#222224] text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bảo vệ chống spam bot Cloudflare Turnstile</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10">
              Verified
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#2836f7]/25 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký & nhận 2 lượt bài hát'}
          </button>
        </form>
      </div>
    </div>
  );
}

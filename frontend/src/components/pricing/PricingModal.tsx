'use client';

import React, { useState } from 'react';
import { X, Check, Coffee, Heart, CreditCard, QrCode, Copy, CheckCheck, Sparkles, Zap } from 'lucide-react';

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export function PricingModal({
  isOpen,
  onClose,
  userEmail,
}: PricingModalProps): React.JSX.Element | null {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'studio'>('pro');
  const [copiedBank, setCopiedBank] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyBank = () => {
    navigator.clipboard.writeText('3909032002');
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter Pack',
      price: '$3',
      songs: '10 bài hát',
      desc: 'Phù hợp trải nghiệm tạo lời cover và luyện hát',
      features: ['10 bài hát phiên âm 4 tầng chuẩn', 'Hỗ trợ 5 ngôn ngữ đích', 'Xuất file LRC & TXT 1-click'],
      badge: null,
    },
    {
      id: 'pro',
      name: 'Pro Musician',
      price: '$6',
      songs: '25 bài hát',
      desc: 'Lựa chọn tốt nhất cho ca sĩ cover & nhạc sĩ',
      features: ['25 bài hát chuẩn phòng thu', 'Tự động tái tạo phiên âm AI LPU', 'Ưu tiên xử lý tốc độ cao', 'Lưu trữ không giới hạn thời gian'],
      badge: 'Phổ biến nhất',
    },
    {
      id: 'studio',
      name: 'Studio Unlimited',
      price: '$15',
      songs: '70 bài hát',
      desc: 'Dành cho phòng thu & nhà sáng tạo nội dung',
      features: ['70 bài hát cover chất lượng cao', 'Tốc độ siêu tốc Groq LPU', 'Hỗ trợ kỹ thuật ưu tiên 24/7', 'Tất cả các bản cập nhật tương lai'],
      badge: 'Tiết kiệm 30%',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#141416] border border-[#262629] rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222224]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2836f7] flex items-center justify-center text-white shadow-lg shadow-[#2836f7]/25">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Nâng cấp Lượt tạo & Lưu Bài Hát
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2836f7]/20 text-[#424ef5] border border-[#2836f7]/30">
                  Melody Pro
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mỗi tài khoản miễn phí 2 bài hát. Nạp thêm lượt để tiếp tục bóc tách lời cover không giới hạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222224] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {plans.map((p) => {
            const isSelected = selectedPlan === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id as any)}
                className={`relative flex flex-col p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1b1b1e] border-[#2836f7] shadow-xl shadow-[#2836f7]/20 ring-1 ring-[#2836f7]'
                    : 'bg-[#18181a] border-[#262629] hover:border-zinc-600'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2836f7] text-white shadow-md">
                    {p.badge}
                  </span>
                )}
                <h3 className="text-sm font-bold text-white">{p.name}</h3>
                <p className="text-[11px] text-zinc-400 mt-1 min-h-[32px]">{p.desc}</p>

                <div className="my-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{p.price}</span>
                  <span className="text-xs text-zinc-400 font-medium">/ {p.songs}</span>
                </div>

                <div className="space-y-2 mt-auto pt-3 border-t border-[#262629]">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-[#424ef5] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment & Donation Channels */}
        <div className="mt-8 p-5 rounded-2xl bg-[#18181b] border border-[#262629]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-[#424ef5]" />
            Phương thức Thanh toán & Donate (Duyệt lượt trong 1-5 phút)
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Vui lòng ghi kèm nội dung chuyển khoản là <b className="text-white font-mono bg-[#222224] px-1.5 py-0.5 rounded">{userEmail || 'Email của bạn'}</b> để hệ thống cộng lượt tự động.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Ko-fi */}
            <a
              href="https://ko-fi.com/thhoang0903"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1f1f23] hover:bg-[#2836f7] hover:text-white border border-[#2e2e33] text-zinc-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#29abe2]/20 flex items-center justify-center text-[#29abe2] group-hover:text-white group-hover:bg-white/20">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold">Ko-fi</div>
                <div className="text-[10px] text-zinc-400 group-hover:text-zinc-200">Donate $ qua Ko-fi</div>
              </div>
            </a>

            {/* Buy Me A Coffee */}
            <a
              href="https://buymeacoffee.com/thhoang0903"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1f1f23] hover:bg-[#2836f7] hover:text-white border border-[#2e2e33] text-zinc-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:text-white group-hover:bg-white/20">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Buy Me Coffee</div>
                <div className="text-[10px] text-zinc-400 group-hover:text-zinc-200">Donate qua thẻ quốc tế</div>
              </div>
            </a>

            {/* PayPal */}
            <a
              href="https://paypal.me/thieuhoang2209"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-[#1f1f23] hover:bg-[#2836f7] hover:text-white border border-[#2e2e33] text-zinc-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:text-white group-hover:bg-white/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">PayPal</div>
                <div className="text-[10px] text-zinc-400 group-hover:text-zinc-200">paypal.me/thieuhoang2209</div>
              </div>
            </a>

            {/* TECHCOMBANK VN */}
            <div
              onClick={handleCopyBank}
              className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f23] hover:border-[#2836f7] border border-[#2e2e33] text-zinc-200 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">TECHCOMBANK</div>
                  <div className="text-[11px] font-mono text-zinc-300">3909032002</div>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2c2c31]"
                title="Sao chép số tài khoản"
              >
                {copiedBank ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262629] flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div>
              Chủ tài khoản Techcombank: <b className="text-white">THIEU VIET HOANG</b> • STK: <b className="text-white font-mono">3909032002</b>
            </div>
            <div className="text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Lượt sẽ được kích hoạt tức thì sau khi xác nhận chuyển khoản
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

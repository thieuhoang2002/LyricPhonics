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
      songs: '10 songs',
      desc: 'Perfect for trying out phonetic cover lyrics & vocal practice',
      features: [
        '10 studio-standard phonetic cover songs',
        'Support for all target languages',
        '1-click LRC, SRT & TXT export',
      ],
      badge: null,
    },
    {
      id: 'pro',
      name: 'Pro Musician',
      price: '$6',
      songs: '25 songs',
      desc: 'Best choice for active cover singers & artists',
      features: [
        '25 studio-grade phonetic cover songs',
        'High-speed AI processing engine',
        'Priority server queue',
        'Permanent cloud storage',
      ],
      badge: 'Most Popular',
    },
    {
      id: 'studio',
      name: 'Studio Unlimited',
      price: '$15',
      songs: '70 songs',
      desc: 'Designed for music studios, producers & power creators',
      features: [
        '70 high-quality cover songs',
        'Ultra-fast Groq LPU acceleration',
        '24/7 priority technical support',
        'All future engine updates included',
      ],
      badge: 'Save 30%',
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
              <h2 className="text-xl font-bold text-white">
                Upgrade Song Credits & Storage
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every account gets 2 free songs. Top up credits to continue unlimited AI phonetic cover transcription.
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
            Payment & Donation Methods (Activated within 1–5 minutes)
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Please include your account email in the transfer note:{' '}
            <b className="text-white font-mono bg-[#222224] px-1.5 py-0.5 rounded">
              {userEmail || 'your-email@example.com'}
            </b>{' '}
            for automatic credit top-up.
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
                <div className="text-[10px] text-zinc-400 group-hover:text-zinc-200">Donate via Ko-fi</div>
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
                <div className="text-[10px] text-zinc-400 group-hover:text-zinc-200">International Cards</div>
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
                title="Copy account number"
              >
                {copiedBank ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#262629] flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div>
              Account Holder: <b className="text-white">THIEU VIET HOANG</b> • Account No: <b className="text-white font-mono">3909032002</b>
            </div>
            <div className="text-emerald-400 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Credits will be activated instantly upon payment confirmation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

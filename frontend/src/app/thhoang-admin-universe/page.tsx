'use client';

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api/config';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Users,
  Activity,
  Layers,
  Plus,
  Minus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Sliders,
  DollarSign,
  Cpu,
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  registrationIp: string;
  songCredits: number;
  totalSongsCreated: number;
  isAdmin: boolean;
  createdAt: string;
}

interface ApiKeyItem {
  id: string;
  provider: string;
  keyValue: string;
  isActive: boolean;
  status: string;
  latencyMs?: number;
  lastCheckedAt?: string;
  createdAt: string;
}

interface PricingTierItem {
  id: string;
  name: string;
  priceUsd: number;
  songCount: number;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminUniversePage(): React.JSX.Element {
  // Auth state
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [hint, setHint] = useState<string>('');
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'pricing'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTierItem[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New API key form
  const [newKeyProvider, setNewKeyProvider] = useState('gemini');
  const [newKeyValue, setNewKeyValue] = useState('');

  // New Pricing Tier modal & form
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTier, setNewTier] = useState({
    id: '',
    name: '',
    priceUsd: 5.0,
    songCount: 20,
    discountPercent: 0,
    sortOrder: 1,
  });

  // Check stored admin token
  useEffect(() => {
    const saved = sessionStorage.getItem('lyricphonics_admin_token');
    if (saved) {
      setAdminToken(saved);
    }
  }, []);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Step 1: Layer 1 Server Password
  const handleLayer1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/login-layer1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Mật khẩu Admin Lớp 1 không chính xác.');
        setAuthLoading(false);
        return;
      }

      setChallengeToken(data.challengeToken);
      setHint(data.hint || '');
      setStep(2);
    } catch {
      setAuthError('Không thể kết nối đến máy chủ backend.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Step 2: Layer 2 Military-Grade Web Crypto PBKDF2 + AES-GCM
  const handleLayer2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/verify-layer2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          masterPassphrase: masterPassphrase.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Master Passphrase không hợp lệ.');
        setAuthLoading(false);
        return;
      }

      setAdminToken(data.adminToken);
      sessionStorage.setItem('lyricphonics_admin_token', data.adminToken);
      showNotice('Chào mừng đến với Vũ trụ Quản trị Bảo mật 2 lớp!');
    } catch {
      setAuthError('Không thể kết nối đến máy chủ backend.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch Dashboard Data
  const loadDashboardData = async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      // 1. Users
      const usersRes = await fetch(`${getApiBaseUrl()}/api/admin/users${searchUser ? `?search=${encodeURIComponent(searchUser)}` : ''}`);
      if (usersRes.ok) setUsers(await usersRes.json());

      // 2. API Keys
      const keysRes = await fetch(`${getApiBaseUrl()}/api/admin/api-keys`);
      if (keysRes.ok) setApiKeys(await keysRes.json());

      // 3. Pricing Tiers
      const pricingRes = await fetch(`${getApiBaseUrl()}/api/admin/pricing`);
      if (pricingRes.ok) setPricingTiers(await pricingRes.json());
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      void loadDashboardData();
    }
  }, [adminToken, searchUser]);

  // Adjust User Credits
  const handleAdjustCredits = async (userId: string, delta: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, songCredits: Math.max(0, u.songCredits + delta) } : u
          )
        );
        showNotice(`Đã ${delta > 0 ? `cộng +${delta}` : `trừ ${delta}`} lượt cho tài khoản.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check API Key Health
  const handleCheckKeyHealth = async (keyId: string) => {
    showNotice('Đang ping kiểm tra API Key...');
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${keyId}/health-check`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setApiKeys((prev) => prev.map((k) => (k.id === keyId ? updated : k)));
        showNotice(`Health Check: ${updated.status} (${updated.latencyMs}ms)`);
      }
    } catch {
      showNotice('Health Check thất bại.');
    }
  };

  // Add API Key
  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyValue.trim()) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newKeyProvider, keyValue: newKeyValue.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setApiKeys((prev) => [created, ...prev]);
        setNewKeyValue('');
        showNotice('Đã thêm API Key thành công!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete API Key
  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa API Key này?')) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
        showNotice('Đã xóa API Key.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle API Key active status
  const handleToggleApiKey = async (keyId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${keyId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setApiKeys((prev) => prev.map((k) => (k.id === keyId ? updated : k)));
        showNotice(`Đã ${updated.isActive ? 'bật' : 'tắt'} API Key.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create New Pricing Tier
  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTier.id.trim() || !newTier.name.trim()) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newTier.id.trim().toLowerCase(),
          name: newTier.name.trim(),
          priceUsd: Number(newTier.priceUsd),
          songCount: Number(newTier.songCount),
          discountPercent: Number(newTier.discountPercent),
          isActive: true,
          sortOrder: Number(newTier.sortOrder),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setPricingTiers((prev) => [...prev, created]);
        setShowAddTierModal(false);
        setNewTier({
          id: '',
          name: '',
          priceUsd: 5.0,
          songCount: 20,
          discountPercent: 0,
          sortOrder: pricingTiers.length + 1,
        });
        showNotice('Đã thêm gói mua lượt mới thành công!');
      } else {
        showNotice('Không thể tạo gói (Mã gói có thể đã tồn tại).');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Pricing Tier
  const handleDeleteTier = async (tierId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa gói [${tierId}] này?`)) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/pricing/${tierId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPricingTiers((prev) => prev.filter((t) => t.id !== tierId));
        showNotice(`Đã xóa gói [${tierId}].`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Pricing Tier
  const handleUpdateTier = async (tier: PricingTierItem) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/pricing/${tier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceUsd: tier.priceUsd,
          songCount: tier.songCount,
          discountPercent: tier.discountPercent,
          isActive: tier.isActive,
        }),
      });
      if (res.ok) {
        showNotice(`Đã cập nhật gói ${tier.name}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('lyricphonics_admin_token');
    setStep(1);
    setPassword('');
    setMasterPassphrase('');
  };

  // -------------------------------------------------------------
  // Render Login Form (Layer 1 & Layer 2)
  // -------------------------------------------------------------
  if (!adminToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0e] p-4 text-zinc-100">
        <div className="w-full max-w-md bg-[#141416] border border-[#222224] rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Admin Universe Secret Gateway</h1>
              <p className="text-xs text-zinc-400">Hệ thống phòng thủ 2 lớp cấp quân sự (PBKDF2 + AES-256-GCM)</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2 mb-6 text-xs">
            <div
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-between border ${
                step === 1 ? 'bg-[#2836f7]/20 border-[#2836f7] text-white' : 'bg-[#1b1b1e] border-[#262629] text-zinc-400'
              }`}
            >
              <span>1. Mật khẩu Server</span>
              {step === 2 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
            <div
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-between border ${
                step === 2 ? 'bg-[#2836f7]/20 border-[#2836f7] text-white' : 'bg-[#1b1b1e] border-[#262629] text-zinc-500'
              }`}
            >
              <span>2. Master Passphrase</span>
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {authError}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleLayer1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email Quản Trị</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Mật khẩu Lớp 1 (appsettings)</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu trong appsettings.Development.json"
                  className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white text-xs font-medium transition-colors shadow-lg shadow-[#2836f7]/25"
              >
                {authLoading ? 'Đang xác thực...' : 'Tiếp tục sang Lớp 2'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLayer2Submit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Gợi nhớ bảo mật (Hint):</div>
                  <div className="mt-0.5 text-zinc-300">{hint || 'Gợi ý bảo mật đã cấu hình'}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Master Passphrase (PBKDF2 100k rounds + AES-GCM Tag)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={masterPassphrase}
                  onChange={(e) => setMasterPassphrase(e.target.value)}
                  placeholder="Nhập Master Passphrase bí mật"
                  className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-4 rounded-xl bg-[#222224] hover:bg-[#2b2b2f] text-zinc-300 text-xs font-medium"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-600/25"
                >
                  {authLoading ? 'Đang giải mã PBKDF2...' : 'Mở khóa Vũ trụ Quản trị'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Admin Universe Dashboard
  // -------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col bg-[#111112] text-zinc-100 pb-20">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#222224] bg-[#141416]/95 px-4 py-3 md:px-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">LyricPhonics Admin Universe</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                SuperAdmin
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Bảo mật 2 lớp quân sự • Quản trị người dùng & hạ tầng AI</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actionNotice && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[#2836f7]/20 text-[#424ef5] border border-[#2836f7]/40 animate-pulse">
              {actionNotice}
            </span>
          )}
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222224] transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full p-4 md:p-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-[#161618] border border-[#222224] rounded-xl text-xs font-medium mb-6 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users' ? 'bg-[#2836f7] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Quản lý Người Dùng ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'keys' ? 'bg-[#2836f7] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            API Key & Health Check ({apiKeys.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'pricing' ? 'bg-[#2836f7] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Quản lý Gói Mua Lượt ({pricingTiers.length})
          </button>
        </div>

        {/* ----------------- TAB 1: USERS ----------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                placeholder="Tìm kiếm theo Email hoặc IP..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="bg-[#161618] border border-[#262629] focus:border-[#2836f7] rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-500 w-full sm:w-72 focus:outline-none"
              />
              <span className="text-xs text-zinc-400">
                Mỗi tài khoản miễn phí 2 bài hát. Bấm nút <b className="text-white">+ / -</b> để điều chỉnh lượt tức thì.
              </span>
            </div>

            <div className="border border-[#222224] rounded-2xl overflow-hidden bg-[#161618]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111112] text-zinc-400 border-b border-[#222224]">
                  <tr>
                    <th className="p-3.5">Email Người Dùng</th>
                    <th className="p-3.5">IP Đăng Ký</th>
                    <th className="p-3.5">Số Bài Đã Tạo</th>
                    <th className="p-3.5 text-center">Lượt Còn Lại (Credits)</th>
                    <th className="p-3.5 text-right">Điều Chỉnh Lượt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222224]">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500">
                        Chưa có người dùng nào.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className={`transition-colors ${u.isAdmin ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-[#1a1a1d]'}`}>
                        <td className="p-3.5 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <span>{u.email}</span>
                            {u.isAdmin && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1 shadow-sm">
                                👑 SuperAdmin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-400">{u.registrationIp || 'Localhost'}</td>
                        <td className="p-3.5 text-zinc-300">{u.totalSongsCreated} bài</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`font-bold px-2.5 py-1 rounded-full text-xs ${
                              u.isAdmin
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : u.songCredits > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {u.isAdmin ? '∞ (Vô hạn)' : `${u.songCredits} lượt`}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustCredits(u.id, 1)}
                              className="px-2 py-1 rounded bg-[#222224] hover:bg-[#2836f7] hover:text-white text-zinc-300 font-bold transition-colors"
                              title="Cộng 1 lượt"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustCredits(u.id, 5)}
                              className="px-2 py-1 rounded bg-[#222224] hover:bg-[#2836f7] hover:text-white text-zinc-300 font-bold transition-colors"
                              title="Cộng 5 lượt"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustCredits(u.id, 10)}
                              className="px-2 py-1 rounded bg-[#222224] hover:bg-[#2836f7] hover:text-white text-zinc-300 font-bold transition-colors"
                              title="Cộng 10 lượt"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAdjustCredits(u.id, -1)}
                              className="px-2 py-1 rounded bg-[#222224] hover:bg-rose-600 hover:text-white text-rose-400 font-bold transition-colors"
                              title="Trừ 1 lượt"
                            >
                              -1
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: API KEYS & HEALTH CHECK ----------------- */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* AI Pool Info Banner */}
            <div className="p-4 rounded-2xl bg-[#161618] border border-[#222224] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2836f7]/20 border border-[#2836f7]/30 flex items-center justify-center text-[#424ef5] shrink-0 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed">
                <div className="font-semibold text-white mb-0.5">Cơ chế AI Key Pooling & Fallback tự động</div>
                Tất cả API Key ở đây được lưu trữ trong Neon PostgreSQL và liên kết trực tiếp vào <b>AI Key Pool</b> của Backend (.NET 8).
                Hệ thống tự động xoay vòng Round-Robin qua các key Healthy, và tự động Fallback về biến môi trường (<code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code>) nếu các key trong pool cạn kiệt hoặc gặp lỗi 429 RateLimit.
              </div>
            </div>

            {/* Add Key Form */}
            <form onSubmit={handleAddApiKey} className="p-4 rounded-2xl bg-[#161618] border border-[#222224] flex flex-col sm:flex-row items-center gap-3">
              <select
                value={newKeyProvider}
                onChange={(e) => setNewKeyProvider(e.target.value)}
                className="bg-[#111112] border border-[#262629] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq AI (LPU)</option>
              </select>

              <input
                type="text"
                required
                placeholder="Nhập chuỗi API Key mới (AIza... hoặc gsk_...)"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                className="flex-1 bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                Thêm Key
              </button>
            </form>

            {/* Keys Table */}
            <div className="border border-[#222224] rounded-2xl overflow-hidden bg-[#161618]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111112] text-zinc-400 border-b border-[#222224]">
                  <tr>
                    <th className="p-3.5">Provider</th>
                    <th className="p-3.5">Key Value</th>
                    <th className="p-3.5">Trạng Thái Pool</th>
                    <th className="p-3.5">Sức Khỏe</th>
                    <th className="p-3.5">Độ Trễ (Latency)</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222224]">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500">
                        Chưa có API Key nào trong Database pool. Hệ thống đang chạy bằng biến môi trường (Environment Variables).
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-[#1a1a1d] transition-colors">
                        <td className="p-3.5 font-bold uppercase text-white">{k.provider}</td>
                        <td className="p-3.5 font-mono text-zinc-400">
                          {k.keyValue.length > 16 ? `${k.keyValue.slice(0, 8)}...${k.keyValue.slice(-6)}` : k.keyValue}
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleApiKey(k.id)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              k.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                            }`}
                            title="Bật/Tắt key này khỏi AI pool"
                          >
                            {k.isActive ? 'Đang Bật' : 'Đang Tắt'}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              k.status === 'Healthy'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : k.status === 'RateLimited'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {k.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-300">
                          {k.latencyMs != null ? `${k.latencyMs} ms` : 'Chưa test'}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCheckKeyHealth(k.id)}
                              className="px-2.5 py-1 rounded bg-[#222224] hover:bg-emerald-600 hover:text-white text-zinc-300 font-medium transition-colors"
                            >
                              Health Check
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteApiKey(k.id)}
                              className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Xóa key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: PRICING TIERS ----------------- */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Header Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#161618] border border-[#222224]">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Quản lý Gói Mua Lượt ({pricingTiers.length})
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tùy chỉnh giá, số lượng bài hát, % giảm giá khuyến mãi (Sale), bật/ẩn và xóa gói trực tiếp.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Gói Mới
                </button>
              </div>
            </div>

            {/* Modal / Form thêm gói mới */}
            {showAddTierModal && (
              <form onSubmit={handleCreateTier} className="p-5 rounded-2xl bg-[#161618] border border-[#2836f7]/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#222224] pb-3">
                  <span className="font-bold text-white text-sm">Thêm Gói Mua Lượt Mới</span>
                  <button
                    type="button"
                    onClick={() => setShowAddTierModal(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Mã Gói (ID duy nhất, viết thường)</label>
                    <input
                      type="text"
                      required
                      placeholder="ví dụ: pro_plus"
                      value={newTier.id}
                      onChange={(e) => setNewTier({ ...newTier, id: e.target.value })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Tên Gói Hiển Thị</label>
                    <input
                      type="text"
                      required
                      placeholder="ví dụ: VIP Singer"
                      value={newTier.name}
                      onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Giá ($ USD)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={newTier.priceUsd}
                      onChange={(e) => setNewTier({ ...newTier, priceUsd: Number(e.target.value) })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Số Bài Hát (Song Count)</label>
                    <input
                      type="number"
                      required
                      value={newTier.songCount}
                      onChange={(e) => setNewTier({ ...newTier, songCount: Number(e.target.value) })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Giảm Giá (% Sale)</label>
                    <input
                      type="number"
                      value={newTier.discountPercent}
                      onChange={(e) => setNewTier({ ...newTier, discountPercent: Number(e.target.value) })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Thứ Tự Sắp Xếp (Sort Order)</label>
                    <input
                      type="number"
                      value={newTier.sortOrder}
                      onChange={(e) => setNewTier({ ...newTier, sortOrder: Number(e.target.value) })}
                      className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTierModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#222224] hover:bg-[#2b2b2f] text-zinc-300 text-xs font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md"
                  >
                    Lưu Gói Mới
                  </button>
                </div>
              </form>
            )}

            {/* Empty State */}
            {pricingTiers.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#161618] border border-[#222224] space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Chưa có gói mua lượt nào</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    Bấm nút bên dưới để hệ thống tự động khởi tạo 3 gói chuẩn phòng thu (Starter, Pro, Studio).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDashboardData}
                  className="px-5 py-2.5 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white text-xs font-semibold shadow-md inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Khởi Tạo 3 Gói Mặc Định
                </button>
              </div>
            ) : (
              /* Grid Tiers */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {pricingTiers.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl bg-[#161618] border border-[#222224] space-y-4 relative flex flex-col justify-between">
                    {t.discountPercent > 0 && (
                      <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px] shadow-md uppercase tracking-wider">
                        Sale -{t.discountPercent}%
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-2">
                          <label className="block text-[10px] text-zinc-500 mb-0.5">Tên Gói</label>
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPricingTiers((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, name: val } : item))
                              );
                            }}
                            className="w-full font-bold text-white text-sm bg-transparent border-b border-transparent focus:border-[#2836f7] focus:outline-none"
                          />
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#222224] text-zinc-400 uppercase">
                          {t.id}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Giá ($ USD)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={t.priceUsd}
                              onChange={(e) => {
                                const val = Number.parseFloat(e.target.value) || 0;
                                setPricingTiers((prev) =>
                                  prev.map((item) => (item.id === t.id ? { ...item, priceUsd: val } : item))
                                );
                              }}
                              className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">Số bài (Songs)</label>
                            <input
                              type="number"
                              value={t.songCount}
                              onChange={(e) => {
                                const val = Number.parseInt(e.target.value, 10) || 0;
                                setPricingTiers((prev) =>
                                  prev.map((item) => (item.id === t.id ? { ...item, songCount: val } : item))
                                );
                              }}
                              className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">Giảm Giá (% Sale)</label>
                          <input
                            type="number"
                            value={t.discountPercent}
                            onChange={(e) => {
                              const val = Number.parseInt(e.target.value, 10) || 0;
                              setPricingTiers((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, discountPercent: val } : item))
                              );
                            }}
                            className="w-full bg-[#111112] border border-[#262629] focus:border-[#2836f7] rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-zinc-300">Trạng thái gói:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPricingTiers((prev) =>
                                prev.map((item) => (item.id === t.id ? { ...item, isActive: !item.isActive } : item))
                              );
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              t.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                            }`}
                          >
                            {t.isActive ? 'Đang Bật' : 'Đang Ẩn'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-[#222224]">
                      <button
                        type="button"
                        onClick={() => handleUpdateTier(t)}
                        className="flex-1 py-2 rounded-xl bg-[#2836f7] hover:bg-[#424ef5] text-white text-xs font-medium transition-colors shadow-md text-center"
                      >
                        Lưu Thay Đổi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(t.id)}
                        className="p-2 rounded-xl bg-[#222224] hover:bg-rose-500/10 text-rose-400 transition-colors"
                        title="Xóa gói này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

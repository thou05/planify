'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, User } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  User as UserIcon,
  Shield,
  Mail,
  Phone,
  Globe,
  Clock,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  LayoutGrid,
  Check,
  CheckCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'invitations'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [language, setLanguage] = useState('vi');

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Invitations State
  const [invitations, setInvitations] = useState<{
    workspaceInvites: any[];
    boardInvites: any[];
  }>({ workspaceInvites: [], boardInvites: [] });
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [processingToken, setProcessingToken] = useState<string | null>(null);

  // Status message
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setTimezone(user.timezone || 'Asia/Ho_Chi_Minh');
      setLanguage(user.language || 'vi');
    }
  }, [user]);

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const res = await apiClient<any>('/users/invitations');
      if (res.success && res.data) {
        setInvitations({
          workspaceInvites: res.data.workspaceInvites || [],
          boardInvites: res.data.boardInvites || [],
        });
      }
    } catch {
      // ignore
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const totalInvites =
    (invitations.workspaceInvites?.length || 0) + (invitations.boardInvites?.length || 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Tên người dùng không được để trống' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await apiClient<User>('/users/profile', {
        method: 'PATCH',
        data: {
          name: name.trim(),
          avatar: avatar.trim() || null,
          bio: bio.trim(),
          phone: phone.trim(),
          timezone,
          language,
        },
      });

      if (res.success && res.data) {
        updateUser(res.data);
        setStatusMessage({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công!' });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Không thể cập nhật hồ sơ',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' });
      return;
    }

    setIsChangingPass(true);

    try {
      const res = await apiClient('/users/change-password', {
        method: 'POST',
        data: {
          currentPassword,
          newPassword,
        },
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleAcceptWorkspace = async (token: string, workspaceId: string) => {
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/workspaces/invites/${token}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        fetchInvitations();
        router.push(`/workspaces/${workspaceId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể chấp nhận lời mời');
    } finally {
      setProcessingToken(null);
    }
  };

  const handleRejectWorkspace = async (token: string) => {
    if (!confirm('Bạn có chắc muốn từ chối lời mời này?')) return;
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/workspaces/invites/${token}/reject`, {
        method: 'POST',
      });
      if (res.success) {
        fetchInvitations();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể từ chối lời mời');
    } finally {
      setProcessingToken(null);
    }
  };

  const handleAcceptBoard = async (token: string, boardId: string) => {
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/boards/invites/${token}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        fetchInvitations();
        router.push(`/boards/${boardId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Không thể chấp nhận lời mời');
    } finally {
      setProcessingToken(null);
    }
  };

  const handleRejectBoard = async (token: string) => {
    if (!confirm('Bạn có chắc muốn từ chối lời mời vào Board này?')) return;
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/boards/invites/${token}/reject`, {
        method: 'POST',
      });
      if (res.success) {
        fetchInvitations();
      }
    } catch (err: any) {
      alert(err.message || 'Không thể từ chối lời mời');
    } finally {
      setProcessingToken(null);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Hero Card */}
        <div className="glass-surface p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-[#a6d1fd]/30 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-64 h-64 rounded-full bg-[#a000c8]/15 blur-3xl pointer-events-none" />

          {/* Avatar */}
          <div className="w-24 h-24 rounded-3xl bg-[#2b1572]/10 border-2 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-lg relative">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-extrabold text-[#2b1572]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 text-xs font-semibold text-[#2b1572] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#a000c8]" />
              <span>Tài khoản Planify cá nhân</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2b1572] tracking-tight">
              {user.name}
            </h1>
            <p className="text-xs text-[#2b1572]/70 mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span>{user.email}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[10px]">
                {user.status || 'ACTIVE'}
              </span>
            </p>
            {user.bio && (
              <p className="text-xs text-[#2b1572]/80 mt-2 italic max-w-xl">
                &ldquo;{user.bio}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-[#2b1572]/10 pb-1">
          <button
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md'
                : 'text-[#2b1572]/70 hover:bg-white/40'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setStatusMessage(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md'
                : 'text-[#2b1572]/70 hover:bg-white/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Bảo mật & Mật khẩu</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('invitations');
              setStatusMessage(null);
              fetchInvitations();
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'invitations'
                ? 'bg-[#2b1572] text-[#a6d1fd] shadow-md'
                : 'text-[#2b1572]/70 hover:bg-white/40'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Lời mời</span>
            {totalInvites > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#c40000] text-white text-[10px] font-black leading-none">
                {totalInvites}
              </span>
            )}
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                : 'bg-[#c40000]/10 border-[#c40000]/30 text-[#c40000]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#c40000] shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Tab Panels */}
        <div className="glass-surface p-6 sm:p-8">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#2b1572] mb-2">
                  Ảnh đại diện (Avatar)
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#2b1572]/10 border-2 border-[#2b1572]/20 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-[#2b1572]">
                        {name ? name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-[240px] space-y-2">
                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Dán link ảnh đại diện (URL)..."
                      className="w-full px-3.5 py-2.5 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#2b1572]/60 font-medium">Chọn avatar mẫu:</span>
                      <div className="flex items-center gap-1.5">
                        {PRESET_AVATARS.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(url)}
                            className={`w-6 h-6 rounded-full overflow-hidden border-2 cursor-pointer hover:scale-110 transition-transform ${
                              avatar === url ? 'border-[#2b1572] scale-110 ring-2 ring-[#a6d1fd]' : 'border-white/80'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                    Họ và tên <span className="text-[#c40000]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên của bạn"
                    className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                    Email tài khoản
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/30 text-[#2b1572]/60 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                  Tiểu sử / Bio cá nhân
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Chia sẻ đôi nét về vai trò, chuyên môn hoặc mục tiêu làm việc..."
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572] placeholder:text-[#2b1572]/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#2b1572]/60" />
                    <span>Số điện thoại</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+84 987 654 321"
                    className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#2b1572]/60" />
                    <span>Múi giờ</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input text-[#2b1572] cursor-pointer"
                  >
                    <option value="Asia/Ho_Chi_Minh">GMT+7 (Hà Nội, TP.HCM)</option>
                    <option value="Asia/Bangkok">GMT+7 (Bangkok)</option>
                    <option value="Asia/Singapore">GMT+8 (Singapore)</option>
                    <option value="Asia/Tokyo">GMT+9 (Tokyo, Seoul)</option>
                    <option value="UTC">UTC (Giờ phối hợp quốc tế)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-[#2b1572]/60" />
                    <span>Ngôn ngữ</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input text-[#2b1572] cursor-pointer"
                  >
                    <option value="vi">Tiếng Việt (VI)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu thông tin...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/50 border border-white/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#2b1572]/70 font-semibold">Tình trạng tài khoản:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[11px]">
                    ● Đang hoạt động (ACTIVE)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#2b1572]/70 font-semibold">Thời gian khởi tạo:</span>
                  <span className="text-[#2b1572] font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '2026'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2b1572] flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>Thay đổi mật khẩu</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                    Mật khẩu hiện tại <span className="text-[#c40000]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng..."
                    className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                      Mật khẩu mới <span className="text-[#c40000]">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự..."
                      className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-[#c40000]">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-6 py-3 btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isChangingPass ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang cập nhật mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Cập nhật mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2b1572]">
                    Danh sách lời mời ({totalInvites})
                  </h3>
                  <p className="text-[11px] text-[#2b1572]/70">
                    Chấp nhận hoặc từ chối các lời mời tham gia dự án được gửi tới email của bạn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchInvitations}
                  disabled={loadingInvites}
                  className="text-xs font-bold text-[#2b1572] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Làm mới danh sách
                </button>
              </div>

              {loadingInvites ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#2b1572]/60">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2b1572]" />
                  <span className="text-xs">Đang kiểm tra lời mời...</span>
                </div>
              ) : totalInvites === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-white/30 border border-white/60 space-y-2">
                  <Mail className="w-10 h-10 text-[#2b1572]/40 mx-auto" />
                  <p className="text-xs font-bold text-[#2b1572]">Không có lời mời nào đang chờ</p>
                  <p className="text-[11px] text-[#2b1572]/60 max-w-sm mx-auto">
                    Bạn hiện chưa nhận được lời mời tham gia Không gian làm việc hoặc Bảng nào mới.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.workspaceInvites?.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl glass-surface border border-white/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2b1572] text-[#a6d1fd] flex items-center justify-center shrink-0 shadow-sm">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#2b1572]">
                              {inv.workspace?.name || 'Không gian làm việc'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#a6d1fd]/40 text-[#2b1572] font-bold text-[10px]">
                              Workspace • {inv.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#2b1572]/60 mt-0.5">
                            Người mời: {inv.workspace?.owner?.name || 'Admin'} • Hết hạn:{' '}
                            {new Date(inv.expired_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleRejectWorkspace(inv.token)}
                          className="px-3 py-1.5 rounded-xl border border-[#c40000]/30 text-[#c40000] hover:bg-[#c40000]/10 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleAcceptWorkspace(inv.token, inv.workspace?.id)}
                          className="px-4 py-1.5 btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {processingToken === inv.token ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Chấp nhận</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {invitations.boardInvites?.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-2xl glass-surface border border-white/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2b1572]/90 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-[#2b1572]">
                              {inv.board?.name || 'Bảng công việc'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-900 font-bold text-[10px]">
                              Board • {inv.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#2b1572]/60 mt-0.5">
                            {inv.board?.workspace?.name ? `Thuộc: ${inv.board.workspace.name} • ` : ''}
                            Người mời: {inv.inviter?.name || 'Thành viên'} • Hết hạn:{' '}
                            {new Date(inv.expired_at).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleRejectBoard(inv.token)}
                          className="px-3 py-1.5 rounded-xl border border-[#c40000]/30 text-[#c40000] hover:bg-[#c40000]/10 text-xs font-bold cursor-pointer transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleAcceptBoard(inv.token, inv.board?.id)}
                          className="px-4 py-1.5 btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {processingToken === inv.token ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Chấp nhận</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

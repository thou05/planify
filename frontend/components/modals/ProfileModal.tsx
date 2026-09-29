'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, User } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  X,
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
  LayoutGrid,
  Layers,
  Check,
  CheckCheck,
  XCircle,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'security' | 'invitations';
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

export default function ProfileModal({
  isOpen,
  onClose,
  initialTab = 'profile',
}: ProfileModalProps) {
  const router = useRouter();
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'invitations'>(initialTab);

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

  // UI Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setTimezone(user.timezone || 'Asia/Ho_Chi_Minh');
      setLanguage(user.language || 'vi');
    }
  }, [user, isOpen]);

  // Fetch pending invitations when tab is active or modal opens
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
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const totalInvites =
    (invitations.workspaceInvites?.length || 0) + (invitations.boardInvites?.length || 0);

  // Save profile handler
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
        text: err.message || 'Không thể cập nhật hồ sơ, vui lòng thử lại',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Change password handler
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

  // Accept workspace invite
  const handleAcceptWorkspace = async (token: string, workspaceId: string) => {
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/workspaces/invites/${token}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        setInvitations((prev) => ({
          ...prev,
          workspaceInvites: prev.workspaceInvites.filter((i) => i.token !== token),
        }));
        onClose();
        window.location.href = `/workspaces/${workspaceId}`;
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Không thể chấp nhận lời mời' });
    } finally {
      setProcessingToken(null);
    }
  };

  // Reject workspace invite
  const handleRejectWorkspace = (token: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Từ chối lời mời',
      message: 'Bạn có chắc chắn muốn từ chối lời mời tham gia Không gian làm việc này?',
      confirmText: 'Từ chối',
      variant: 'danger',
      onConfirm: async () => {
        setProcessingToken(token);
        try {
          const res = await apiClient<any>(`/workspaces/invites/${token}/reject`, {
            method: 'POST',
          });
          if (res.success) {
            setInvitations((prev) => ({
              ...prev,
              workspaceInvites: prev.workspaceInvites.filter((i) => i.token !== token),
            }));
            fetchInvitations();
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Không thể từ chối lời mời' });
        } finally {
          setProcessingToken(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Accept board invite
  const handleAcceptBoard = async (token: string, boardId: string) => {
    setProcessingToken(token);
    try {
      const res = await apiClient<any>(`/boards/invites/${token}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        setInvitations((prev) => ({
          ...prev,
          boardInvites: prev.boardInvites.filter((i) => i.token !== token),
        }));
        onClose();
        window.location.href = `/boards/${boardId}`;
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Không thể chấp nhận lời mời' });
    } finally {
      setProcessingToken(null);
    }
  };

  // Reject board invite
  const handleRejectBoard = (token: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Từ chối lời mời',
      message: 'Bạn có chắc chắn muốn từ chối lời mời vào Board này?',
      confirmText: 'Từ chối',
      variant: 'danger',
      onConfirm: async () => {
        setProcessingToken(token);
        try {
          const res = await apiClient<any>(`/boards/invites/${token}/reject`, {
            method: 'POST',
          });
          if (res.success) {
            setInvitations((prev) => ({
              ...prev,
              boardInvites: prev.boardInvites.filter((i) => i.token !== token),
            }));
            fetchInvitations();
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message || 'Không thể từ chối lời mời' });
        } finally {
          setProcessingToken(null);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2b1572]/25 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl glass-strong border border-white/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2b1572]/10 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2b1572] flex items-center justify-center text-[#a6d1fd] shadow-md shadow-[#2b1572]/20">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2b1572]">Cài đặt tài khoản & Hồ sơ</h2>
              <p className="text-xs text-[#2b1572]/70">Quản lý thông tin cá nhân, bảo mật và lời mời</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/60 text-[#2b1572]/60 hover:text-[#2b1572] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 border-b border-[#2b1572]/10 bg-white/20 gap-2">
          <button
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#2b1572] text-[#2b1572] bg-white/60 shadow-xs'
                : 'border-transparent text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/30'
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
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'security'
                ? 'border-[#2b1572] text-[#2b1572] bg-white/60 shadow-xs'
                : 'border-transparent text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/30'
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
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-b-2 relative ${
              activeTab === 'invitations'
                ? 'border-[#2b1572] text-[#2b1572] bg-white/60 shadow-xs'
                : 'border-transparent text-[#2b1572]/60 hover:text-[#2b1572] hover:bg-white/30'
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
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

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selector */}
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

                  <div className="flex-1 min-w-[200px] space-y-2">
                    <input
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="Dán link ảnh đại diện (URL)..."
                      className="w-full px-3 py-2 text-xs glass-input placeholder:text-[#2b1572]/30 text-[#2b1572]"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#2b1572]/60 font-medium">Gợi ý mẫu:</span>
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

              {/* Name & Email */}
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
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/30 text-[#2b1572]/60 cursor-not-allowed font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                      Đã xác thực
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-[#2b1572] mb-1.5">
                  Tiểu sử / Giới thiệu bản thân
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Chia sẻ đôi nét về vai trò, chuyên môn hoặc sở thích..."
                  className="w-full px-3.5 py-2.5 text-xs glass-input text-[#2b1572] placeholder:text-[#2b1572]/30 resize-none"
                />
              </div>

              {/* Phone, Timezone & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              {/* Submit */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu thông tin hồ sơ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Account Overview Box */}
              <div className="p-4 rounded-2xl bg-white/50 border border-white/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#2b1572]/70 font-semibold">Trạng thái tài khoản:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 font-bold text-[11px]">
                    ● Đang hoạt động (ACTIVE)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#2b1572]/70 font-semibold">Ngày đăng ký tham gia:</span>
                  <span className="text-[#2b1572] font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '2026'}
                  </span>
                </div>
              </div>

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2b1572] flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  <span>Đổi mật khẩu tài khoản</span>
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
                    placeholder="Nhập mật khẩu hiện tại..."
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

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-6 py-2.5 btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    {isChangingPass ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý...</span>
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
                    Lời mời đang chờ ({totalInvites})
                  </h3>
                  <p className="text-[11px] text-[#2b1572]/70">
                    Các lời mời tham gia Không gian làm việc và Bảng Kanban gửi tới email của bạn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchInvitations}
                  disabled={loadingInvites}
                  className="text-xs font-bold text-[#2b1572] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Làm mới
                </button>
              </div>

              {loadingInvites ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#2b1572]/60">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2b1572]" />
                  <span className="text-xs">Đang kiểm tra lời mời...</span>
                </div>
              ) : totalInvites === 0 ? (
                <div className="py-10 text-center rounded-2xl bg-white/30 border border-white/60 space-y-2">
                  <Mail className="w-8 h-8 text-[#2b1572]/40 mx-auto" />
                  <p className="text-xs font-bold text-[#2b1572]">Không có lời mời nào đang chờ</p>
                  <p className="text-[11px] text-[#2b1572]/60 max-w-xs mx-auto">
                    Khi đồng nghiệp mời bạn vào Không gian làm việc hoặc Bảng, lời mời sẽ xuất hiện ở đây.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Workspace Invites */}
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

                  {/* Board Invites */}
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

      {/* Glassmorphic Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
      />
    </div>
  );
}

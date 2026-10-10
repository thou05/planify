'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Bell,
  UserPlus,
  UserX,
  MessageSquare,
  AlarmClock,
  AtSign,
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
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'invitations' | 'notifications'>('profile');

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

  // Notification Preferences State
  const [notifPreferences, setNotifPreferences] = useState({
    invitations: true,
    removals: true,
    assignments: true,
    mentions: true,
    due_reminders: true,
    comments: true,
  });
  const [loadingNotifPrefs, setLoadingNotifPrefs] = useState(false);
  const [isSavingNotifPrefs, setIsSavingNotifPrefs] = useState(false);

  // Status message
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'notifications' || tabParam === 'security' || tabParam === 'invitations' || tabParam === 'profile') {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

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

  const fetchNotificationPreferences = async () => {
    setLoadingNotifPrefs(true);
    try {
      const res = await apiClient<any>('/users/notification-preferences');
      if (res.success && res.data) {
        setNotifPreferences((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch {
      // ignore
    } finally {
      setLoadingNotifPrefs(false);
    }
  };

  const handleSaveNotifPreferences = async () => {
    setIsSavingNotifPrefs(true);
    setStatusMessage(null);
    try {
      const res = await apiClient<any>('/users/notification-preferences', {
        method: 'PATCH',
        data: notifPreferences,
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Đã lưu cài đặt tùy chọn thông báo thành công!' });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Không thể lưu cài đặt thông báo' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Lỗi khi lưu cài đặt thông báo' });
    } finally {
      setIsSavingNotifPrefs(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
    fetchNotificationPreferences();
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
        <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-md bg-[#f28d8d] text-white border-none overflow-hidden flex items-center justify-center shrink-0 shadow-2xs relative">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#ffc0cb]/30 border border-[#f28d8d]/30 text-[11px] font-semibold text-[#d86969] mb-1.5">
              <UserIcon className="w-3 h-3 text-[#d86969]" />
              <span>Tài khoản cá nhân</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {user.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center sm:justify-start gap-2">
              <span>{user.email}</span>
              <span>•</span>
              <span className="px-1.5 py-0.2 rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                {user.status || 'ACTIVE'}
              </span>
            </p>
            {user.bio && (
              <p className="text-xs text-slate-600 mt-2 italic max-w-xl">
                &ldquo;{user.bio}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
          <button
            onClick={() => {
              setActiveTab('profile');
              setStatusMessage(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-[#f28d8d] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Thông tin cá nhân</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setStatusMessage(null);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-[#f28d8d] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Bảo mật & Mật khẩu</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('invitations');
              setStatusMessage(null);
              fetchInvitations();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'invitations'
                ? 'bg-[#f28d8d] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Lời mời</span>
            {totalInvites > 0 && (
              <span className="px-1.5 py-0.2 rounded-xs bg-rose-600 text-white text-[10px] font-bold leading-none">
                {totalInvites}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('notifications');
              setStatusMessage(null);
              fetchNotificationPreferences();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-[#f28d8d] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Cài đặt Thông báo</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-md border text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Tab Panels */}
        <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-2xs">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Ảnh đại diện (Avatar)
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-14 h-14 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-700">
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
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Chọn avatar mẫu:</span>
                      <div className="flex items-center gap-1.5">
                        {PRESET_AVATARS.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(url)}
                            className={`w-6 h-6 rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity ${
                              avatar === url ? 'border-[#f28d8d] ring-2 ring-[#f28d8d]' : 'border-slate-200'
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Họ và tên <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên của bạn"
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email tài khoản
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-normal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tiểu sử / Bio cá nhân
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Chia sẻ đôi nét về vai trò, chuyên môn hoặc mục tiêu làm việc..."
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Số điện thoại</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+84 987 654 321"
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Múi giờ</span>
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  >
                    <option value="Asia/Ho_Chi_Minh">GMT+7 (Hà Nội, TP.HCM)</option>
                    <option value="Asia/Bangkok">GMT+7 (Bangkok)</option>
                    <option value="Asia/Singapore">GMT+8 (Singapore)</option>
                    <option value="Asia/Tokyo">GMT+9 (Tokyo, Seoul)</option>
                    <option value="UTC">UTC (Giờ phối hợp quốc tế)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngôn ngữ</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  >
                    <option value="vi">Tiếng Việt (VI)</option>
                    <option value="en">English (EN)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu thông tin...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
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
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tình trạng tài khoản:</span>
                  <span className="px-2 py-0.5 rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                    ● Đang hoạt động (ACTIVE)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Thời gian khởi tạo:</span>
                  <span className="text-slate-700 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '2026'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>Thay đổi mật khẩu</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mật khẩu hiện tại <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng..."
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu mới <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isChangingPass ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang cập nhật mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Danh sách lời mời ({totalInvites})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chấp nhận hoặc từ chối các lời mời tham gia dự án được gửi tới email của bạn
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchInvitations}
                  disabled={loadingInvites}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Làm mới danh sách
                </button>
              </div>

              {loadingInvites ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                  <span className="text-xs">Đang kiểm tra lời mời...</span>
                </div>
              ) : totalInvites === 0 ? (
                <div className="py-12 text-center rounded-md border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
                  <Mail className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Không có lời mời nào đang chờ</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Bạn hiện chưa nhận được lời mời tham gia Không gian làm việc hoặc Bảng nào mới.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.workspaceInvites?.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {inv.workspace?.name || 'Không gian làm việc'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px]">
                              Workspace • {inv.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
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
                          className="px-3 py-1.5 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleAcceptWorkspace(inv.token, inv.workspace?.id)}
                          className="px-3.5 py-1.5 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
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
                      className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {inv.board?.name || 'Bảng công việc'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[10px]">
                              Board • {inv.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
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
                          className="px-3 py-1.5 rounded-md border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={processingToken === inv.token}
                          onClick={() => handleAcceptBoard(inv.token, inv.board?.id)}
                          className="px-3.5 py-1.5 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
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

          {/* TAB 4: NOTIFICATIONS PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cài đặt thông báo & Tùy chọn nhắc nhở</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tùy chỉnh các loại thông báo bạn muốn nhận trên hệ thống theo thời gian thực
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchNotificationPreferences}
                  disabled={loadingNotifPrefs}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Làm mới
                </button>
              </div>

              {loadingNotifPrefs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                  <span className="text-xs">Đang tải tùy chọn thông báo...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group 1: Lời mời & Thay đổi thành viên */}
                  <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Lời mời & Quản trị thành viên
                      </span>
                    </div>

                    {/* Toggle: Lời mời tham gia */}
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Lời mời tham gia Không gian / Bảng
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nhận thông báo khi bạn được mời vào một Không gian làm việc hoặc Bảng mới.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.invitations}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              invitations: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>

                    {/* Toggle: Bị xóa khỏi dự án */}
                    <div className="flex items-center justify-between gap-4 py-1 border-t border-slate-100 pt-2.5">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Thông báo xóa khỏi Không gian / Bảng
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nhận thông báo nếu bạn bị quản trị viên xóa khỏi dự án hoặc bảng.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.removals}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              removals: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Group 2: Thẻ & Nhiệm vụ */}
                  <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Thẻ & Phân công công việc
                      </span>
                    </div>

                    {/* Toggle: Phân công thẻ */}
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Phân công thẻ & Checklist
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nhận thông báo khi bạn được gán phụ trách thẻ hoặc mục việc cụ thể.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.assignments}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              assignments: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>

                    {/* Toggle: Nhắc tên @Mention */}
                    <div className="flex items-center justify-between gap-4 py-1 border-t border-slate-100 pt-2.5">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Nhắc tên (@Mention)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nhận thông báo khi có ai đó nhắc tên bạn (@tên) trong bình luận hoặc thẻ.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.mentions}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              mentions: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Group 3: Thời hạn & Thảo luận */}
                  <div className="p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <AlarmClock className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Thời hạn & Thảo luận
                      </span>
                    </div>

                    {/* Toggle: Hạn chót & Quá hạn */}
                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Nhắc nhở Hạn chót & Quá hạn
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tự động nhắc khi công việc sắp đến hạn hoặc bị quá hạn.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.due_reminders}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              due_reminders: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>

                    {/* Toggle: Bình luận */}
                    <div className="flex items-center justify-between gap-4 py-1 border-t border-slate-100 pt-2.5">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-900">
                          Bình luận mới trong thẻ
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Nhận thông báo khi có bình luận mới trong các thẻ bạn đang tham gia.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={notifPreferences.comments}
                          onChange={(e) =>
                            setNotifPreferences((prev) => ({
                              ...prev,
                              comments: e.target.checked,
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f28d8d]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSavingNotifPrefs}
                      onClick={handleSaveNotifPreferences}
                      className="px-4 py-2 rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {isSavingNotifPrefs ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang lưu cài đặt...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu tùy chọn thông báo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

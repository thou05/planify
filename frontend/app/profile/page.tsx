'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, User } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import ColorPicker from '@/components/ui/ColorPicker';
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
  Calendar,
  Bell,
  Camera,
  Upload,
  RotateCcw,
  Briefcase,
  Building2,
  MapPin,
  ExternalLink,
  Check,
  Image as ImageIcon,
  Sparkles,
  Layers,
  CheckCheck,
  LayoutGrid,
  UserPlus,
  AlarmClock,
  X,
} from 'lucide-react';

const GithubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
];

const PRESET_COVERS = [
  {
    id: 'grid-default',
    name: 'Technical Grid (Mặc định)',
    value: '',
    previewColor: '#f8fafc',
  },
  {
    id: 'solid-coral',
    name: 'Coral Rose (Solid)',
    value: 'solid:#f28d8d',
    previewColor: '#f28d8d',
  },
  {
    id: 'solid-pink',
    name: 'Soft Pink (Solid)',
    value: 'solid:#ffc0cb',
    previewColor: '#ffc0cb',
  },
  {
    id: 'solid-sky',
    name: 'Sky Blue (Solid)',
    value: 'solid:#87ceeb',
    previewColor: '#87ceeb',
  },
  {
    id: 'solid-slate',
    name: 'Midnight Slate (Solid)',
    value: 'solid:#0f172a',
    previewColor: '#0f172a',
  },
  {
    id: 'unsplash-arch',
    name: 'Kiến trúc hiện đại',
    value: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    previewColor: '#64748b',
  },
  {
    id: 'unsplash-desk',
    name: 'Bàn làm việc tối giản',
    value: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    previewColor: '#94a3b8',
  },
  {
    id: 'unsplash-mountains',
    name: 'Núi non hùng vĩ',
    value: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    previewColor: '#475569',
  },
  {
    id: 'unsplash-abstract',
    name: 'Hình khối kỹ thuật',
    value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    previewColor: '#334155',
  },
];

const WORK_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string; icon: string }
> = {
  WORKING: {
    label: 'Đang làm việc',
    color: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '🟢',
  },
  BUSY: {
    label: 'Đang tập trung / Bận',
    color: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '🟡',
  },
  AWAY: {
    label: 'Nghỉ phép / Đi vắng',
    color: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: '⚪',
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'invitations' | 'notifications'>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [workStatus, setWorkStatus] = useState<'WORKING' | 'BUSY' | 'AWAY'>('WORKING');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [language, setLanguage] = useState('vi');

  // Uploading state & Refs
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Modals for Avatar & Cover Image
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

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
      setCoverImage(user.cover_image || '');
      setJobTitle(user.job_title || '');
      setDepartment(user.department || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setGithub(user.social_links?.github || '');
      setLinkedin(user.social_links?.linkedin || '');
      setWorkStatus((user.work_status as any) || 'WORKING');
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

  // Helper lấy background style chuẩn DESIGN.md (Technical Grid hoặc Solid hoặc Image)
  const getCoverStyle = (coverVal: string): React.CSSProperties => {
    const trimmed = coverVal?.trim() || '';
    if (!trimmed) {
      return {
        backgroundColor: '#f8fafc',
        backgroundImage:
          'linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    }
    if (trimmed.startsWith('solid:')) {
      const color = trimmed.replace('solid:', '').trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(color) || /^(rgb|hsl)a?\([0-9,\s.%+-]+\)$/.test(color)) {
        return { backgroundColor: color };
      }
      return { backgroundColor: '#f8fafc' };
    }
    const isAllowedUrl =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:image/');
    if (!isAllowedUrl) {
      return { backgroundColor: '#f8fafc' };
    }
    const safeUrl = trimmed.replace(/["\\()\r\n]/g, (ch) => `\\${ch}`);
    return {
      backgroundImage: `url("${safeUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  };

  // Upload Avatar từ thiết bị
  const handleUploadAvatar = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Dung lượng ảnh đại diện không được vượt quá 5MB' });
      return;
    }

    const previousAvatar = avatar;
    setIsUploadingAvatar(true);
    setStatusMessage(null);

    const objectUrl = URL.createObjectURL(file);
    setAvatar(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ url: string }>('/users/upload-avatar', {
        method: 'POST',
        data: formData,
      });

      if (res.success && res.data?.url) {
        setAvatar(res.data.url);
        updateUser({ avatar: res.data.url });
        setStatusMessage({ type: 'success', text: 'Tải ảnh đại diện lên thành công!' });
      } else {
        setAvatar(previousAvatar);
        setStatusMessage({ type: 'error', text: res.message || 'Không thể tải ảnh đại diện lên' });
      }
    } catch (err: any) {
      setAvatar(previousAvatar);
      setStatusMessage({ type: 'error', text: err?.message || 'Lỗi khi tải ảnh đại diện lên máy chủ' });
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsUploadingAvatar(false);
    }
  };

  // Upload Cover Image từ thiết bị
  const handleUploadCover = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Dung lượng ảnh bìa không được vượt quá 15MB' });
      return;
    }

    const previousCover = coverImage;
    setIsUploadingCover(true);
    setStatusMessage(null);

    const objectUrl = URL.createObjectURL(file);
    setCoverImage(objectUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ url: string }>('/users/upload-cover', {
        method: 'POST',
        data: formData,
      });

      if (res.success && res.data?.url) {
        setCoverImage(res.data.url);
        updateUser({ cover_image: res.data.url });
        setStatusMessage({ type: 'success', text: 'Tải ảnh bìa lên thành công!' });
      } else {
        setCoverImage(previousCover);
        setStatusMessage({ type: 'error', text: res.message || 'Không thể tải ảnh bìa lên' });
      }
    } catch (err: any) {
      setCoverImage(previousCover);
      setStatusMessage({ type: 'error', text: err?.message || 'Lỗi khi tải ảnh bìa lên máy chủ' });
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsUploadingCover(false);
    }
  };

  // Quick remove cover
  const handleQuickRemoveCover = async () => {
    const previousCover = coverImage;
    setCoverImage('');
    setStatusMessage(null);
    try {
      const res = await apiClient<User>('/users/profile', {
        method: 'PATCH',
        data: { cover_image: null },
      });
      if (res.success && res.data) {
        updateUser(res.data);
        setStatusMessage({ type: 'success', text: 'Đã gỡ ảnh bìa và khôi phục nền mặc định!' });
      } else {
        setCoverImage(previousCover);
        setStatusMessage({ type: 'error', text: res.message || 'Không thể gỡ ảnh bìa' });
      }
    } catch (err: any) {
      setCoverImage(previousCover);
      setStatusMessage({ type: 'error', text: err?.message || 'Không thể gỡ ảnh bìa' });
    }
  };

  // Apply button in Avatar Modal
  const handleApplyAvatarModal = async () => {
    if (isUploadingAvatar) return;
    if (!avatar.startsWith('blob:')) {
      try {
        const res = await apiClient<User>('/users/profile', {
          method: 'PATCH',
          data: { avatar: avatar.trim() || null },
        });
        if (res.success && res.data) {
          updateUser(res.data);
          setStatusMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        } else {
          setStatusMessage({ type: 'error', text: res.message || 'Không thể lưu ảnh đại diện' });
          return;
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Lỗi khi lưu ảnh đại diện' });
        return;
      }
    }
    setIsAvatarModalOpen(false);
  };

  // Apply button in Cover Modal
  const handleApplyCoverModal = async () => {
    if (isUploadingCover) return;
    if (!coverImage.startsWith('blob:')) {
      try {
        const res = await apiClient<User>('/users/profile', {
          method: 'PATCH',
          data: { cover_image: coverImage.trim() || null },
        });
        if (res.success && res.data) {
          updateUser(res.data);
          setStatusMessage({ type: 'success', text: 'Cập nhật ảnh bìa thành công!' });
        } else {
          setStatusMessage({ type: 'error', text: res.message || 'Không thể lưu ảnh bìa' });
          return;
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Lỗi khi lưu ảnh bìa' });
        return;
      }
    }
    setIsCoverModalOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Tên người dùng không được để trống' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        name: name.trim(),
        avatar: avatar.trim() || null,
        cover_image: coverImage.trim() || null,
        job_title: jobTitle.trim() || null,
        department: department.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        social_links: {
          github: github.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
        },
        work_status: workStatus,
        bio: bio.trim(),
        phone: phone.trim(),
        timezone,
        language,
      };

      const res = await apiClient<User>('/users/profile', {
        method: 'PATCH',
        data: payload,
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
        {/* Profile Hero Card with Cover Banner */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          {/* Cover Banner */}
          <div
            className="w-full h-40 sm:h-48 relative transition-all"
            style={getCoverStyle(coverImage)}
          >
            {/* Hidden Cover & Avatar File Inputs */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadCover(file);
              }}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadAvatar(file);
              }}
            />

            {/* Quick Action Buttons on Cover */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                id="open-cover-modal-btn"
                disabled={isUploadingCover}
                onClick={() => setIsCoverModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-white/95 hover:bg-white text-slate-700 border border-slate-200 rounded-md shadow-2xs backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Tùy biến ảnh bìa hồ sơ"
              >
                {isUploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d86969]" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{isUploadingCover ? 'Đang tải...' : 'Đổi ảnh bìa'}</span>
              </button>

              {coverImage && (
                <button
                  type="button"
                  onClick={handleQuickRemoveCover}
                  className="p-1 text-xs bg-white/95 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 rounded-md backdrop-blur-xs cursor-pointer transition-colors"
                  title="Gỡ ảnh bìa (Quay lại nền lưới kỹ thuật mặc định)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Hero Content Area */}
          <div className="px-6 pb-6 pt-0 relative">
            {/* Top Row: Floating Avatar & Quick Action */}
            <div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-4">
              {/* Avatar Floating with Status Dot & Quick Change */}
              <div
                className="relative group/avatar shrink-0 cursor-pointer"
                onClick={() => setIsAvatarModalOpen(true)}
                title="Bấm để đổi ảnh đại diện"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-md bg-[#f28d8d] text-white border-4 border-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center relative bg-white shadow-sm">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt={name || user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white bg-[#f28d8d] w-full h-full flex items-center justify-center">
                      {(name || user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Hover Camera overlay */}
                  <button
                    type="button"
                    id="open-avatar-modal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAvatarModalOpen(true);
                    }}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 bg-slate-900/40 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold"
                    title="Đổi ảnh đại diện"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Đổi avatar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Indicator Dot */}
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-2xs"
                  title={WORK_STATUS_CONFIG[workStatus]?.label || 'Trạng thái'}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${
                      WORK_STATUS_CONFIG[workStatus]?.color || 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Header Action Button */}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs bg-white"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Đổi avatar</span>
              </button>
            </div>

            {/* User Details - Completely on the crisp white background */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {name || user.name}
                </h1>

                {/* Work Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                    WORK_STATUS_CONFIG[workStatus]?.badgeClass || 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span className="text-[11px]">{WORK_STATUS_CONFIG[workStatus]?.icon}</span>
                  <span>{WORK_STATUS_CONFIG[workStatus]?.label}</span>
                </div>

                {/* Account Status */}
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[10px] tracking-wide uppercase">
                  {user.status || 'ACTIVE'}
                </span>
              </div>

              {/* Role / Department & Email */}
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 pt-0.5">
                {jobTitle && (
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{jobTitle}</span>
                  </span>
                )}
                {jobTitle && department && <span className="text-slate-300">•</span>}
                {department && (
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{department}</span>
                  </span>
                )}
                {(jobTitle || department) && <span className="text-slate-300">•</span>}
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email}</span>
                </span>
              </div>

              {/* Bio */}
              {bio && (
                <p className="text-xs text-slate-600 italic max-w-2xl pt-1 leading-relaxed">
                  &ldquo;{bio}&rdquo;
                </p>
              )}

              {/* Chips Row: Location, Website, Social Links */}
              {(location || website || github || linkedin) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  {location && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                      <MapPin className="w-3 h-3 text-[#f28d8d]" />
                      <span>{location}</span>
                    </span>
                  )}
                  {website && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-[#d86969] hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    >
                      <Globe className="w-3 h-3 text-[#f28d8d]" />
                      <span className="truncate max-w-[160px]">{website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  )}
                  {github && (
                    <a
                      href={github.startsWith('http') ? github : `https://github.com/${github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <GithubIcon className="w-3 h-3" />
                      <span>{github.replace(/^https?:\/\/github\.com\//, '')}</span>
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium text-sky-700 hover:bg-sky-50 hover:border-sky-200 transition-colors"
                    >
                      <LinkedinIcon className="w-3 h-3" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              )}
            </div>
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
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* SECTION 1: THÔNG TIN CƠ BẢN & VỊ TRÍ */}
              <div className="space-y-4 pb-6 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Thông tin cơ bản & Vị trí công việc</span>
                </h3>

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chức danh / Vị trí (Job Title)</span>
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ví dụ: Lead Product Designer, Senior Engineer..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phòng ban / Đội ngũ (Department)</span>
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Ví dụ: Product Engineering, Design Systems..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: TRẠNG THÁI LÀM VIỆC & TIỂU SỬ */}
              <div className="space-y-4 pb-6 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Trạng thái làm việc & Tiểu sử</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Trạng thái làm việc hiện tại
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['WORKING', 'BUSY', 'AWAY'] as const).map((statusKey) => {
                      const cfg = WORK_STATUS_CONFIG[statusKey];
                      const isSelected = workStatus === statusKey;
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => setWorkStatus(statusKey)}
                          className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-[#f28d8d] bg-[#ffc0cb]/15 ring-1 ring-[#f28d8d]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{cfg.icon}</span>
                            <span className="text-xs font-semibold text-slate-800">
                              {cfg.label}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#d86969]" />}
                        </button>
                      );
                    })}
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
              </div>

              {/* SECTION 4: THÔNG TIN LIÊN HỆ & MẠNG XÃ HỘI */}
              <div className="space-y-4 pb-6 border-b border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Liên hệ & Mạng xã hội</span>
                </h3>

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
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Địa điểm làm việc</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ví dụ: Hà Nội, Việt Nam / Remote"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Website / Portfolio</span>
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://myportfolio.dev"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <GithubIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>GitHub (Username hoặc Link)</span>
                    </label>
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="octocat hoặc https://github.com/..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <LinkedinIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>LinkedIn Profile</span>
                    </label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="in/username hoặc https://linkedin.com/in/..."
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: THIẾT LẬP VÙNG (REGIONAL) */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Ngôn ngữ & Vùng miền</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Múi giờ làm việc</span>
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
                      <span>Ngôn ngữ giao diện</span>
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
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  id="save-profile-btn"
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

      {/* POPUP MODAL: ĐỔI ẢNH ĐẠI DIỆN (AVATAR) */}
      {isAvatarModalOpen && (
        <div
          className="fixed inset-0 z-70 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[#ffc0cb]/30 border border-[#f28d8d]/30 text-[#d86969] flex items-center justify-center">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Đổi ảnh đại diện (Avatar)</h3>
                  <p className="text-[11px] text-slate-500">Tải ảnh từ máy tính hoặc chọn avatar mẫu có sẵn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Avatar Preview */}
              <div className="flex items-center gap-4 p-3.5 rounded-md border border-slate-200 bg-slate-50/50">
                <div className="w-16 h-16 rounded-md bg-[#f28d8d] text-white border-2 border-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white bg-[#f28d8d] w-full h-full flex items-center justify-center">
                      {(name || user.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{name || user.name}</div>
                  <div className="text-[11px] text-slate-500">Xem trước diện mạo avatar của bạn trên Planify</div>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer pt-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Gỡ ảnh (Dùng chữ cái đầu)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload from Device */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Tải ảnh từ thiết bị</span>
                </label>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-2"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#d86969]" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{isUploadingAvatar ? 'Đang tải lên...' : 'Chọn tệp hình ảnh (PNG, JPG, WEBP - Tối đa 5MB)'}</span>
                </button>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Hoặc dán URL hình ảnh</span>
                </label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                />
              </div>

              {/* Preset Avatars */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Chọn nhanh avatar mẫu</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_AVATARS.map((url, idx) => {
                    const isSelected = avatar === url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatar(url)}
                        className={`w-10 h-10 rounded-md overflow-hidden border cursor-pointer hover:scale-105 transition-all relative ${
                          isSelected ? 'border-[#f28d8d] ring-2 ring-[#f28d8d]' : 'border-slate-300'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#f28d8d]/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleApplyAvatarModal}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white cursor-pointer transition-colors shadow-2xs"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: ĐỔI ẢNH BÌA (COVER BANNER) */}
      {isCoverModalOpen && (
        <div
          className="fixed inset-0 z-70 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCoverModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[#ffc0cb]/30 border border-[#f28d8d]/30 text-[#d86969] flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Đổi ảnh bìa hồ sơ (Cover Banner)</h3>
                  <p className="text-[11px] text-slate-500">Tùy biến hình nền kỹ thuật, màu phẳng hoặc ảnh Unsplash</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Cover Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Xem trước ảnh bìa</span>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại mặc định</span>
                    </button>
                  )}
                </div>
                <div
                  className="w-full h-24 rounded-md border border-slate-300 overflow-hidden relative shadow-2xs"
                  style={getCoverStyle(coverImage)}
                >
                  {!coverImage && (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-600 bg-white/70">
                      Nền lưới kỹ thuật mặc định (Design System)
                    </div>
                  )}
                </div>
              </div>

              {/* Upload from Device */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Tải ảnh từ thiết bị</span>
                </label>
                <button
                  type="button"
                  disabled={isUploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs flex items-center justify-center gap-2"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#d86969]" />
                  ) : (
                    <Upload className="w-4 h-4 text-slate-500" />
                  )}
                  <span>{isUploadingCover ? 'Đang tải lên...' : 'Chọn tệp ảnh bìa (Tối đa 15MB)'}</span>
                </button>
              </div>

              {/* Direct URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Hoặc dán URL ảnh bìa tùy chỉnh</span>
                </label>
                <input
                  type="url"
                  value={coverImage.startsWith('solid:') ? '' : coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#87ceeb] focus:ring-1 focus:ring-[#87ceeb]/40"
                />
              </div>

              {/* Presets List */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#f28d8d]" />
                  <span>Mẫu ảnh bìa có sẵn (Lưới / Màu phẳng / Unsplash)</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {PRESET_COVERS.map((preset) => {
                    const isSelected = coverImage === preset.value;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCoverImage(preset.value)}
                        className={`h-14 rounded-md border cursor-pointer hover:opacity-90 transition-all overflow-hidden relative flex flex-col justify-end p-1.5 text-left ${
                          isSelected ? 'border-[#f28d8d] ring-2 ring-[#f28d8d]' : 'border-slate-300'
                        }`}
                        style={{
                          backgroundColor: preset.previewColor,
                          backgroundImage: preset.value.startsWith('http') ? `url("${preset.value}")` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <span className="text-[10px] font-bold text-white bg-slate-900/60 px-1 py-0.2 rounded-xs truncate">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#f28d8d] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Solid Color Picker */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <ColorPicker
                  value={coverImage.startsWith('solid:') ? coverImage.replace('solid:', '') : '#f28d8d'}
                  onChange={(hex) => setCoverImage(`solid:${hex}`)}
                  label="Tự chọn màu phẳng cá nhân (Custom Solid Color)"
                  previewText="Ảnh bìa cá nhân"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCoverModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleApplyCoverModal}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#f28d8d] hover:bg-[#e57a7a] text-white cursor-pointer transition-colors shadow-2xs"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

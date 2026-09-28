'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import TopBar from './TopBar';
import Sidebar, { WorkspaceItem } from './Sidebar';
import CreateWorkspaceModal from '../modals/CreateWorkspaceModal';
import CreateBoardModal from '../modals/CreateBoardModal';
import ImportBoardModal from '../modals/ImportBoardModal';

interface AppShellProps {
  children: React.ReactNode;
  activeWorkspaceId?: string;
  onWorkspaceChange?: (id: string) => void;
  onRefresh?: () => void;
}

export default function AppShell({
  children,
  activeWorkspaceId,
  onWorkspaceChange,
  onRefresh,
}: AppShellProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>(activeWorkspaceId);
  const [importTargetWsId, setImportTargetWsId] = useState<string | undefined>(undefined);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isImportBoardOpen, setIsImportBoardOpen] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await apiClient<WorkspaceItem[]>('/workspaces');
      if (res.success && res.data) {
        setWorkspaces(res.data);
        if (!selectedWorkspaceId && res.data.length > 0) {
          setSelectedWorkspaceId(res.data[0].id);
        }
      }
    } catch {
      // If error or offline, fallback to empty
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchWorkspaces();
    }

    if (!user?.id) return;
    const channel = supabase.channel(`shell-user:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'USER_WORKSPACES_CHANGED' }, () => {
        fetchWorkspaces();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isLoading]);

  useEffect(() => {
    if (activeWorkspaceId) {
      setSelectedWorkspaceId(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    onWorkspaceChange?.(id);
  };

  const handleWorkspaceCreated = (newWs: WorkspaceItem) => {
    setWorkspaces((prev) => [newWs, ...prev]);
    setSelectedWorkspaceId(newWs.id);
    onRefresh?.();
  };

  const handleBoardCreated = () => {
    fetchWorkspaces();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-[#2b1572]/20 border-t-[#2b1572] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      {/* TopBar */}
      <TopBar
        onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
        onOpenCreateBoard={() => setIsCreateBoardOpen(true)}
      />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          workspaces={workspaces}
          currentWorkspaceId={selectedWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
          onOpenCreateBoard={() => setIsCreateBoardOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
        onCreated={handleWorkspaceCreated}
      />

      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        workspaceId={selectedWorkspaceId}
        workspaces={workspaces}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreated={handleBoardCreated}
        onOpenImport={(wsId) => {
          setImportTargetWsId(wsId || selectedWorkspaceId);
          setIsImportBoardOpen(true);
        }}
      />

      {isImportBoardOpen && (importTargetWsId || selectedWorkspaceId) && (
        <ImportBoardModal
          isOpen={isImportBoardOpen}
          workspaceId={importTargetWsId || selectedWorkspaceId || ''}
          onClose={() => setIsImportBoardOpen(false)}
          onSuccess={(newBoardId) => {
            fetchWorkspaces();
            onRefresh?.();
            if (newBoardId) {
              router.push(`/boards/${newBoardId}`);
            }
          }}
        />
      )}
    </div>
  );
}

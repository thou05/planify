'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import TopBar from './TopBar';
import Sidebar, { WorkspaceItem } from './Sidebar';
import CreateWorkspaceModal from '../modals/CreateWorkspaceModal';
import CreateBoardModal from '../modals/CreateBoardModal';
import ImportBoardModal from '../modals/ImportBoardModal';
import { ShellContext, ShellContextType } from './ShellContext';

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
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  // Extract route params from pathname if available
  const urlWsId = pathname?.startsWith('/workspaces/')
    ? pathname.split('/')[2]?.split('?')[0]
    : undefined;
  const urlBoardId = pathname?.startsWith('/boards/')
    ? pathname.split('/')[2]?.split('?')[0]
    : undefined;

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>(() => {
    if (activeWorkspaceId) return activeWorkspaceId;
    if (urlWsId) return urlWsId;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planify_active_workspace_id');
      if (saved) return saved;
    }
    return undefined;
  });

  const [importTargetWsId, setImportTargetWsId] = useState<string | undefined>(undefined);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isImportBoardOpen, setIsImportBoardOpen] = useState(false);

  // Subscribed refresh handlers from child pages
  const refreshHandlersRef = useRef<Set<() => void>>(new Set());

  const registerRefreshHandler = useCallback((handler: () => void) => {
    refreshHandlersRef.current.add(handler);
    return () => {
      refreshHandlersRef.current.delete(handler);
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    refreshHandlersRef.current.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error invoking shell refresh handler:', err);
      }
    });
    onRefresh?.();
  }, [onRefresh]);

  // Helper to resolve the best workspace ID based on context
  const resolveWorkspaceId = useCallback(
    (
      wsList: WorkspaceItem[],
      explicitId?: string,
      currentId?: string
    ): string | undefined => {
      if (!wsList || wsList.length === 0) return undefined;

      // 1. Explicit prop from active page (e.g. board.workspace_id or workspace page)
      if (explicitId && wsList.some((w) => w.id === explicitId)) {
        return explicitId;
      }

      // 2. Direct match from URL /workspaces/[workspaceId]
      if (urlWsId && wsList.some((w) => w.id === urlWsId)) {
        return urlWsId;
      }

      // 3. Match from URL /boards/[boardId] (find workspace that contains this board)
      if (urlBoardId) {
        const wsWithBoard = wsList.find((w) =>
          (w.boards || []).some((b) => b.id === urlBoardId)
        );
        if (wsWithBoard) {
          return wsWithBoard.id;
        }
      }

      // 4. Current state if still valid in workspace list
      if (currentId && wsList.some((w) => w.id === currentId)) {
        return currentId;
      }

      // 5. Persisted active workspace from localStorage
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('planify_active_workspace_id');
        if (saved && wsList.some((w) => w.id === saved)) {
          return saved;
        }
      }

      // 6. Fallback to first workspace in list
      return wsList[0]?.id;
    },
    [urlWsId, urlBoardId]
  );

  const fetchWorkspaces = async () => {
    try {
      const res = await apiClient<WorkspaceItem[]>('/workspaces');
      if (res.success && res.data) {
        setWorkspaces(res.data);
        const bestId = resolveWorkspaceId(res.data, activeWorkspaceId, selectedWorkspaceId);
        if (bestId) {
          setSelectedWorkspaceId(bestId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('planify_active_workspace_id', bestId);
          }
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
    if (workspaces.length > 0) {
      const bestId = resolveWorkspaceId(workspaces, activeWorkspaceId, selectedWorkspaceId);
      if (bestId && bestId !== selectedWorkspaceId) {
        setSelectedWorkspaceId(bestId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('planify_active_workspace_id', bestId);
        }
      }
    }
  }, [activeWorkspaceId, urlBoardId, urlWsId, workspaces, resolveWorkspaceId]);

  const handleSelectWorkspace = (id: string) => {
    setSelectedWorkspaceId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('planify_active_workspace_id', id);
    }
    onWorkspaceChange?.(id);

    // If currently on a workspace detail page, navigate to the selected workspace
    if (pathname?.startsWith('/workspaces/')) {
      router.push(`/workspaces/${id}`);
    }
  };

  const handleWorkspaceCreated = (newWs: WorkspaceItem) => {
    setWorkspaces((prev) => [newWs, ...prev]);
    setSelectedWorkspaceId(newWs.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('planify_active_workspace_id', newWs.id);
    }
    triggerRefresh();
  };

  const handleBoardCreated = () => {
    fetchWorkspaces();
    triggerRefresh();
  };

  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) || workspaces[0];

  const shellContextValue: ShellContextType = {
    workspaces,
    currentWorkspaceId: selectedWorkspaceId,
    currentWorkspace,
    setCurrentWorkspaceId: handleSelectWorkspace,
    refreshWorkspaces: fetchWorkspaces,
    registerRefreshHandler,
    openCreateWorkspace: () => setIsCreateWsOpen(true),
    openCreateBoard: (wsId) => {
      if (wsId) setSelectedWorkspaceId(wsId);
      setIsCreateBoardOpen(true);
    },
    openImportBoard: (wsId) => {
      setImportTargetWsId(wsId || selectedWorkspaceId);
      setIsImportBoardOpen(true);
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  const isBoardRoute = pathname?.startsWith('/boards/');

  return (
    <ShellContext.Provider value={shellContextValue}>
      <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
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
          <main
            className={`flex-1 min-h-0 relative ${
              isBoardRoute
                ? 'overflow-hidden flex flex-col p-0'
                : 'overflow-y-auto p-6'
            }`}
          >
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
              triggerRefresh();
              if (newBoardId) {
                router.push(`/boards/${newBoardId}`);
              }
            }}
          />
        )}
      </div>
    </ShellContext.Provider>
  );
}

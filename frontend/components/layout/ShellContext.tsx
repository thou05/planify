'use client';

import React, { createContext, useContext } from 'react';
import { WorkspaceItem } from './Sidebar';

export interface ShellContextType {
  workspaces: WorkspaceItem[];
  currentWorkspaceId?: string;
  currentWorkspace?: WorkspaceItem;
  setCurrentWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  registerRefreshHandler: (handler: () => void) => () => void;
  openCreateWorkspace: () => void;
  openCreateBoard: (workspaceId?: string) => void;
  openImportBoard: (workspaceId?: string) => void;
}

export const ShellContext = createContext<ShellContextType | null>(null);

export const useShell = () => useContext(ShellContext);

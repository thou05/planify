export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
export type BoardRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'MEMBER';

export interface WorkspacePermissionContext {
  role?: WorkspaceRole | null;
  isOwner?: boolean;
}

export interface BoardPermissionContext {
  boardRole?: BoardRole | null;
  workspaceRole?: WorkspaceRole | null;
  isWorkspaceOwner?: boolean;
  isWorkspaceAdmin?: boolean;
  canEdit?: boolean;
  canManageMembers?: boolean;
  canInviteMembers?: boolean;
  canDelete?: boolean;
  canChangeVisibility?: boolean;
  isArchived?: boolean;
}

// Workspace Permissions
export function canManageWorkspace(ctx?: WorkspacePermissionContext | null): boolean {
  if (!ctx) return false;
  return ctx.isOwner === true || ctx.role === 'OWNER' || ctx.role === 'ADMIN';
}

export function canCreateBoard(ctx?: WorkspacePermissionContext | null): boolean {
  if (!ctx) return false;
  return ctx.isOwner === true || ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MEMBER';
}

export function isWorkspaceGuest(ctx?: WorkspacePermissionContext | null): boolean {
  if (!ctx) return false;
  return ctx.role === 'GUEST' && !ctx.isOwner;
}

export function canManageWorkspaceMembers(ctx?: WorkspacePermissionContext | null): boolean {
  if (!ctx) return false;
  return ctx.isOwner === true || ctx.role === 'OWNER' || ctx.role === 'ADMIN';
}

// Board Permissions
export function canManageBoard(ctx?: BoardPermissionContext | null): boolean {
  if (!ctx) return false;
  if (ctx.canDelete !== undefined) return ctx.canDelete;
  return ctx.isWorkspaceOwner === true || ctx.isWorkspaceAdmin === true || ctx.workspaceRole === 'ADMIN' || ctx.boardRole === 'ADMIN';
}

export function canEditBoardContent(ctx?: BoardPermissionContext | null): boolean {
  if (!ctx) return false;
  if (ctx.canEdit !== undefined) return ctx.canEdit;
  return (
    ctx.isWorkspaceOwner === true ||
    ctx.isWorkspaceAdmin === true ||
    ctx.workspaceRole === 'ADMIN' ||
    ctx.boardRole === 'ADMIN' ||
    ctx.boardRole === 'EDITOR' ||
    ctx.boardRole === 'MEMBER'
  );
}

export function canInviteBoardMember(ctx?: BoardPermissionContext | null): boolean {
  if (!ctx) return false;
  if (ctx.canInviteMembers !== undefined) return ctx.canInviteMembers;
  return (
    ctx.isWorkspaceOwner === true ||
    ctx.isWorkspaceAdmin === true ||
    ctx.workspaceRole === 'ADMIN' ||
    ctx.boardRole === 'ADMIN' ||
    ctx.boardRole === 'EDITOR' ||
    ctx.boardRole === 'MEMBER'
  );
}

export function canManageBoardMembers(ctx?: BoardPermissionContext | null): boolean {
  if (!ctx) return false;
  if (ctx.canManageMembers !== undefined) return ctx.canManageMembers;
  return ctx.isWorkspaceOwner === true || ctx.isWorkspaceAdmin === true || ctx.workspaceRole === 'ADMIN' || ctx.boardRole === 'ADMIN';
}

export function canAssignCard(ctx?: BoardPermissionContext | null): boolean {
  return canEditBoardContent(ctx);
}

export function canComment(ctx?: BoardPermissionContext | null): boolean {
  if (!ctx) return false;
  if (ctx.isArchived) return false;
  return true;
}

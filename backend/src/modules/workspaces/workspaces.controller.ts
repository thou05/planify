import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Workspace mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách Workspace của người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách Workspace' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.workspacesService.findAllForUser(userId);
  }

  // --- PUBLIC/TOKEN INVITE ROUTES (đặt trước :id để không bị override) ---
  @Get('invites/:token')
  @Public()
  @ApiOperation({ summary: 'Xem trước thông tin lời mời qua Token' })
  @ApiResponse({ status: 200, description: 'Thông tin lời mời' })
  async getInviteByToken(@Param('token') token: string) {
    return this.workspacesService.getInviteByToken(token);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Chấp nhận lời mời tham gia Workspace' })
  @ApiResponse({ status: 200, description: 'Gia nhập Workspace thành công' })
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.acceptInvite(token, userId);
  }

  @Post('invites/:token/reject')
  @ApiOperation({ summary: 'Từ chối lời mời tham gia Workspace' })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  async rejectInvite(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.rejectInvite(token, userId);
  }

  // --- WORKSPACE DETAIL & CRUD ---
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết Workspace kèm Boards và Members' })
  @ApiResponse({ status: 200, description: 'Chi tiết Workspace' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tên hoặc mô tả Workspace' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa Workspace (chỉ Owner)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.delete(id, userId);
  }

  // --- LEAVE & TRANSFER OWNERSHIP ---
  @Post(':id/leave')
  @ApiOperation({ summary: 'Rời khỏi Workspace' })
  @ApiResponse({ status: 200, description: 'Rời thành công' })
  async leave(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.leaveWorkspace(id, userId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Chuyển giao quyền Chủ sở hữu (Owner) cho thành viên khác' })
  @ApiResponse({ status: 200, description: 'Chuyển quyền thành công' })
  async transferOwnership(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.workspacesService.transferOwnership(id, userId, dto);
  }

  // --- MEMBERS MANAGEMENT ---
  @Post(':id/members')
  @ApiOperation({ summary: 'Thêm thành viên trực tiếp vào Workspace' })
  @ApiResponse({ status: 201, description: 'Thêm thành viên thành công' })
  async addMember(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(workspaceId, userId, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Thay đổi vai trò của thành viên (ADMIN | MEMBER)' })
  @ApiResponse({ status: 200, description: 'Thay đổi vai trò thành công' })
  async updateMemberRole(
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(workspaceId, currentUserId, targetUserId, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Xóa thành viên khỏi Workspace' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async removeMember(
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.workspacesService.removeMember(workspaceId, currentUserId, targetUserId);
  }

  // --- GUESTS MANAGEMENT ---
  @Delete(':id/guests/:guestUserId')
  @ApiOperation({ summary: 'Xóa khách khỏi toàn bộ các Bảng trong Workspace' })
  @ApiResponse({ status: 200, description: 'Xóa khách thành công' })
  async removeGuest(
    @Param('id') workspaceId: string,
    @Param('guestUserId') guestUserId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.workspacesService.removeGuestFromWorkspace(workspaceId, currentUserId, guestUserId);
  }

  @Post(':id/guests/:guestUserId/convert')
  @ApiOperation({ summary: 'Chuyển đổi khách thành thành viên chính thức của Workspace' })
  @ApiResponse({ status: 200, description: 'Chuyển đổi thành công' })
  async convertGuestToMember(
    @Param('id') workspaceId: string,
    @Param('guestUserId') guestUserId: string,
    @CurrentUser('id') currentUserId: string,
    @Body('role') role?: string,
  ) {
    return this.workspacesService.convertGuestToMember(workspaceId, currentUserId, guestUserId, role as any);
  }

  // --- INVITATIONS ---
  @Post(':id/invites')
  @ApiOperation({ summary: 'Mời thành viên qua email (tạo liên kết mời)' })
  @ApiResponse({ status: 201, description: 'Tạo lời mời thành công' })
  async createInvite(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.createInvite(workspaceId, userId, dto);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'Danh sách các lời mời đang chờ của Workspace' })
  @ApiResponse({ status: 200, description: 'Danh sách lời mời' })
  async getPendingInvites(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.getPendingInvites(workspaceId, userId);
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Thu hồi / Xóa lời mời' })
  @ApiResponse({ status: 200, description: 'Thu hồi thành công' })
  async revokeInvite(
    @Param('id') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspacesService.revokeInvite(workspaceId, userId, inviteId);
  }
}

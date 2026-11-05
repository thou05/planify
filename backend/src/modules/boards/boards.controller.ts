import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CopyBoardDto } from './dto/copy-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { UpdateBoardMemberRoleDto } from './dto/update-board-member-role.dto';
import { InviteBoardMemberDto } from './dto/invite-board-member.dto';
import { RequestEditorDto } from './dto/request-editor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Boards')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // --- PUBLIC/TOKEN BOARD INVITE ROUTES (đặt trước :id để không bị override) ---
  @Get('boards/invites/:token')
  @Public()
  @ApiOperation({ summary: 'Xem trước thông tin lời mời tham gia Board qua Token' })
  @ApiResponse({ status: 200, description: 'Thông tin lời mời Board' })
  async getBoardInviteByToken(@Param('token') token: string) {
    return this.boardsService.getBoardInviteByToken(token);
  }

  @Post('boards/invites/:token/accept')
  @ApiOperation({ summary: 'Chấp nhận lời mời tham gia Board' })
  @ApiResponse({ status: 200, description: 'Gia nhập Board thành công' })
  async acceptBoardInvite(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.acceptBoardInvite(token, userId);
  }

  @Post('boards/invites/:token/reject')
  @ApiOperation({ summary: 'Từ chối lời mời tham gia Board' })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  async rejectBoardInvite(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.rejectBoardInvite(token, userId);
  }

  // --- WORKSPACE BOARDS ---
  @Post('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'Tạo Board mới trong Workspace' })
  @ApiResponse({ status: 201, description: 'Tạo Board thành công' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardsService.create(workspaceId, userId, dto);
  }

  @Get('workspaces/:workspaceId/boards')
  @ApiOperation({ summary: 'Lấy danh sách Boards đang hoạt động trong Workspace' })
  @ApiResponse({ status: 200, description: 'Danh sách Boards' })
  async findAllInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findAllInWorkspace(workspaceId, userId, false);
  }

  @Get('workspaces/:workspaceId/boards/archived')
  @ApiOperation({ summary: 'Lấy danh sách Boards đã lưu trữ trong Workspace' })
  @ApiResponse({ status: 200, description: 'Danh sách Boards lưu trữ' })
  async findArchivedInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findArchivedInWorkspace(workspaceId, userId);
  }

  @Get('boards/:id')
  @ApiOperation({ summary: 'Chi tiết Board kèm Lists, Cards, Labels và Members' })
  @ApiResponse({ status: 200, description: 'Chi tiết Board' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.findById(id, userId);
  }

  @Patch('boards/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin Board (Tên, mô tả, visibility, background, icon)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, userId, dto);
  }

  @Post('boards/:id/upload-background')
  @ApiOperation({ summary: 'Tải ảnh nền cho Board từ thiết bị' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.uploadBackground(id, file, userId);
  }

  @Post('boards/:id/upload-icon')
  @ApiOperation({ summary: 'Tải biểu tượng Favicon cho Board từ thiết bị' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadIcon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.uploadIcon(id, file, userId);
  }

  @Post('boards/:id/favorite')
  @ApiOperation({ summary: 'Bật / tắt gắn sao yêu thích Board' })
  @ApiResponse({ status: 200, description: 'Thao tác thành công' })
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.toggleFavorite(id, userId);
  }

  @Post('boards/:id/archive')
  @ApiOperation({ summary: 'Lưu trữ Board (Archived)' })
  @ApiResponse({ status: 200, description: 'Lưu trữ thành công' })
  async archive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.archiveBoard(id, userId);
  }

  @Post('boards/:id/restore')
  @ApiOperation({ summary: 'Khôi phục Board đã lưu trữ' })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  async restore(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.restoreBoard(id, userId);
  }

  @Post('boards/:id/copy')
  @ApiOperation({ summary: 'Nhân bản Board (Copy Board)' })
  @ApiResponse({ status: 201, description: 'Nhân bản thành công' })
  async copy(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CopyBoardDto,
  ) {
    return this.boardsService.copyBoard(id, userId, dto);
  }

  @Delete('boards/:id')
  @ApiOperation({ summary: 'Xóa Board vĩnh viễn' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.delete(id, userId);
  }

  // --- MEMBERS MANAGEMENT ---
  @Get('boards/:id/members')
  @ApiOperation({ summary: 'Danh sách thành viên trong Board' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  async getMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.getBoardMembers(id, userId);
  }

  @Get('boards/:id/assignable-members')
  @ApiOperation({ summary: 'Danh sách thành viên có thể được phân công Card (ADMIN & EDITOR)' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên có thể gán' })
  async getAssignableMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.getAssignableMembers(id, userId);
  }

  @Post('boards/:id/members')
  @ApiOperation({ summary: 'Thêm thành viên từ Workspace vào Board' })
  @ApiResponse({ status: 201, description: 'Thêm thành viên thành công' })
  async addMember(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: AddBoardMemberDto,
  ) {
    return this.boardsService.addBoardMember(id, currentUserId, dto);
  }

  @Patch('boards/:id/members/:userId')
  @ApiOperation({ summary: 'Thay đổi vai trò thành viên trong Board (ADMIN | EDITOR | VIEWER)' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: UpdateBoardMemberRoleDto,
  ) {
    return this.boardsService.updateBoardMemberRole(id, currentUserId, targetUserId, dto);
  }

  @Delete('boards/:id/members/:userId')
  @ApiOperation({ summary: 'Xóa thành viên khỏi Board' })
  @ApiResponse({ status: 200, description: 'Xóa thành viên thành công' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.boardsService.removeBoardMember(id, currentUserId, targetUserId);
  }

  @Post('boards/:id/leave')
  @ApiOperation({ summary: 'Rời khỏi Board' })
  @ApiResponse({ status: 200, description: 'Rời Board thành công' })
  async leave(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.leaveBoard(id, userId);
  }

  // --- BOARD INVITATIONS ---
  @Post('boards/:id/invites')
  @ApiOperation({ summary: 'Mời thành viên vào Board qua email / tạo liên kết mời' })
  @ApiResponse({ status: 201, description: 'Tạo lời mời thành công' })
  async inviteMember(
    @Param('id') boardId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: InviteBoardMemberDto,
  ) {
    return this.boardsService.inviteMember(boardId, currentUserId, dto);
  }

  @Get('boards/:id/invites')
  @ApiOperation({ summary: 'Danh sách các lời mời đang chờ của Board' })
  @ApiResponse({ status: 200, description: 'Danh sách lời mời Board' })
  async getPendingBoardInvites(
    @Param('id') boardId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.boardsService.getPendingBoardInvites(boardId, currentUserId);
  }

  @Delete('boards/:id/invites/:inviteId')
  @ApiOperation({ summary: 'Thu hồi lời mời tham gia Board' })
  @ApiResponse({ status: 200, description: 'Thu hồi thành công' })
  async revokeBoardInvite(
    @Param('id') boardId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.boardsService.revokeBoardInvite(boardId, currentUserId, inviteId);
  }

  // --- BOARD EDITOR JOIN MODE & REQUESTS ---
  @Post('boards/:id/request-editor')
  @ApiOperation({ summary: 'Gửi yêu cầu xin cấp quyền Biên tập viên (Editor)' })
  @ApiResponse({ status: 201, description: 'Gửi yêu cầu thành công' })
  async requestEditor(
    @Param('id') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RequestEditorDto,
  ) {
    return this.boardsService.requestEditor(boardId, userId, dto);
  }

  @Post('boards/:id/claim-editor')
  @ApiOperation({ summary: 'Tự động nhận quyền Biên tập viên khi Bảng ở chế độ AUTO_WORKSPACE' })
  @ApiResponse({ status: 200, description: 'Nhận quyền Biên tập viên thành công' })
  async claimEditor(
    @Param('id') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.claimEditor(boardId, userId);
  }

  @Get('boards/:id/editor-requests')
  @ApiOperation({ summary: 'Lấy danh sách các yêu cầu cấp quyền Biên tập viên đang chờ phê duyệt (Admin)' })
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu Biên tập viên' })
  async getEditorRequests(
    @Param('id') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.boardsService.getEditorRequests(boardId, userId);
  }

  @Post('boards/:id/editor-requests/:targetUserId/approve')
  @ApiOperation({ summary: 'Phê duyệt yêu cầu cấp quyền Biên tập viên' })
  @ApiResponse({ status: 200, description: 'Phê duyệt thành công' })
  async approveEditorRequest(
    @Param('id') boardId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.boardsService.approveEditorRequest(boardId, targetUserId, actorId);
  }

  @Post('boards/:id/editor-requests/:targetUserId/reject')
  @ApiOperation({ summary: 'Từ chối yêu cầu cấp quyền Biên tập viên' })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  async rejectEditorRequest(
    @Param('id') boardId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.boardsService.rejectEditorRequest(boardId, targetUserId, actorId);
  }
}

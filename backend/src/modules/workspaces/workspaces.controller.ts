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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  @ApiOperation({ summary: 'Cập nhật Workspace' })
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

  @Post(':id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào Workspace' })
  @ApiResponse({ status: 201, description: 'Thêm thành viên thành công' })
  async addMember(
    @Param('id') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(workspaceId, userId, dto);
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
}

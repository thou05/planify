import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin hồ sơ' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin profile người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu người dùng' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Lấy danh sách các lời mời (Workspace & Board) đang chờ của người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách lời mời đang chờ' })
  async getMyInvitations(@CurrentUser('id') userId: string) {
    return this.usersService.getUserInvitations(userId);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Lấy cài đặt tùy chọn nhận thông báo của người dùng' })
  @ApiResponse({ status: 200, description: 'Tùy chọn nhận thông báo' })
  async getNotificationPreferences(@CurrentUser('id') userId: string) {
    return this.usersService.getNotificationPreferences(userId);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Cập nhật cài đặt tùy chọn nhận thông báo của người dùng' })
  @ApiResponse({ status: 200, description: 'Cập nhật tùy chọn thông báo thành công' })
  async updateNotificationPreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.usersService.updateNotificationPreferences(userId, dto);
  }
}

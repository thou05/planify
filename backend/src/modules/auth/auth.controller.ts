import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendRegisterOtpDto } from './dto/send-register-otp.dto';
import { VerifyRegisterOtpDto } from './dto/verify-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới trực tiếp' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Email đã được sử dụng' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email và mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập / Đăng ký bằng Google OAuth ID Token' })
  @ApiResponse({ status: 200, description: 'Xác thực Google thành công' })
  @ApiResponse({ status: 400, description: 'Credential không hợp lệ' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Post('send-register-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP xác thực email khi đăng ký tài khoản' })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi đến email' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  async sendRegisterOtp(@Body() dto: SendRegisterOtpDto) {
    return this.authService.sendRegisterOtp(dto);
  }

  @Post('verify-register-otp')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Xác thực mã OTP và hoàn tất tạo tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Xác thực OTP và đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc hết hạn' })
  async verifyRegisterOtp(@Body() dto: VerifyRegisterOtpDto) {
    return this.authService.verifyRegisterOtp(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu gửi mã OTP khôi phục mật khẩu' })
  @ApiResponse({ status: 200, description: 'Mã OTP đã được gửi đến email' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản với email này' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP và cập nhật mật khẩu mới' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc hết hạn' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendRegisterOtpDto } from './dto/send-register-otp.dto';
import { VerifyRegisterOtpDto } from './dto/verify-register-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const { data: user, error } = await this.supabase
      .from('users')
      .insert({
        name: dto.name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        status: 'ACTIVE',
      })
      .select('id, name, email, avatar, status, created_at')
      .single();

    if (error || !user) {
      throw new BadRequestException(error?.message || 'Không thể tạo người dùng');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, name, email, password_hash, avatar, status, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !user || !user.password_hash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      created_at: user.created_at,
    };

    return {
      user: safeUser,
      accessToken,
    };
  }

  async getMe(userId: string) {
    let user: any = null;
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, email, avatar, status, created_at, cover_image, phone, job_title, department, location, website, social_links, work_status, bio, timezone, language')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      const fallback = await this.supabase
        .from('users')
        .select('id, name, email, avatar, status, created_at')
        .eq('id', userId)
        .maybeSingle();
      user = fallback.data;
    } else {
      user = data;
    }

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  /**
   * Đăng nhập / Đăng ký nhanh bằng Google OAuth Token
   */
  async googleAuth(dto: GoogleAuthDto) {
    let googleId: string | null = null;
    let email = dto.email ? dto.email.toLowerCase().trim() : '';
    let name = dto.name ? dto.name.trim() : '';
    let avatar = dto.avatar || null;

    if (dto.credential) {
      try {
        const parts = dto.credential.split('.');
        if (parts.length === 3) {
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          if (payload.sub) googleId = payload.sub;
          if (payload.email) email = payload.email.toLowerCase().trim();
          if (payload.name && !name) name = payload.name.trim();
          if (payload.picture && !avatar) avatar = payload.picture;
        }
      } catch {
        // Fallback sử dụng dữ liệu trực tiếp từ dto nếu parse token gặp sự cố
      }
    }

    if (!email) {
      throw new BadRequestException('Không tìm thấy thông tin email từ Google ID token');
    }

    // 1. Tìm kiếm user theo google_id
    let existingUser: any = null;
    if (googleId) {
      try {
        const { data } = await this.supabase
          .from('users')
          .select('id, name, email, avatar, status, created_at, google_id')
          .eq('google_id', googleId)
          .maybeSingle();
        existingUser = data;
      } catch {
        existingUser = null;
      }
    }

    // 2. Nếu chưa tìm thấy theo google_id, tìm theo email
    if (!existingUser) {
      const { data } = await this.supabase
        .from('users')
        .select('id, name, email, avatar, status, created_at, google_id')
        .eq('email', email)
        .maybeSingle();
      existingUser = data;

      // Nếu user đã tồn tại bằng email này nhưng chưa liên kết google_id, hãy cập nhật liên kết
      if (existingUser && googleId && !existingUser.google_id) {
        try {
          await this.supabase
            .from('users')
            .update({
              google_id: googleId,
              avatar: existingUser.avatar || avatar,
            })
            .eq('id', existingUser.id);
        } catch {
          // ignore if column doesn't exist
        }
      }
    }

    let userToReturn = existingUser;

    // 3. Nếu chưa tồn tại -> tạo mới user với status ACTIVE và password_hash null
    if (!userToReturn) {
      const fallbackName = name || email.split('@')[0];
      const insertData: any = {
        name: fallbackName,
        email,
        avatar,
        password_hash: null,
        status: 'ACTIVE',
      };
      if (googleId) insertData.google_id = googleId;

      let { data: newUser, error } = await this.supabase
        .from('users')
        .insert(insertData)
        .select('id, name, email, avatar, status, created_at')
        .maybeSingle();

      if (error && error.message?.includes('google_id')) {
        delete insertData.google_id;
        const retry = await this.supabase
          .from('users')
          .insert(insertData)
          .select('id, name, email, avatar, status, created_at')
          .single();
        newUser = retry.data;
        error = retry.error;
      }

      if (error || !newUser) {
        throw new BadRequestException(error?.message || 'Không thể tạo tài khoản từ Google');
      }
      userToReturn = newUser;
    }

    if (userToReturn.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const accessToken = this.jwtService.sign({
      sub: userToReturn.id,
      email: userToReturn.email,
    });

    return {
      user: {
        id: userToReturn.id,
        name: userToReturn.name,
        email: userToReturn.email,
        avatar: userToReturn.avatar,
        status: userToReturn.status,
        created_at: userToReturn.created_at,
      },
      accessToken,
    };
  }

  /**
   * Gửi mã OTP xác thực đăng ký tài khoản
   */
  async sendRegisterOtp(dto: SendRegisterOtpDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Kiểm tra email không được trùng với tài khoản đã tồn tại
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    // Sinh mã OTP 6 số bằng bộ sinh ngẫu nhiên an toàn (Crypto Secure PRNG)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Vô hiệu hóa các OTP cũ của email này
    try {
      await this.supabase
        .from('auth_otps')
        .update({ is_used: true })
        .eq('email', normalizedEmail)
        .eq('type', 'REGISTER')
        .eq('is_used', false);
    } catch {
      // ignore
    }

    // Lưu vào bảng auth_otps
    const { error: otpError } = await this.supabase.from('auth_otps').insert({
      email: normalizedEmail,
      otp_code: otp,
      type: 'REGISTER',
      attempts: 0,
      is_used: false,
      expires_at: expiresAt,
    });

    if (otpError) {
      throw new BadRequestException('Không thể tạo mã xác thực. Vui lòng thử lại sau.');
    }

    // Gửi email chứa OTP
    await this.mailService.sendRegisterOtp(normalizedEmail, otp, dto.name);

    return {
      message: 'Mã xác thực OTP đã được gửi đến email của bạn',
      email: normalizedEmail,
    };
  }

  /**
   * Xác thực mã OTP và hoàn tất đăng ký tài khoản
   */
  async verifyRegisterOtp(dto: VerifyRegisterOtpDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Tìm bản ghi OTP khả dụng
    const { data: otpRecord } = await this.supabase
      .from('auth_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('type', 'REGISTER')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      throw new BadRequestException('Mã xác thực không tồn tại hoặc đã được sử dụng');
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    if (otpRecord.attempts >= 5) {
      await this.supabase.from('auth_otps').update({ is_used: true }).eq('id', otpRecord.id);
      throw new BadRequestException('Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.');
    }

    if (otpRecord.otp_code !== dto.otp.trim()) {
      await this.supabase
        .from('auth_otps')
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq('id', otpRecord.id);
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Đánh dấu OTP đã dùng
    await this.supabase.from('auth_otps').update({ is_used: true }).eq('id', otpRecord.id);

    // Kiểm tra tránh race condition nếu tài khoản vừa được tạo
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const { data: user, error: createError } = await this.supabase
      .from('users')
      .insert({
        name: dto.name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        status: 'ACTIVE',
      })
      .select('id, name, email, avatar, status, created_at')
      .single();

    if (createError || !user) {
      throw new BadRequestException(createError?.message || 'Không thể tạo người dùng mới');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
      message: 'Đăng ký tài khoản thành công',
    };
  }

  /**
   * Yêu cầu mã OTP khôi phục mật khẩu
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const { data: user } = await this.supabase
      .from('users')
      .select('id, name, email, status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    // Vô hiệu hóa OTP cũ
    try {
      await this.supabase
        .from('auth_otps')
        .update({ is_used: true })
        .eq('email', normalizedEmail)
        .eq('type', 'FORGOT_PASSWORD')
        .eq('is_used', false);
    } catch {
      // ignore
    }

    // Sinh OTP mới bằng bộ sinh ngẫu nhiên an toàn (Crypto Secure PRNG)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: otpError } = await this.supabase.from('auth_otps').insert({
      email: normalizedEmail,
      otp_code: otp,
      type: 'FORGOT_PASSWORD',
      attempts: 0,
      is_used: false,
      expires_at: expiresAt,
    });

    if (otpError) {
      throw new BadRequestException('Không thể tạo mã xác thực. Vui lòng thử lại sau.');
    }

    await this.mailService.sendForgotPasswordOtp(normalizedEmail, otp, user.name);

    return {
      message: 'Mã xác thực OTP đặt lại mật khẩu đã được gửi đến email của bạn',
      email: normalizedEmail,
    };
  }

  /**
   * Xác thực mã OTP và đặt lại mật khẩu mới
   */
  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const { data: otpRecord } = await this.supabase
      .from('auth_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('type', 'FORGOT_PASSWORD')
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      throw new BadRequestException('Mã xác thực không tồn tại hoặc đã được sử dụng');
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    if (otpRecord.attempts >= 5) {
      await this.supabase.from('auth_otps').update({ is_used: true }).eq('id', otpRecord.id);
      throw new BadRequestException('Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.');
    }

    if (otpRecord.otp_code !== dto.otp.trim()) {
      await this.supabase
        .from('auth_otps')
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq('id', otpRecord.id);
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Đánh dấu OTP đã dùng
    await this.supabase.from('auth_otps').update({ is_used: true }).eq('id', otpRecord.id);

    // Hash mật khẩu mới
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    const { data: user, error: updateError } = await this.supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', normalizedEmail)
      .select('id, name, email, avatar, status, created_at')
      .single();

    if (updateError || !user) {
      throw new BadRequestException('Không thể cập nhật mật khẩu');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
      message: 'Đổi mật khẩu thành công',
    };
  }
}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
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
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, name, email, avatar, status, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }
}

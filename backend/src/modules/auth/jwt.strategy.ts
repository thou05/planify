import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../integrations/supabase/supabase.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'planify_super_secret_jwt_key_2026_modern_kanban'),
    });
  }

  async validate(payload: JwtPayload) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, name, avatar, status')
      .eq('id', payload.sub)
      .maybeSingle();

    if (!user || user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị khóa');
    }

    return user;
  }
}

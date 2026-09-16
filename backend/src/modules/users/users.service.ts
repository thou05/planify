import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../integrations/supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, name, email, avatar, status, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const updateData: Record<string, any> = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.avatar !== undefined) updateData.avatar = dto.avatar;

    const { data: updatedUser, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, avatar, status, created_at')
      .single();

    if (error || !updatedUser) {
      throw new BadRequestException(error?.message || 'Không thể cập nhật hồ sơ');
    }

    return updatedUser;
  }
}

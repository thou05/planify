import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  invitations?: boolean;

  @IsOptional()
  @IsBoolean()
  removals?: boolean;

  @IsOptional()
  @IsBoolean()
  assignments?: boolean;

  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @IsOptional()
  @IsBoolean()
  due_reminders?: boolean;

  @IsOptional()
  @IsBoolean()
  comments?: boolean;
}

export interface NotificationPreferences {
  invitations: boolean;
  removals: boolean;
  assignments: boolean;
  mentions: boolean;
  due_reminders: boolean;
  comments: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  invitations: true,
  removals: true,
  assignments: true,
  mentions: true,
  due_reminders: true,
  comments: true,
};

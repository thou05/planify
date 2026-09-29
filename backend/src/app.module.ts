import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './integrations/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { BoardsModule } from './modules/boards/boards.module';
import { ListsModule } from './modules/lists/lists.module';
import { CardsModule } from './modules/cards/cards.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { LabelsModule } from './modules/labels/labels.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CardRelationsModule } from './modules/card-relations/card-relations.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AiModule } from './modules/ai/ai.module';
import { ImportExportModule } from './modules/import-export/import-export.module';

import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'backend/.env',
        '.env',
        '../backend/.env',
        '../frontend/.env.local',
        '../.env',
      ],
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    BoardsModule,
    ListsModule,
    CardsModule,
    ChecklistsModule,
    LabelsModule,
    CommentsModule,
    AttachmentsModule,
    ActivitiesModule,
    NotificationsModule,
    CardRelationsModule,
    TemplatesModule,
    AiModule,
    ImportExportModule,
    AnalyticsModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


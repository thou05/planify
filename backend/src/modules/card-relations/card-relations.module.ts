import { Module } from '@nestjs/common';
import { CardRelationsController } from './card-relations.controller';
import { CardRelationsService } from './card-relations.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  controllers: [CardRelationsController],
  providers: [CardRelationsService],
  exports: [CardRelationsService],
})
export class CardRelationsModule {}

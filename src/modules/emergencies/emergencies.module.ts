import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emergency } from '../../entities/emergency.entity';
import { EmergenciesService } from './emergencies.service';
import { EmergenciesController, AdminEmergenciesController } from './emergencies.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Emergency])],
    controllers: [EmergenciesController, AdminEmergenciesController],
    providers: [EmergenciesService],
    exports: [EmergenciesService],
})
export class EmergenciesModule { }

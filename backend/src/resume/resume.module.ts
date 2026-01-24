import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ParseModule } from '../parse/parse.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ParseModule, AuthModule],
    controllers: [ResumeController],
    providers: [ResumeService],
    exports: [ResumeService],
})
export class ResumeModule { }

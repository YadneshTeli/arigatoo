import { Module } from '@nestjs/common';
import { AnalyzeController } from './analyze.controller';
import { AnalyzeService } from './analyze.service';
import { ParseModule } from '../parse/parse.module';

@Module({
    imports: [ParseModule],
    controllers: [AnalyzeController],
    providers: [AnalyzeService],
    exports: [AnalyzeService],
})
export class AnalyzeModule { }

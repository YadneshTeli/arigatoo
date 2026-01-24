import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ParseModule } from './parse/parse.module';
import { AnalyzeModule } from './analyze/analyze.module';
import { ResumeModule } from './resume/resume.module';
import { FirebaseModule } from './firebase/firebase.module';
import { RedisCacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisCacheModule,
    FirebaseModule,
    AuthModule,
    ParseModule,
    AnalyzeModule,
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

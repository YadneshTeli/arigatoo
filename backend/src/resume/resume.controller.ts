import { Controller, Get, Post, Delete, UseGuards, Req, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ResumeService } from './resume.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import type { ParsedResume } from 'arigatoo-shared';

@Controller('resume')
export class ResumeController {
    constructor(private readonly resumeService: ResumeService) { }

    @Get()
    @UseGuards(FirebaseAuthGuard)
    async getResume(@Req() req: any) {
        const resume = await this.resumeService.getUserResume(req.user.id);

        return {
            success: true,
            data: { resume },
        };
    }

    @Post('upload')
    @UseGuards(FirebaseAuthGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 uploads per minute
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    }))
    async uploadResume(
        @Req() req: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            return { success: false, error: 'No file provided' };
        }

        const resume = await this.resumeService.uploadResume(req.user.id, file);

        return {
            success: true,
            data: { resume },
            message: 'Resume uploaded successfully',
        };
    }

    @Delete()
    @UseGuards(FirebaseAuthGuard)
    async deleteResume(@Req() req: any) {
        await this.resumeService.deleteUserResume(req.user.id);

        return {
            success: true,
            message: 'Resume deleted successfully',
        };
    }

    @Post('update')
    @UseGuards(FirebaseAuthGuard)
    async updateParsedContent(
        @Req() req: any,
        @Body('parsedContent') parsedContent: ParsedResume,
    ) {
        const resume = await this.resumeService.updateParsedContent(req.user.id, parsedContent);

        return {
            success: true,
            data: { resume },
            message: 'Resume updated successfully',
        };
    }
}

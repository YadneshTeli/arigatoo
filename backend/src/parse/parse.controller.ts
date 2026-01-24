import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseService } from './parse.service';

@Controller('parse')
export class ParseController {
    constructor(private readonly parseService: ParseService) { }

    @Post('resume')
    @UseInterceptors(FileInterceptor('file'))
    async parseResume(
        @UploadedFile() file: Express.Multer.File,
        @Body('text') text?: string,
    ) {
        let rawText: string;

        if (file) {
            const fileType = file.mimetype;
            if (fileType === 'application/pdf') {
                rawText = await this.parseService.parsePdf(file.buffer);
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                rawText = await this.parseService.parseDocx(file.buffer);
            } else if (fileType === 'text/plain') {
                rawText = file.buffer.toString('utf-8');
            } else {
                return {
                    success: false,
                    error: 'Unsupported file type. Please upload PDF, DOCX, or TXT.',
                };
            }
        } else if (text) {
            rawText = text;
        } else {
            return { success: false, error: 'No file or text provided' };
        }

        const parsedResume = await this.parseService.extractResumeData(rawText);

        return {
            success: true,
            data: { parsedResume },
        };
    }

    @Post('job')
    async parseJobDescription(
        @Body('url') url?: string,
        @Body('text') text?: string,
    ) {
        let rawText: string;

        if (url) {
            rawText = await this.parseService.scrapeJobDescription(url);
        } else if (text) {
            rawText = text;
        } else {
            return { success: false, error: 'No URL or text provided' };
        }

        const jobData = await this.parseService.extractJobData(rawText, url);

        return {
            success: true,
            data: { jobDescription: jobData },
        };
    }
}

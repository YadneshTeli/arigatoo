import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { Resume, ParsedResume } from 'arigatoo-shared';
import { ParseService } from '../parse/parse.service';

@Injectable()
export class ResumeService {
    constructor(
        @Inject('FIREBASE_FIRESTORE') private readonly firestore: admin.firestore.Firestore | null,
        private readonly parseService: ParseService,
    ) { }

    // ============ Get user's resume (stored in Firestore) ============
    async getUserResume(userId: string): Promise<Resume | null> {
        if (!this.firestore) return null;

        const snapshot = await this.firestore
            .collection('resumes')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const data = doc.data();

        return {
            id: doc.id,
            userId: data.userId,
            fileName: data.fileName,
            fileType: data.fileType,
            fileUrl: '', // No file storage
            parsedContent: data.parsedContent,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }

    // ============ Upload and parse resume (no file storage) ============
    async uploadResume(
        userId: string,
        file: Express.Multer.File,
    ): Promise<Resume> {
        // Check file type
        // Check file type
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/msword',
            'application/octet-stream'
        ];

        console.log(`Processing upload: ${file.originalname} (${file.mimetype})`);

        if (!allowedTypes.includes(file.mimetype)) {
            console.warn(`Warning: Unknown file type: ${file.mimetype}. Proceeding anyway for debugging.`);
            // throw new BadRequestException(`Invalid file type: ${file.mimetype}. Only PDF, DOCX, and TXT files are allowed`);
        }

        // Delete existing resume if any
        await this.deleteUserResume(userId);

        // Parse resume content (no file storage - just parse in memory)
        let rawText: string;
        if (file.mimetype === 'application/pdf') {
            rawText = await this.parseService.parsePdf(file.buffer);
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            rawText = await this.parseService.parseDocx(file.buffer);
        } else {
            rawText = file.buffer.toString('utf-8');
        }

        const parsedContent = await this.parseService.extractResumeData(rawText);

        // Determine file type
        let fileType: 'pdf' | 'docx' | 'txt' = 'txt';
        if (file.mimetype === 'application/pdf') fileType = 'pdf';
        else if (file.mimetype.includes('wordprocessingml')) fileType = 'docx';

        // Save parsed content to Firestore (no file storage needed)
        const resumeData = {
            userId,
            fileName: file.originalname,
            fileType,
            fileUrl: '', // No file storage
            parsedContent,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (!this.firestore) {
            // If no Firestore, return the parsed resume without saving
            return {
                id: `temp_${Date.now()}`,
                userId,
                fileName: file.originalname,
                fileType,
                fileUrl: '',
                parsedContent,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        const docRef = await this.firestore.collection('resumes').add(resumeData);

        return {
            id: docRef.id,
            userId,
            fileName: file.originalname,
            fileType,
            fileUrl: '',
            parsedContent,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

    // ============ Delete user's resume ============
    async deleteUserResume(userId: string): Promise<void> {
        if (!this.firestore) return;

        const snapshot = await this.firestore
            .collection('resumes')
            .where('userId', '==', userId)
            .get();

        const batch = this.firestore.batch();

        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }

        await batch.commit();
    }

    // ============ Update parsed content ============
    async updateParsedContent(userId: string, parsedContent: ParsedResume): Promise<Resume> {
        const resume = await this.getUserResume(userId);
        if (!resume) {
            throw new NotFoundException('Resume not found');
        }

        if (!this.firestore) {
            return { ...resume, parsedContent, updatedAt: new Date() };
        }

        await this.firestore.collection('resumes').doc(resume.id).update({
            parsedContent,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            ...resume,
            parsedContent,
            updatedAt: new Date(),
        };
    }
}

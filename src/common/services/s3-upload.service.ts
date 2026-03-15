import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
    key: string;
    url: string;
    bucket: string;
}

@Injectable()
export class S3UploadService {
    private readonly logger = new Logger(S3UploadService.name);
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly region: string;

    constructor(private configService: ConfigService) {
        this.region = this.configService.get<string>('AWS_REGION', 'eu-north-1');
        this.bucket = this.configService.get<string>('AWS_S3_DOCUMENTS_BUCKET', 'workfave-hr-bucket');

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
            },
        });

        this.logger.log(`S3 Client initialized for region: ${this.region}, bucket: ${this.bucket}`);
    }

    /**
     * Upload a file to S3
     * @param file Buffer or base64 string of the file
     * @param folder Folder path in S3 (e.g., 'driver-documents', 'vehicle-photos')
     * @param fileName Optional custom filename
     * @param contentType MIME type of the file
     */
    async uploadFile(
        file: Buffer | string,
        folder: string,
        fileName?: string,
        contentType: string = 'image/jpeg',
    ): Promise<UploadResult> {
        try {
            // Convert base64 to buffer if necessary
            let fileBuffer: Buffer;
            if (typeof file === 'string') {
                // Remove base64 prefix if present
                const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
                fileBuffer = Buffer.from(base64Data, 'base64');
            } else {
                fileBuffer = file;
            }

            // Generate unique filename
            const extension = this.getExtensionFromContentType(contentType);
            const key = `${folder}/${fileName || uuidv4()}.${extension}`;

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                ACL: 'public-read',
            });

            await this.s3Client.send(command);

            const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

            this.logger.log(`File uploaded successfully: ${key}`);

            return {
                key,
                url,
                bucket: this.bucket,
            };
        } catch (error) {
            this.logger.error('Failed to upload file to S3:', error);
            throw error;
        }
    }

    /**
     * Get a signed URL for temporary access to a private file
     */
    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            return signedUrl;
        } catch (error) {
            this.logger.error('Failed to generate signed URL:', error);
            throw error;
        }
    }

    /**
     * Delete a file from S3
     */
    async deleteFile(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.s3Client.send(command);
            this.logger.log(`File deleted successfully: ${key}`);
        } catch (error) {
            this.logger.error('Failed to delete file from S3:', error);
            throw error;
        }
    }

    /**
     * Upload driver document
     */
    async uploadDriverDocument(
        driverId: string,
        documentType: string,
        file: Buffer | string,
        contentType: string = 'image/jpeg',
    ): Promise<UploadResult> {
        const folder = `umove/drivers/${driverId}/documents`;
        const fileName = `${documentType.toLowerCase()}_${Date.now()}`;
        return this.uploadFile(file, folder, fileName, contentType);
    }

    /**
     * Upload vehicle photo
     */
    async uploadVehiclePhoto(
        driverId: string,
        vehicleId: string,
        file: Buffer | string,
        contentType: string = 'image/jpeg',
    ): Promise<UploadResult> {
        const folder = `umove/drivers/${driverId}/vehicles/${vehicleId}`;
        const fileName = `photo_${Date.now()}`;
        return this.uploadFile(file, folder, fileName, contentType);
    }

    private getExtensionFromContentType(contentType: string): string {
        const extensions: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
        };
        return extensions[contentType] || 'jpg';
    }
}

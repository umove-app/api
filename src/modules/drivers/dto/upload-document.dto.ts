import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../../../common/enums';

export class UploadDocumentDto {
    @ApiProperty({ enum: DocumentType, example: DocumentType.DRIVERS_LICENSE })
    @IsEnum(DocumentType)
    documentType: DocumentType;

    @ApiProperty({ description: 'Base64 encoded image data' })
    @IsString()
    fileData: string;

    @ApiPropertyOptional({ example: 'DL-123456789' })
    @IsOptional()
    @IsString()
    documentNumber?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    expiryDate?: string;

    @ApiPropertyOptional({ example: 'image/jpeg' })
    @IsOptional()
    @IsString()
    contentType?: string;
}

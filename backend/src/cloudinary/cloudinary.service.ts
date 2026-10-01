import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary successfully configured.');
    } else {
      this.logger.warn(
        'CLOUDINARY credentials not found in environment. Falling back to local storage.',
      );
    }
  }

  get isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload buffer lên Cloudinary
   */
  async uploadFile(file: Express.Multer.File, folder = 'mini-ecommerce/products'): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`, error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty response'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Xóa file trên Cloudinary
   */
  async deleteFile(publicId: string): Promise<any> {
    if (!this.isConfigured) return;
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
      this.logger.warn(`Failed to destroy Cloudinary image ${publicId}: ${err?.message || err}`);
    }
  }
}

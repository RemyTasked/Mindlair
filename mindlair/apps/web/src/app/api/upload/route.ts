import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB for audio (3+ minutes of voice capture)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const purpose = formData.get('purpose') as string | null; // 'thumbnail' | 'inline' | 'voice_capture'

    if (!file) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'No file provided' },
        { status: 400 }
      );
    }

    const isVoiceCapture = purpose === 'voice_capture';
    const isAudio = file.type.startsWith('audio/') || ALLOWED_AUDIO_TYPES.includes(file.type);
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

    if (isVoiceCapture) {
      if (!isAudio) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Invalid file type for voice capture. Audio file required.' },
          { status: 400 }
        );
      }
      if (file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Audio file too large. Maximum size: 25MB' },
          { status: 400 }
        );
      }
    } else {
      if (!isImage) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
          { status: 400 }
        );
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'File too large. Maximum size: 5MB' },
          { status: 400 }
        );
      }
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback to base64 if Cloudinary is not configured (images only, audio too large)
      if (isVoiceCapture) {
        return NextResponse.json(
          { code: 'CONFIG_ERROR', message: 'Voice capture requires Cloudinary configuration' },
          { status: 500 }
        );
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
      });
    }

    // Upload to Cloudinary with different settings based on purpose
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (isVoiceCapture) {
      const folder = `mindlair/captures/${user.id}/voice`;

      const result = await new Promise<{ secure_url: string; public_id: string; duration?: number }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'video', // Cloudinary uses 'video' for audio files too
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
                duration: result.duration,
              });
            } else {
              reject(new Error('No result from Cloudinary'));
            }
          }
        );

        uploadStream.end(buffer);
      });

      return NextResponse.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        durationMs: result.duration ? Math.round(result.duration * 1000) : undefined,
      });
    }

    const isInline = purpose === 'inline';
    const folder = isInline 
      ? `mindlair/posts/${user.id}/inline` 
      : `mindlair/posts/${user.id}`;

    const transformation = isInline
      ? [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1600, crop: 'limit' }, // Keep native aspect ratio for inline images
        ]
      : [
          { quality: 'auto', fetch_format: 'auto' },
          { width: 1200, height: 675, crop: 'limit' }, // 16:9 max size for thumbnails
        ];

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (Cloudinary handles larger files well)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

    if (!file) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      );
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback to base64 if Cloudinary is not configured
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      return NextResponse.json({
        success: true,
        url: dataUrl,
      });
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mindlair/posts/${user.id}`,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, height: 675, crop: 'limit' }, // 16:9 max size for thumbnails
          ],
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

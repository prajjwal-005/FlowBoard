import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { v2 as cloudinary } from 'cloudinary';
import { failure, success } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return failure("Unauthorized", 401);

    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = session.userID;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'avatars', public_id: publicId, overwrite: true },
      process.env.CLOUDINARY_API_SECRET!
    );

    return success({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: 'avatars',
      publicId,
      overwrite: true
    });
  } catch (error) {
    return failure("Failed to generate upload signature", 500, error);
  }
}
'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/fetch';
import { ApiResponse } from '@/types/api';
interface AvatarSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  overwrite: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export function useAvatarUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Only JPG, PNG, or WEBP images are allowed');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image must be under 5MB');
      }

      const { data: sig } = await api.post<ApiResponse<AvatarSignature>>('/api/profile/avatar-signature');      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);
      formData.append('public_id', sig.publicId);
      formData.append('overwrite', String(sig.overwrite));

      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? 'Upload failed');
      }

      const data: { secure_url: string } = await res.json();
      return data.secure_url;
    },
  });
}
'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { ProfileForm } from '@/components/board/ProfileForm';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  if (isLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ProfileForm key={user.id} user={user} updateProfile={updateProfile} />;
}
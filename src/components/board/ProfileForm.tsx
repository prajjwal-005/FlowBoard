'use client';

import { useRef, useState } from 'react';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { updateProfileSchema } from '@/schemas/profileSchema';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types/api';

export function ProfileForm({
  user,
  updateProfile,
}: {
  user: User;
  updateProfile: ReturnType<typeof useUpdateProfile>;
}) {
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarUpload = useAvatarUpload();

  const isUnchanged =
    nickname === (user.nickname ?? '') && avatarUrl === (user.avatarUrl ?? '');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = ''; // allow re-selecting the same file
  if (!file) return;

  avatarUpload.mutate(file, {
    onSuccess: (url) => {
      setAvatarUrl(url);
      updateProfile.mutate(
        { avatarUrl: url },
        {
          onSuccess: () => toast.success('Avatar updated'),
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to save avatar');
            setAvatarUrl(user.avatarUrl ?? ''); // rollback preview if persist fails
          },
        }
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Avatar upload failed'),
  });
};

  const handleSubmit = () => {
    setFieldError(null);
    const parsed = updateProfileSchema.safeParse({
      nickname: nickname !== (user.nickname ?? '') ? nickname || undefined : undefined,
      avatarUrl: avatarUrl !== (user.avatarUrl ?? '') ? avatarUrl || null : undefined,
    });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    updateProfile.mutate(parsed.data, {
      onSuccess: () => toast.success('Profile updated'),
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to update profile');
      },
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUpload.isPending}
          className="relative group h-16 w-16 rounded-full outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {avatarUpload.isPending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Pencil className="w-5 h-5 text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div>
          <p className="text-body font-medium text-foreground">{user.username}</p>
          <p className="text-caption text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <input
          id="username"
          value={user.username}
          disabled
          className="w-full rounded-input border border-border bg-muted px-3 py-2 text-body text-muted-foreground opacity-70"
        />
        <p className="text-caption text-muted-foreground">Username can&apos;t be changed.</p>
      </Field>

      <Field>
        <FieldLabel htmlFor="nickname">Nickname</FieldLabel>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="How you'd like to appear"
          className="w-full rounded-input border border-border bg-surface-elevated px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
        />
        <FieldError>{fieldError}</FieldError>
      </Field>

      <Button
        onClick={handleSubmit}
        disabled={isUnchanged || updateProfile.isPending || avatarUpload.isPending}
        className="w-full"
      >
        {updateProfile.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}
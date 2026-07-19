'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import {
  Field,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { registerSchema } from '@/schemas/registerSchema';
import { useQueryClient } from '@tanstack/react-query';

// in onSubmit, right before router.push:
export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.input<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? 'Something went wrong');
      }

      toast.success('Account created!', {
        description: 'Welcome to FlowBoard.',
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      router.push('/dashboard');
    } catch (error) {
      toast.error('Registration failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-card shadow-md p-8 space-y-8">

        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-h1 font-semibold text-foreground tracking-tight">
            Create your account
          </h1>
          <p className="text-body text-muted-foreground">
            Get started with FlowBoard for free
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck={false}
                  placeholder="your_username"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  aria-invalid={fieldState.invalid}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="you@example.com"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="password"
                  aria-invalid={fieldState.invalid}
                  autoCorrect="off"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  spellCheck={false}
                  placeholder="At least 6 characters"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-caption text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

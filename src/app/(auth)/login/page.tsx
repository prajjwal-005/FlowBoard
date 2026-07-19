'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { loginSchema } from '@/schemas/loginSchema';
import { useQueryClient } from '@tanstack/react-query';


export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<z.input<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? 'Something went wrong');
      }

      toast.success('Welcome back!');
      queryClient.clear();
      router.push('/dashboard');
    } catch (error) {
      toast.error('Login failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Invalid credentials. Please try again.',
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
            Welcome back
          </h1>
          <p className="text-body text-muted-foreground">
            Sign in to your FlowBoard account
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          <Controller
            name="identifier"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email or Username</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="none"
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
                  autoComplete="current-password"
                  spellCheck={false}
                  placeholder="Enter your password"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-caption text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

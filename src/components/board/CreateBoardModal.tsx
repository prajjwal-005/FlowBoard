'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Field,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { useUIStore } from '@/store/uiStore';
import { useQueryClient,useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boardSchema } from '@/schemas/boardSchema';
import   * as z from "zod";
import { api } from '@/lib/fetch';
import { toast } from 'sonner';
import { boardKeys } from '@/lib/queryKeys';

export function CreateBoardModal() {
  const { activeModal, setActiveModal } = useUIStore();
  const isOpen = activeModal === 'createBoard';
  const queryClient = useQueryClient();

  const  form = useForm<z.input<typeof boardSchema>>({
    resolver: zodResolver(boardSchema),
    defaultValues: { name: '', description: '' },
  });

   const mutation = useMutation({
    mutationFn: (data :z.infer<typeof boardSchema>) => api.post('/api/boards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      setActiveModal(null);
      form.reset();
      toast.success('Board created');
    },
    onError: () => toast.error('Failed to create board'),
  });

  const onSubmit = (data :z.infer<typeof boardSchema>) => mutation.mutate(data);


  const isSubmitting = mutation.isPending?true :false ;  

  return (
    <Dialog open={isOpen }
            onOpenChange={(open) => {
                if (!open) {
                    setActiveModal(null);
                    form.reset();
                }
            }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2 font-semibold text-foreground">
            Create a new board
          </DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            Give your board a name and an optional description.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <Controller
            name="name"
            control={form.control }
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Board name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g. Engineering Sprint"
                  autoFocus
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="description"
            control={ form.control }
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </FieldLabel>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="What's this board for?"
                  rows={3}
                  className="resize-none"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                                setActiveModal(null);  
                                form.reset();
                            }  }
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create board'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

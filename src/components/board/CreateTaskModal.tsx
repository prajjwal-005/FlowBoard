"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { CreateTaskInput ,CreateTaskSchema} from "@/schemas/taskSchema";
import type { Resolver } from "react-hook-form"

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaskInput) => void;
  isSubmitting?: boolean;
  /** Column this task will be created in — shown in the header, not editable here. */
  columnTitle: string;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export function CreateTaskModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  columnTitle,
}: CreateTaskModalProps) {
  const {
  control,
  handleSubmit,
  reset,
  formState: { errors },
} = useForm<CreateTaskInput>({
  resolver: zodResolver(CreateTaskSchema) as Resolver<CreateTaskInput>,
  defaultValues: { title: "", description: "" },
})

  useEffect(() => {
    if (!open) reset({ title: "", description: "" });
  }, [open, reset]);

  function submit(data: CreateTaskInput) {
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task in {columnTitle}</DialogTitle>
        </DialogHeader>

        <form
          id="create-task-form"
          onSubmit={handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="task-title">Title</FieldLabel>
                <input
                  {...field}
                  id="task-title"
                  autoFocus
                  maxLength={200}
                  placeholder="What needs doing?"
                  disabled={isSubmitting}
                  className="w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                />
                <FieldError>{errors.title?.message}</FieldError>
              </Field>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="task-description">
                  Description
                </FieldLabel>
                <Textarea
                  {...field}
                  id="task-description"
                  rows={3}
                  maxLength={2000}
                  placeholder="Add more detail (optional)"
                  disabled={isSubmitting}
                />
                <FieldError>{errors.description?.message}</FieldError>
              </Field>
            )}
          />

          <div className="flex gap-4">
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Field className="flex-1">
                  <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.priority?.message}</FieldError>
                </Field>
              )}
            />

            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <Field className="flex-1">
                  <FieldLabel htmlFor="task-due-date">Due date</FieldLabel>
                  <input
                    id="task-due-date"
                    type="date"
                    disabled={isSubmitting}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    className="w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                  />
                  <FieldError>{errors.dueDate?.message}</FieldError>
                </Field>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";
import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Member } from "@/types/api";

interface AssigneeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  assignedUserIDs: string[];
  onSelect: (userID: string) => void;
  isLoading?: boolean;
}

export function AssigneeSelector({
  open,
  onOpenChange,
  members,
  assignedUserIDs,
  onSelect,
  isLoading = false,
}: AssigneeSelectorProps) {
  const [search, setSearch] = useState("");
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add assignee"
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] text-muted-foreground hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          <UserPlus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search members…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading…" : "No members found."}
            </CommandEmpty>
            <CommandGroup>
              {members.map((m) => {
                const isAssigned = assignedUserIDs.includes(m.userID);
                return (
                  <CommandItem
                    key={m.userID}
                    value={m.user.username}
                    disabled={isAssigned}
                    onSelect={() => {
                      onSelect(m.userID);
                      onOpenChange(false);
                    }}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[9px] font-medium">
                      {m.user.username.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{m.user.username}</span>
                    {isAssigned && <Check className="h-3.5 w-3.5 text-[var(--primary)]" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
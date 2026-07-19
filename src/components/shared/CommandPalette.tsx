'use client';

import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { LayoutDashboard, Settings } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useUIStore } from '@/store/uiStore';

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const { data: boards } = useBoards();

  function go(path: string) {
    router.push(path);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search boards or jump to a page..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go('/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go('/profile')}>
            <Settings className="mr-2 h-4 w-4" />
            Profile
          </CommandItem>
        </CommandGroup>

        {boards && boards.length > 0 && (
          <CommandGroup heading="Boards">
            {boards.map((board) => (
              <CommandItem key={board.id} onSelect={() => go(`/boards/${board.id}`)}>
                {board.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
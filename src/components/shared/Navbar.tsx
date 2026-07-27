'use client';

import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './UserAvatar';
import { useUIStore } from '@/store/uiStore';
import { NotificationBell } from '../notifications/NotificationBell';

export function Navbar() {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-h3 font-medium text-foreground hidden sm:block">FlowBoard</h2>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="text-muted-foreground w-48 justify-start gap-2 hidden md:flex"
        >
          <Search className="w-4 h-4" />
          <span className="text-caption">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <NotificationBell/>

        <div className="h-6 w-px bg-border mx-1" />

        <UserAvatar />
      </div>
    </header>
  );
}
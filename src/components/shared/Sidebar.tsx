'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, KanbanSquare, Settings, ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useBoards } from '@/hooks/useBoards';
import type { LucideIcon } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setActiveModal,toggleSidebar } = useUIStore();
  const { data: boards, isLoading, error } = useBoards();

  if (!sidebarOpen) {
    return (
      <div className="w-16 shrink-0 border-r border-border bg-sidebar flex flex-col items-center py-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-4"
        >
          <LayoutGrid className="w-5 h-5 text-primary" />
        </Button>
      </div>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col transition-all duration-300">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <span className="font-semibold tracking-tight">FlowBoard</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <div className="space-y-1">
          <NavLink href="/dashboard" icon={LayoutGrid} label="Dashboard" active={pathname === '/dashboard'} />
          <NavLink href="/profile" icon={Settings} label="Settings" active={pathname.startsWith('/profile')} />
        </div>

        {/* Boards List Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-caption font-semibold text-muted-foreground uppercase tracking-wider">
              Your Boards
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setActiveModal('createBoard') }
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
           

            {/* Loading state — skeleton rows */}
            { isLoading  && (
              <div className="space-y-1 px-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 rounded bg-muted/60 animate-pulse" style={{ width: `${70 - i * 10}%` }} />
                ))}
              </div>
            )}

            {/* Error state */}
            { error && (
              <p className="px-3 py-2 text-caption text-error">
                Couldn&apos;t load boards.
              </p>
            )}

            {/* Empty state */}
            { !isLoading && !error && boards?.length === 0 && (
              <p className="px-3 py-2 text-caption text-muted-foreground">
                No boards yet.
              </p>
            )}

            {/* Populated state */}
            { boards?.map((board) => (
              <NavLink
                key={board.id}
                href={`/boards/${board.id}`}
                icon={KanbanSquare}
                label={board.name}
                active={pathname === `/boards/${board.id}`}
              />
            )) }
          </div>
        </div>
      </nav>
    </aside>
  );
}

// Small helper component for the links
function NavLink({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-button text-body transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-hover hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
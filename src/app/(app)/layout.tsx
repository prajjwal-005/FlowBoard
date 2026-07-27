'use client';

import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { CreateBoardModal } from '@/components/board/CreateBoardModal';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { useCommandPaletteShortcut } from '@/hooks/useCommandPaletteShortcut';
import { RealtimeProvider } from '@/components/RealtimeProvider';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
      
  useCommandPaletteShortcut();
  return (
    <RealtimeProvider>
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar - Fixed to the left */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar - Fixed to the top of the content area */}
        <Navbar />

        {/* Dynamic Page Content (Dashboard, Kanban Board, etc.) */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
     <CreateBoardModal />
     <CommandPalette /> 
    </div>
    </RealtimeProvider>
  );
}



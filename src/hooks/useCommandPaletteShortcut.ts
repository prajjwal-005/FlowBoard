import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export function useCommandPaletteShortcut() {
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const open = useUIStore((s) => s.commandPaletteOpen);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);
}
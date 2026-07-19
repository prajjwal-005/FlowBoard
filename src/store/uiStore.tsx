import { create } from "zustand"

type ActiveModal = "createBoard" | "createTask" | "editColumn" | "createColumn" | null

type UIStore = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  createTaskColumnId: string | null;
  setCreateTaskColumnId: (id: string | null) => void;

  activeModal: ActiveModal;
  setActiveModal: (modal: ActiveModal) => void;
  closeModal: () => void;
  commandPaletteOpen:boolean;
  setCommandPaletteOpen:(open: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  createTaskColumnId: null,
  setCreateTaskColumnId: (id) => set({ createTaskColumnId: id }),

  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, selectedTaskId: null, createTaskColumnId: null }),
  commandPaletteOpen:false,
  setCommandPaletteOpen:(open) =>set({commandPaletteOpen:open}) 
}));
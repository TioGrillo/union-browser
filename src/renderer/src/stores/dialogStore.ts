import { create } from "zustand";

export type DialogType =
  | null
  | { type: "create-workspace" }
  | { type: "edit-workspace"; workspaceId: string }
  | { type: "delete-workspace"; workspaceId: string }
  | { type: "create-account"; workspaceId: string }
  | { type: "edit-account"; accountId: string }
  | { type: "delete-account"; accountIds: string[] }
  | { type: "settings" }
  | { type: "keyboard-shortcuts" };

interface DialogStore {
  dialog: DialogType;
  open: (dialog: DialogType) => void;
  close: () => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  dialog: null,
  open: (dialog) => set({ dialog }),
  close: () => set({ dialog: null }),
}));

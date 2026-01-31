import { invoke } from '@tauri-apps/api/core';

export const api = {
  // Parse CSV: returns Transaction[]
  parseCSV: async (content, rules) => {
    return await invoke('parse_csv', { content, rules });
  },

  // Save Data
  saveData: async (data) => {
    return await invoke('save_data', { data });
  },

  // Load Data: returns AppData
  loadData: async () => {
    return await invoke('load_data');
  }
};

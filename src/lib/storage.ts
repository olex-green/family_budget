import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { AppData, Transaction } from './types';

const DATA_FILENAME = 'budget_data.json';

export const saveData = async (data: AppData): Promise<void> => {
    try {
        await writeTextFile(DATA_FILENAME, JSON.stringify(data, null, 2), {
            baseDir: BaseDirectory.AppLocalData,
        });
    } catch (e) {
        console.error('Failed to save data', e);
        // Fallback or error handling
        throw e;
    }
};

export const loadData = async (): Promise<AppData> => {
    try {
        // check if file exists
        // Note: exists() might need specific permission too.
        const fileExists = await exists(DATA_FILENAME, { baseDir: BaseDirectory.AppLocalData });

        if (!fileExists) {
            return { transactions: [], lastUpdated: new Date().toISOString(), initialCapital: 0, categoryRules: [] };
        }

        const content = await readTextFile(DATA_FILENAME, {
            baseDir: BaseDirectory.AppLocalData,
        });
        const parsed = JSON.parse(content);
        return {
            ...parsed,
            initialCapital: parsed.initialCapital ?? 0,
            categoryRules: parsed.categoryRules ?? []
        };

    } catch (e) {
        console.error('Failed to load data', e);
        return { transactions: [], lastUpdated: new Date().toISOString(), initialCapital: 0, categoryRules: [] };
    }
};

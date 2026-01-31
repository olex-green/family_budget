export interface Transaction {
    id: string;
    date: string; // ISO format YYYY-MM-DD
    amount: number;
    description: string;
    category?: string;
    originalLine?: string; // For debugging
}

export interface CategoryRule {
    id: string;
    keyword: string;
    category: string;
}

export interface AppData {
    transactions: Transaction[];
    lastUpdated: string;
    initialCapital: number;
    categoryRules: CategoryRule[];
}

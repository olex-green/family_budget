import Papa from "papaparse";
import { parse, format } from "date-fns";
import { CategoryRule, Transaction } from "./types";

export const parseCSV = (file: File, rules: CategoryRule[]): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: false, // File has no header based on inspection
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const transactions: Transaction[] = results.data.map((row: any, index) => {
                        // Expected format: Date, Amount, Description, Balance
                        // Example: 29/01/2026, -218.13, "Desc", +2640.22

                        // row is array: [date, amount, desc, balance]
                        const dateStr = row[0];
                        const amountStr = row[1];
                        const desc = row[2];
                        // const balance = row[3];

                        // Parse Date: DD/MM/YYYY
                        const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
                        const isoDate = format(parsedDate, "yyyy-MM-dd");

                        // Parse Amount: Remove quotes if any, handle currency signs if needed (though CSV seems to have clean numbers inside quotes)
                        // Papaparse might handle quotes automatically if properly formatted.
                        // Based on view_file: "-218.13" -> Papaparse should strip quotes.
                        const amount = parseFloat(amountStr?.replace(/,/g, '') || "0");

                        // Categorize
                        let category = "Uncategorized";
                        const lowerDesc = desc?.toLowerCase() || "";
                        for (const rule of rules) {
                            if (lowerDesc.includes(rule.keyword.toLowerCase())) {
                                category = rule.category;
                                break;
                            }
                        }

                        return {
                            id: `tx-${Date.now()}-${index}`, // Temporary ID generation
                            date: isoDate,
                            amount: amount,
                            description: desc || "Unknown",
                            category: category,
                            originalLine: JSON.stringify(row),
                        };
                    });
                    resolve(transactions);
                } catch (e) {
                    reject(e);
                }
            },
            error: (err) => {
                reject(err);
            },
        });
    });
};

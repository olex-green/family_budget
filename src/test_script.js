import fs from 'fs';

const data = JSON.parse(fs.readFileSync("src-tauri/data/budget_data.json", "utf8"));
console.log("Total transactions:", data.transactions.length);

const mainAccountTxs = data.transactions.filter(t => {
  if (!t.originalLine) return false;
  const match = t.originalLine.match(/StringRecord\(\[(.*)\]\)/);
  if (!match) return false;
  const parts = match[1].split(",").map(p => p.trim().replace(/^"/, "").replace(/"$/, ""));
  return parts.length >= 4 && parts[3] !== "";
});

console.log("Main account transactions:", mainAccountTxs.length);

const sumMain = mainAccountTxs.reduce((sum, t) => sum + t.amount, 0);
console.log("Sum of main account transactions (actual net change):", sumMain);

// Calculate total income and total expense for both
const totalIncome = data.transactions.reduce((sum, tx) => (tx.amount > 0 && tx.category !== 'Family Transfer') ? sum + tx.amount : sum, 0);
const totalExpense = data.transactions.reduce((sum, tx) => (tx.amount < 0 && tx.category !== 'Family Transfer') ? sum + Math.abs(tx.amount) : sum, 0);
console.log("totalIncome:", totalIncome);
console.log("totalExpense:", totalExpense);
console.log("netSavings:", totalIncome - totalExpense);
console.log("currentBalance (initialCapital + netSavings):", data.initialCapital + (totalIncome - totalExpense));

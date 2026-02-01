export const INCOME_CATEGORIES = [
  "Family Transfer",
  "Government & Tax",
  "Investment Income",
  "Other Income",
  "Refunds",
  "Salary",
  "Selling Items",
  "Transfers In",
  "Uncategorized"
];

export const EXPENSE_CATEGORIES = [
  "Eating Out",
  "Education",
  "Entertainment",
  "Family Transfer",
  "General",
  "Gifts & Donations",
  "Groceries",
  "Health",
  "Hobby",
  "Housing",
  "Investments",
  "Shopping",
  "Subscriptions",
  "Transportation",
  "Travel",
  "Uncategorized",
  "Utilities"
];

export const CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])].sort();

import React, { useState, useMemo } from 'react';
import { CATEGORIES } from '../constants';
import { format } from 'date-fns';

const Transactions = ({ data, onUpdateTransaction, onAddRule }) => {
  const { transactions, activeYear } = data;
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Generate Month Options based on activeYear
  const months = useMemo(() => {
    const ms = [];
    for (let i = 0; i < 12; i++) {
      // Create a date for the 15th of each month in activeYear to avoid timezone edge cases
      const d = new Date(activeYear, i, 15);
      ms.push({
        value: format(d, 'MM'),
        label: format(d, 'MMMM')
      });
    }
    return ms;
  }, [activeYear]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();

      // Should already be filtered by activeYear globally, but good to be safe or if global filter changes
      if (txYear !== parseInt(activeYear)) return false;

      // Month Filter
      if (selectedMonth !== 'All') {
        const txMonth = format(txDate, 'MM');
        if (txMonth !== selectedMonth) return false;
      }

      // Type Filter
      if (selectedType !== 'All') {
        if (selectedType === 'Income' && tx.amount < 0) return false;
        if (selectedType === 'Expense' && tx.amount >= 0) return false;
      }

      // Category Filter
      if (selectedCategory !== 'All') {
        const cat = tx.category || 'Uncategorized';
        if (cat !== selectedCategory) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date desc
  }, [transactions, activeYear, selectedMonth, selectedCategory, selectedType]);

  return (
    <div className="box">
      <h3 className="title is-5">Transactions</h3>

      {/* Filters */}
      <div className="columns mb-4">
        <div className="column is-3">
          <div className="field">
            <label className="label">Filter by Month</label>
            <div className="control">
              <div className="select is-fullwidth">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="All">All Months</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="column is-3">
          <div className="field">
            <label className="label">Filter by Type</label>
            <div className="control">
              <div className="select is-fullwidth">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="column is-3">
          <div className="field">
            <label className="label">Filter by Category</label>
            <div className="control">
              <div className="select is-fullwidth">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Uncategorized">Uncategorized</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className="has-text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="has-text-centered">No transactions found matching filters.</td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>
                    <div className="select is-small">
                      <select
                        value={tx.category || "Uncategorized"}
                        onChange={(e) => {
                          const newCategory = e.target.value;
                          if (onUpdateTransaction) {
                            onUpdateTransaction(tx.id, newCategory);
                          }

                          // Prompt for rule creation - reusing logic from Dashboard
                          setTimeout(() => {
                            if (window.confirm(`Create a rule to always categorize "${tx.description}" as "${newCategory}"?`)) {
                              const keyword = window.prompt("Enter keyword (e.g. 'Woolworths' or 'Uber'):", tx.description);
                              if (keyword && onAddRule) {
                                const ruleType = tx.amount >= 0 ? "income" : "expense";
                                onAddRule(keyword, newCategory, ruleType);
                              }
                            }
                          }, 200);
                        }}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>{tx.description}</td>
                  <td className={`has-text-right ${tx.amount >= 0 ? 'has-text-success' : 'has-text-danger'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="has-text-grey is-size-7 mt-2">
        Showing {filteredTransactions.length} transactions.
      </div>
    </div>
  );
};

export default Transactions;

import React, { useState, useMemo } from 'react';
import { CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';
import { format } from 'date-fns';
import { ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../utils';

const parseDateSafely = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
};

const Transactions = ({ data, onUpdateTransaction, onRemoveTransaction, onAddRule, onAddTransaction, isThin }) => {
  const { transactions, activeYear } = data;
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [editingId, setEditingId] = useState(null); // Track which manual transaction is being edited
  const [frozenOrder, setFrozenOrder] = useState([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAccount, setNewAccount] = useState('debit1');
  const [newCategory, setNewCategory] = useState('Uncategorized');
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState('expense');

  const handleOpenAddModal = () => {
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewAccount('debit1');
    setNewCategory('Uncategorized');
    setNewDescription('');
    setNewAmount('');
    setNewType('expense');
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = (e) => {
    if (e) e.preventDefault();
    if (!newDate || !newAccount || !newDescription || !newAmount) {
      alert("Please fill in all fields.");
      return;
    }
    const amt = parseFloat(newAmount);
    if (isNaN(amt)) {
      alert("Please enter a valid amount.");
      return;
    }
    const finalAmount = newType === 'expense' ? -Math.abs(amt) : Math.abs(amt);

    onAddTransaction({
      date: newDate,
      account: newAccount,
      category: newCategory,
      description: newDescription,
      amount: finalAmount
    });
    setIsAddModalOpen(false);
  };

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
      if (!tx.date) return false;
      const txYear = parseInt(tx.date.split('-')[0]);

      // Should already be filtered by activeYear globally, but good to be safe or if global filter changes
      if (txYear !== parseInt(activeYear)) return false;

      // Month Filter
      if (selectedMonth !== 'All') {
        const txMonth = format(parseDateSafely(tx.date), 'MM');
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
    });

    // Custom Sort Logic: If editing, freeze order based on snapshot
    if (editingId && frozenOrder.length > 0) {
      const orderMap = new Map(frozenOrder.map((id, i) => [id, i]));
      result.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : -1;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : -1;

        // If both in snapshot, conserve relative order
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;

        // If both new/unknown, sort by Date descending
        if (idxA === -1 && idxB === -1) return new Date(b.date) - new Date(a.date);

        // If one is new, put it at the top (index -1 comes before 0)
        if (idxA === -1) return -1;
        return 1;
      });
      return result;
    }

    return result.sort((a, b) => new Date(b.date) - new Date(a.date)); // Default Sort by date desc
  }, [transactions, activeYear, selectedMonth, selectedCategory, selectedType, editingId, frozenOrder]);

  return (
    <>
      <div className="box">
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
        <h3 className="title is-5 mb-0">Transactions</h3>
        {!isThin && (
          <button className="button is-primary is-small" onClick={handleOpenAddModal}>
            + Add Transaction
          </button>
        )}
      </div>

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
              <th>Account</th>
              <th>Category</th>
              <th>Description</th>
              <th className="has-text-right">Amount</th>
              {!isThin && <th className="has-text-centered">Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={isThin ? 5 : 6} className="has-text-centered">No transactions found matching filters.</td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={`
                    ${tx.category === 'Family Transfer' ? 'opacity-50' : ''} 
                    ${!tx.originalLine ? 'has-background-link-dark' : ''}
                  `}
                  title={tx.category === 'Family Transfer' ? 'Внутрішній переказ (не враховується в статистиці)' : (!tx.originalLine ? 'Manual Transaction' : '')}
                >
                  <td>
                    <div className={`is-flex is-align-items-center ${tx.category === 'Family Transfer' ? 'opacity-50 has-text-grey' : ''}`}>
                      {!tx.originalLine && editingId === tx.id ? (
                        <input
                          type="date"
                          className="input is-small"
                          value={tx.date}
                          onChange={(e) => onUpdateTransaction(tx.id, { date: e.target.value })}
                        />
                      ) : (
                        tx.date
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="is-flex is-align-items-center">
                      {!tx.originalLine && editingId === tx.id ? (
                        <input
                          type="text"
                          className="input is-small"
                          value={tx.account || 'debit1'}
                          onChange={(e) => onUpdateTransaction(tx.id, { account: e.target.value })}
                        />
                      ) : (
                        <span className="tag is-info is-light">
                          {tx.account || 'debit1'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {isThin ? (
                      <span className="tag is-primary is-light">
                        {tx.category || "Uncategorized"}
                      </span>
                    ) : (
                      <div className="select is-small">
                        <select
                          value={tx.category || "Uncategorized"}
                          onChange={(e) => {
                            const newCategory = e.target.value;
                            if (onUpdateTransaction) {
                              onUpdateTransaction(tx.id, { category: newCategory });
                            }

                            // Prompt for rule creation
                            setTimeout(() => {
                              if (window.confirm(`Create a rule to always categorize "${tx.description}" as "${newCategory}"?`)) {
                                const keyword = window.prompt("Enter keyword (e.g. 'Woolworths' or 'Uber'):", tx.description);
                                if (keyword && onAddRule) {
                                  // Default to "any" type for Family Transfers to catch both in/out
                                  const ruleType = newCategory === 'Family Transfer' ? "any" : (tx.amount >= 0 ? "income" : "expense");
                                  onAddRule(keyword, newCategory, ruleType);
                                }
                              }
                            }, 200);
                          }}
                        >
                          {(tx.amount > 0 ? INCOME_CATEGORIES : (tx.amount < 0 ? EXPENSE_CATEGORIES : CATEGORIES)).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>
                  <td className={`has-text-right ${tx.category === 'Family Transfer' ? 'opacity-50 has-text-grey' : ''}`}>
                    {!tx.originalLine && editingId === tx.id ? (
                      <input
                        type="text"
                        className="input is-small"
                        value={tx.description}
                        onChange={(e) => onUpdateTransaction(tx.id, { description: e.target.value })}
                      />
                    ) : (
                      tx.description
                    )}
                  </td>
                  <td className={`has-text-right ${tx.category === 'Family Transfer'
                    ? 'has-text-grey'
                    : (tx.amount >= 0 ? 'has-text-success' : 'has-text-danger')
                    }`}>
                    {!tx.originalLine && editingId === tx.id ? (
                      <input
                        type="number"
                        className="input is-small has-text-right"
                        value={tx.amount}
                        onChange={(e) => onUpdateTransaction(tx.id, { amount: parseFloat(e.target.value) || 0 })}
                      />
                    ) : (
                      <>{tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}</>
                    )}
                  </td>
                  {!isThin && (
                    <td className="has-text-centered">
                      <div className="is-flex is-justify-content-center is-align-items-center" style={{ gap: '0.5rem' }}>
                        {!tx.originalLine && (
                          <button
                            className={`button is-small ${editingId === tx.id ? 'is-success' : 'is-info is-light'}`}
                            onClick={() => {
                              if (editingId === tx.id) {
                                // Saving / Toggling Off
                                setEditingId(null);
                                setFrozenOrder([]);
                              } else {
                                // Starting Edit -> Freeze current view order
                                setEditingId(tx.id);
                                setFrozenOrder(filteredTransactions.map(t => t.id));
                              }
                            }}
                          >
                            {editingId === tx.id ? 'Save' : 'Edit'}
                          </button>
                        )}
                        <button
                          className="button is-small is-danger is-light"
                          onClick={() => {
                            if (onRemoveTransaction) {
                              onRemoveTransaction(tx.id);
                            }
                          }}
                          title="Delete Transaction"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table >
      </div >
      <div className="has-text-grey is-size-7 mt-2">
        Showing {filteredTransactions.length} transactions.
      </div>
    </div>

      {/* Add Transaction Modal */}
      <div className={`modal ${isAddModalOpen ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={() => setIsAddModalOpen(false)}></div>
        <div className="modal-card" style={{ maxWidth: '500px' }}>
          <header className="modal-card-head" style={{ borderBottom: 'none' }}>
            <p className="modal-card-title" style={{ fontWeight: '600' }}>Add New Transaction</p>
            <button className="delete" aria-label="close" onClick={() => setIsAddModalOpen(false)}></button>
          </header>
          <section className="modal-card-body" style={{ padding: '20px' }}>
            <div className="field">
              <label className="label">Date</label>
              <div className="control">
                <input
                  type="date"
                  className="input"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">Account</label>
              <div className="control">
                <input
                  type="text"
                  className="input"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  placeholder="e.g. debit1, credit1"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">Transaction Type</label>
              <div className="control">
                <div className="buttons has-addons">
                  <button
                    type="button"
                    className={`button is-flex-grow-1 ${newType === 'expense' ? 'is-danger is-selected' : 'is-outlined'}`}
                    onClick={() => setNewType('expense')}
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`button is-flex-grow-1 ${newType === 'income' ? 'is-success is-selected' : 'is-outlined'}`}
                    onClick={() => setNewType('income')}
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    Income
                  </button>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Amount</label>
              <div className="control">
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">Category</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Description</label>
              <div className="control">
                <input
                  type="text"
                  className="input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Salary, Grocery Store"
                  required
                />
              </div>
            </div>
          </section>
          <footer className="modal-card-foot" style={{ borderTop: 'none', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="button" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button className="button is-primary" onClick={handleModalSubmit}>Save Transaction</button>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Transactions;

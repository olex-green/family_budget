import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { CATEGORIES } from '../constants';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = ({ data, onUpdateTransaction, onAddRule }) => {
    const { transactions, initialCapital } = data;

    // -- Financial Summary & Prediction --

    const totalIncome = transactions.reduce((sum, tx) => tx.amount > 0 ? sum + tx.amount : sum, 0);
    const totalExpense = transactions.reduce((sum, tx) => tx.amount < 0 ? sum + Math.abs(tx.amount) : sum, 0);
    const netSavings = totalIncome - totalExpense;
    const currentBalance = initialCapital + netSavings;

    // Prediction Logic
    const uniqueMonths = new Set(transactions.map(tx => format(new Date(tx.date), 'yyyy-MM')));
    const monthsActiveCount = uniqueMonths.size || 1;
    const avgMonthlySavings = netSavings / monthsActiveCount;
    const predictedYearEnd = initialCapital + (avgMonthlySavings * 12);

    // -- Charts Data --

    // 1. Monthly Bar Chart (Income vs Expense)
    const monthlyDataMap = transactions.reduce((acc, tx) => {
        const month = format(new Date(tx.date), 'MMM yyyy');
        if (!acc[month]) {
            acc[month] = { name: month, income: 0, expense: 0 };
        }
        if (tx.amount > 0) {
            acc[month].income += tx.amount;
        } else {
            acc[month].expense += Math.abs(tx.amount);
        }
        return acc;
    }, {});

    const monthlyChartData = Object.values(monthlyDataMap).sort((a, b) =>
        new Date(a.name).getTime() - new Date(b.name).getTime()
    );

    // 2. Category Pie Chart (Expenses only)
    const categoryMap = transactions.reduce((acc, tx) => {
        if (tx.amount < 0) {
            const cat = tx.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount);
        }
        return acc;
    }, {});

    const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    return (
        <div>
            {/* Summary Cards */}
            <div className="columns is-multiline">
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading">Initial Capital</p>
                        <p className="title is-4">${initialCapital.toFixed(2)}</p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading">Current Balance</p>
                        <p className={`title is-4 ${currentBalance >= 0 ? 'has-text-success' : 'has-text-danger'}`}>
                            ${currentBalance.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading">Net Savings (YTD)</p>
                        <p className={`title is-4 ${netSavings >= 0 ? 'has-text-success' : 'has-text-danger'}`}>
                            ${netSavings.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered has-background-white-ter">
                        <p className="heading">Predicted Year End</p>
                        <p className="title is-4 has-text-info">${predictedYearEnd.toFixed(2)}</p>
                        <p className="is-size-7">Est. based on avg savings</p>
                    </div>
                </div>
            </div>

            <div className="columns">
                {/* Monthly Chart */}
                <div className="column is-8">
                    <div className="box">
                        <h3 className="title is-5">Monthly Income vs Expense</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={monthlyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="income" fill="#48c774" name="Income" />
                                    <Bar dataKey="expense" fill="#f14668" name="Expense" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Category Chart */}
                <div className="column is-4">
                    <div className="box">
                        <h3 className="title is-5">Expenses by Category</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={categoryChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="box">
                <h3 className="title is-5">Recent Transactions</h3>
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
                            {transactions.slice(0, 50).map((tx) => (
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

                                                    // Prompt for rule creation
                                                    // Use setTimeout to allow UI to update first, and avoid blocking immediate feedback
                                                    setTimeout(() => {
                                                        if (window.confirm(`Create a rule to always categorize "${tx.description}" as "${newCategory}"?`)) {
                                                            const keyword = window.prompt("Enter keyword (e.g. 'Woolworths' or 'Uber'):", tx.description);
                                                            if (keyword && onAddRule) {
                                                                onAddRule(keyword, newCategory);
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

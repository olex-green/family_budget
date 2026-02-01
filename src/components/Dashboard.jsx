import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '../utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard = ({ data }) => {
    const { transactions, initialCapital } = data;

    // -- Financial Summary & Prediction --

    const totalIncome = transactions.reduce((sum, tx) => (tx.amount > 0 && tx.category !== 'Family Transfer') ? sum + tx.amount : sum, 0);
    const totalExpense = transactions.reduce((sum, tx) => (tx.amount < 0 && tx.category !== 'Family Transfer') ? sum + Math.abs(tx.amount) : sum, 0);
    const netSavings = totalIncome - totalExpense;
    const currentBalance = initialCapital + netSavings;

    // Prediction Logic
    const uniqueMonths = new Set(transactions.map(tx => format(new Date(tx.date), 'yyyy-MM')));
    const monthsActiveCount = uniqueMonths.size || 1;
    const avgMonthlySavings = netSavings / monthsActiveCount;

    // Calculate remaining months in the year
    const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 11 = Dec
    const remainingMonths = 12 - (currentMonthIndex + 1);

    // Projection: Current Balance + (Average * Remaining Months)
    // If remaining months < 0 (e.g. looking at past year?), default to 0.
    const projectionFactor = Math.max(0, remainingMonths);
    const predictedYearEnd = currentBalance + (avgMonthlySavings * projectionFactor);

    // -- Charts Data --

    // 1. Monthly Bar Chart (Income vs Expense)
    const monthlyDataMap = transactions.reduce((acc, tx) => {
        const month = format(new Date(tx.date), 'MMM yyyy');
        if (!acc[month]) {
            acc[month] = { name: month, income: 0, expense: 0 };
        }
        if (tx.category === 'Family Transfer') return acc;
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
        if (tx.category === 'Family Transfer') return acc;
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
                        <p className="heading">Current Balance</p>
                        <p className="title is-4">{formatCurrency(currentBalance)}</p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading">Offset Account</p>
                        <p className="title is-4">{formatCurrency(initialCapital)}</p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading">Net Savings (YTD)</p>
                        <p className={`title is-4 ${netSavings >= 0 ? 'has-text-success' : 'has-text-danger'}`}>
                            {netSavings > 0 ? '+' : ''}{formatCurrency(netSavings)}
                        </p>
                    </div>
                </div>
                <div className="column is-3">
                    <div className="box has-text-centered">
                        <p className="heading" title="Est. based on avg savings">Predicted Year End (est.)</p>
                        <p className="title is-4 has-text-info">{formatCurrency(predictedYearEnd)}</p>
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
                                    <Legend />
                                    <Bar dataKey="income" fill="#48c774" name="Income">
                                        <LabelList dataKey="income" position="center" angle={-90} fill="white" style={{ fontWeight: 'bold' }} formatter={(val) => val > 0 ? formatCurrency(val) : ''} />
                                    </Bar>
                                    <Bar dataKey="expense" fill="#f14668" name="Expense">
                                        <LabelList dataKey="expense" position="center" angle={-90} fill="white" style={{ fontWeight: 'bold' }} formatter={(val) => val > 0 ? formatCurrency(val) : ''} />
                                    </Bar>
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


        </div>
    );
};

export default Dashboard;

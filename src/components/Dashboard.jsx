import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { format } from 'date-fns';
import { formatCurrency } from '../utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const parseDateSafely = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
};

const isInternalTransfer = (tx) => {
    if (tx.category === 'Family Transfer') return true;
    const desc = (tx.description || '').toLowerCase();
    return (
        desc.includes('payment received, thank you') ||
        desc.includes('transfer to xx3787') ||
        desc.includes('to offset') ||
        desc.includes('tkachuk')
    );
};

const formatCurrencyWhole = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
    }).format(Math.round(amount)).replace(/,/g, '\u00A0');
};

const Dashboard = ({ data }) => {
    const { transactions, initialCapital, activeYear } = data;

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [modalFilterYear, setModalFilterYear] = useState(activeYear ? activeYear.toString() : 'All');
    const [modalFilterMonth, setModalFilterMonth] = useState('All');

    const [dashboardYear, setDashboardYear] = useState(activeYear ? activeYear.toString() : new Date().getFullYear().toString());
    const [dashboardMonth, setDashboardMonth] = useState('All');

    useEffect(() => {
        if (activeYear) {
            setDashboardYear(activeYear.toString());
        }
    }, [activeYear]);

    const prevTxLengthRef = React.useRef(0);

    useEffect(() => {
        if (transactions && transactions.length > 0 && transactions.length !== prevTxLengthRef.current) {
            prevTxLengthRef.current = transactions.length;
            let latestDate = "";
            for (const tx of transactions) {
                if (tx.date && tx.date > latestDate) {
                    latestDate = tx.date;
                }
            }
            if (latestDate) {
                const d = parseDateSafely(latestDate);
                setDashboardYear(d.getFullYear().toString());
                setDashboardMonth((d.getMonth() + 1).toString().padStart(2, '0'));
            }
        }
    }, [transactions]);

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(tx => {
            if (!tx.date) return new Date().getFullYear();
            return parseDateSafely(tx.date).getFullYear();
        }));
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const handlePrevPeriod = () => {
        if (dashboardYear === 'All') {
            // If year is All, prev goes to the minimum available year
            if (availableYears.length > 0) {
                setDashboardYear(availableYears[availableYears.length - 1].toString());
            }
            return;
        }
        if (dashboardMonth === 'All') {
            const prevYear = parseInt(dashboardYear) - 1;
            setDashboardYear(prevYear.toString());
        } else {
            let m = parseInt(dashboardMonth);
            let y = parseInt(dashboardYear);
            m -= 1;
            if (m < 1) {
                m = 12;
                y -= 1;
            }
            setDashboardYear(y.toString());
            setDashboardMonth(m.toString().padStart(2, '0'));
        }
    };

    const handleNextPeriod = () => {
        if (dashboardYear === 'All') {
            if (availableYears.length > 0) {
                setDashboardYear(availableYears[0].toString());
            }
            return;
        }
        if (dashboardMonth === 'All') {
            const nextYear = parseInt(dashboardYear) + 1;
            setDashboardYear(nextYear.toString());
        } else {
            let m = parseInt(dashboardMonth);
            let y = parseInt(dashboardYear);
            m += 1;
            if (m > 12) {
                m = 1;
                y += 1;
            }
            setDashboardYear(y.toString());
            setDashboardMonth(m.toString().padStart(2, '0'));
        }
    };

    const toggleViewMode = () => {
        if (dashboardYear === 'All') {
            // Cannot toggle view mode when year is 'All' unless we pick a default year first
            const defaultYear = availableYears[0] || new Date().getFullYear();
            setDashboardYear(defaultYear.toString());
            const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
            setDashboardMonth(currentMonth);
            return;
        }
        if (dashboardMonth === 'All') {
            const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
            setDashboardMonth(currentMonth);
        } else {
            setDashboardMonth('All');
        }
    };

    const getPeriodLabel = () => {
        if (dashboardYear === 'All') {
            return "All Years";
        }
        if (dashboardMonth === 'All') {
            return `Full Year ${dashboardYear}`;
        }
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthIndex = parseInt(dashboardMonth) - 1;
        return `${monthNames[monthIndex]} ${dashboardYear}`;
    };

    // Filter transactions for the selected dashboard year & month
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (!tx.date) return false;
            const d = parseDateSafely(tx.date);
            const yearStr = d.getFullYear().toString();
            const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');

            if (dashboardYear !== 'All' && yearStr !== dashboardYear) return false;
            if (dashboardMonth !== 'All' && monthStr !== dashboardMonth) return false;
            return true;
        });
    }, [transactions, dashboardYear, dashboardMonth]);

    // Filtered transactions for the selected year (ignoring month filter for the monthly chart)
    const transactionsForYear = useMemo(() => {
        return transactions.filter(tx => {
            if (!tx.date) return false;
            const d = parseDateSafely(tx.date);
            const yearStr = d.getFullYear().toString();
            if (dashboardYear !== 'All' && yearStr !== dashboardYear) return false;
            return true;
        });
    }, [transactions, dashboardYear]);

    const modalCategoryData = useMemo(() => {
        const filtered = transactions.filter(tx => {
            if (isInternalTransfer(tx) || tx.amount >= 0) return false;
            if (!tx.date) return false;
            const d = parseDateSafely(tx.date);
            const yearStr = d.getFullYear().toString();
            if (modalFilterYear !== 'All' && yearStr !== modalFilterYear) return false;
            if (modalFilterMonth !== 'All' && d.getMonth().toString() !== modalFilterMonth) return false;
            return true;
        });

        const catMap = filtered.reduce((acc, tx) => {
            const cat = tx.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount);
            return acc;
        }, {});

        return Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    }, [transactions, modalFilterYear, modalFilterMonth]);

    // -- Financial Summary & Prediction --

    const totalIncome = filteredTransactions.reduce((sum, tx) => (tx.amount > 0 && !isInternalTransfer(tx)) ? sum + tx.amount : sum, 0);
    const totalExpense = filteredTransactions.reduce((sum, tx) => (tx.amount < 0 && !isInternalTransfer(tx)) ? sum + Math.abs(tx.amount) : sum, 0);
    const netSavings = totalIncome - totalExpense;
    
    // Group and calculate balances for each imported account based on ALL transactions in database
    const accountBalancesBreakdown = useMemo(() => {
        const accountsMap = {};
        for (const tx of transactions) {
            const accountName = tx.account || "Other";
            if (!accountsMap[accountName]) {
                accountsMap[accountName] = [];
            }
            accountsMap[accountName].push(tx);
        }

        const breakdown = [];
        let totalImportedBalance = 0;

        for (const [accountName, txs] of Object.entries(accountsMap)) {
            // Sort chronologically (oldest to newest) preserving original DB insertion order for same-day transactions.
            // Since the database loads transactions in insertion order (which is newest-to-oldest in standard imports),
            // a higher index in the loaded array represents an older transaction of the same day.
            const txsWithOriginalIndex = txs.map((t, idx) => ({
                tx: t,
                originalIndex: idx
            }));

            txsWithOriginalIndex.sort((a, b) => {
                const dateA = parseDateSafely(a.tx.date);
                const dateB = parseDateSafely(b.tx.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB;
                }
                return b.originalIndex - a.originalIndex;
            });

            const sortedTxs = txsWithOriginalIndex.map(item => item.tx);
            
            // Find the latest transaction (by date) with an ending balance reference
            let latestWithBalance = null;
            let latestIndex = -1;
            for (let i = sortedTxs.length - 1; i >= 0; i--) {
                if (sortedTxs[i].endingBalance !== undefined && sortedTxs[i].endingBalance !== null) {
                    latestWithBalance = sortedTxs[i];
                    latestIndex = i;
                    break;
                }
            }

            let currentBal = 0;
            let hasReference = false;

            if (latestWithBalance !== null) {
                currentBal = latestWithBalance.endingBalance;
                hasReference = true;
                // Add all transactions after the latest reference point
                for (let i = latestIndex + 1; i < sortedTxs.length; i++) {
                    currentBal += sortedTxs[i].amount;
                }
            } else {
                currentBal = sortedTxs.reduce((sum, tx) => sum + tx.amount, 0);
            }

            breakdown.push({
                name: accountName,
                balance: currentBal,
                hasReference
            });
            totalImportedBalance += currentBal;
        }

        return {
            breakdown,
            totalImportedBalance
        };
    }, [transactions]);

    // Calculate the balances as of the end of the selected dashboard Year/Month
    const targetBalancesBreakdown = useMemo(() => {
        const actualBreakdown = accountBalancesBreakdown.breakdown;
        
        // If year is All, target balances are simply the actual current balances
        if (dashboardYear === 'All') {
            return accountBalancesBreakdown;
        }

        const targetYearNum = parseInt(dashboardYear);
        const targetMonthNum = dashboardMonth !== 'All' ? parseInt(dashboardMonth) : 12;

        // Group adjustments (sum of transaction amounts after target date) by account
        const adjustmentMap = {};
        for (const tx of transactions) {
            if (!tx.date) continue;
            const d = parseDateSafely(tx.date);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;

            // Transaction is after target date if y > targetYearNum or (y === targetYearNum && m > targetMonthNum)
            const isAfterTarget = (y > targetYearNum) || (y === targetYearNum && m > targetMonthNum);
            if (isAfterTarget) {
                const accountName = tx.account || "Other";
                adjustmentMap[accountName] = (adjustmentMap[accountName] || 0) + tx.amount;
            }
        }

        let totalTargetImported = 0;
        const breakdown = actualBreakdown.map(acc => {
            const adjustment = adjustmentMap[acc.name] || 0;
            const targetBal = acc.balance - adjustment;
            totalTargetImported += targetBal;
            return {
                ...acc,
                balance: targetBal
            };
        });

        return {
            breakdown,
            totalImportedBalance: totalTargetImported
        };
    }, [accountBalancesBreakdown, transactions, dashboardYear, dashboardMonth]);

    // Current Balance is Offset Account Balance + total balances of all imported accounts as of target date
    const currentBalance = initialCapital + targetBalancesBreakdown.totalImportedBalance;

    // Prediction Logic: Use the currently selected period's Net Savings (or average monthly savings if "All" months is selected)
    const uniqueMonths = new Set(filteredTransactions.map(tx => format(parseDateSafely(tx.date), 'yyyy-MM')));
    const monthsActiveCount = uniqueMonths.size || 1;
    const savingsRate = dashboardMonth !== 'All' ? netSavings : (netSavings / monthsActiveCount);

    // Calculate remaining months in the year based on selected filter
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 11 = Dec
    
    let remainingMonths = 0;
    if (dashboardYear !== 'All') {
        const targetYearNum = parseInt(dashboardYear);
        if (targetYearNum === currentYear) {
            // For current year, remaining months are to the end of the year from the selected month (or current month if All Months selected)
            const referenceMonth = dashboardMonth !== 'All' ? parseInt(dashboardMonth) - 1 : currentMonthIndex;
            remainingMonths = 12 - (referenceMonth + 1);
        } else if (targetYearNum < currentYear) {
            // For past years, there are 0 remaining months
            remainingMonths = 0;
        } else {
            // For future years (if any), assume full 12 months
            remainingMonths = 12;
        }
    }

    // Projection: Current Balance + (Savings Rate * Remaining Months)
    const projectionFactor = Math.max(0, remainingMonths);
    const predictedYearEnd = currentBalance + (savingsRate * projectionFactor);

    // -- Charts Data --

    // 1. Monthly Bar Chart (Income vs Expense)
    const monthlyDataMap = transactionsForYear.reduce((acc, tx) => {
        const d = parseDateSafely(tx.date);
        const monthKey = format(d, 'yyyy-MM');
        const monthName = format(d, 'MMM yyyy');
        if (!acc[monthKey]) {
            acc[monthKey] = { name: monthName, key: monthKey, income: 0, expense: 0 };
        }
        if (isInternalTransfer(tx)) return acc;
        if (tx.amount > 0) {
            acc[monthKey].income += tx.amount;
        } else {
            acc[monthKey].expense += Math.abs(tx.amount);
        }
        return acc;
    }, {});

    const monthlyChartData = Object.values(monthlyDataMap).sort((a, b) =>
        a.key.localeCompare(b.key)
    );

    // 2. Category Pie Chart (Expenses only)
    const categoryMap = filteredTransactions.reduce((acc, tx) => {
        if (isInternalTransfer(tx)) return acc;
        if (tx.amount < 0) {
            const cat = tx.category || 'Uncategorized';
            acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount);
        }
        return acc;
    }, {});

    const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    return (
        <div>
            {/* Filter Bar */}
            <div className="box mb-4">
                <div className="is-flex is-justify-content-between is-align-items-center">
                    <div>
                        <h2 className="title is-4 mb-0">Financial Dashboard</h2>
                    </div>
                    <div className="is-flex is-align-items-center" style={{ gap: '1rem' }}>
                        <div className="buttons has-addons mb-0">
                            <button className="button is-small is-info is-outlined" onClick={handlePrevPeriod}>
                                &larr; Back
                            </button>
                            <button className="button is-small is-static" style={{ fontWeight: '600', minWidth: '150px' }}>
                                {getPeriodLabel()}
                            </button>
                            <button className="button is-small is-info is-outlined" onClick={handleNextPeriod}>
                                Forward &rarr;
                            </button>
                        </div>
                        <button className="button is-small is-primary" onClick={toggleViewMode}>
                            {dashboardMonth === 'All' ? 'View Monthly' : 'View Full Year'}
                        </button>
                        {dashboardYear !== 'All' && (
                            <button className="button is-small is-danger is-outlined" onClick={() => {
                                setDashboardYear('All');
                                setDashboardMonth('All');
                            }}>
                                Show All Years
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="columns is-multiline">
                <div className="column is-4">
                    <div className="box has-text-centered">
                        <p className="heading">Current Balance</p>
                        <p className="title is-4">{formatCurrency(currentBalance)}</p>
                    </div>
                </div>
                <div className="column is-4">
                    <div className="box has-text-centered">
                        <p className="heading">Net Savings (YTD)</p>
                        <p className={`title is-4 ${netSavings >= 0 ? 'has-text-success' : 'has-text-danger'}`}>
                            {netSavings > 0 ? '+' : ''}{formatCurrency(netSavings)}
                        </p>
                    </div>
                </div>
                <div className="column is-4">
                    <div className="box has-text-centered">
                        <p className="heading" title="Est. based on avg savings">Predicted Year End (est.)</p>
                        <p className="title is-4 has-text-info">{formatCurrency(predictedYearEnd)}</p>
                    </div>
                </div>
            </div>

            {/* Account Balances Breakdown */}
            <div className="box mb-5">
                <h4 className="title is-5 mb-4">Account Balances</h4>
                <div className="columns is-multiline">
                    <div className="column is-3">
                        <div className="card" style={{ borderTop: "4px solid #3273dc", borderRadius: "6px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                            <div className="card-content p-3 has-text-centered">
                                <p className="heading has-text-grey-light mb-1">Offset Account</p>
                                <p className="title is-5 mb-2">{formatCurrency(initialCapital)}</p>
                                <span className="tag is-info is-light is-small">Manual</span>
                            </div>
                        </div>
                    </div>
                    {targetBalancesBreakdown.breakdown.map((acc, idx) => (
                        <div className="column is-3" key={idx}>
                            <div className="card" style={{ 
                                borderTop: acc.balance < 0 ? "4px solid #f14668" : "4px solid #48c774",
                                borderRadius: "6px",
                                boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                            }}>
                                <div className="card-content p-3 has-text-centered">
                                    <p className="heading has-text-grey-light mb-1" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={acc.name}>
                                        {acc.name}
                                    </p>
                                    <p className={`title is-5 mb-2 ${acc.balance < 0 ? 'has-text-danger' : 'has-text-success'}`}>
                                        {formatCurrency(acc.balance)}
                                    </p>
                                    <span className={`tag is-small ${acc.hasReference ? 'is-success is-light' : 'is-light'}`}>
                                        {acc.hasReference ? 'Ending Balance' : 'Sum of Txs'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="columns">
                {/* Monthly Chart */}
                <div className="column is-8">
                    <div className="box">
                        <h3 className="title is-5">Monthly Income vs Expense</h3>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={monthlyChartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Legend />
                                    <Bar dataKey="income" fill="#48c774" name="Income">
                                        <LabelList dataKey="income" position="top" fill="#48c774" style={{ fontWeight: 'bold', fontSize: '13px' }} offset={8} formatter={(val) => val > 0 ? formatCurrencyWhole(val) : ''} />
                                    </Bar>
                                    <Bar dataKey="expense" fill="#f14668" name="Expense">
                                        <LabelList dataKey="expense" position="top" fill="#f14668" style={{ fontWeight: 'bold', fontSize: '13px' }} offset={8} formatter={(val) => val > 0 ? formatCurrencyWhole(val) : ''} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Category Chart */}
                <div className="column is-4">
                    <div className="box">
                        <h3 className="title is-5">
                            <a href="#" onClick={(e) => { e.preventDefault(); setIsCategoryModalOpen(true); }}>Expenses by Category</a>
                        </h3>
                        <div style={{ width: '100%', height: 350 }}>
                            {categoryChartData.length === 0 ? (
                                <div className="is-flex is-justify-content-center is-align-items-center" style={{ height: '100%' }}>
                                    <p className="has-text-grey is-italic">No data for selected period</p>
                                </div>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart
                                        data={[...categoryChartData].sort((a, b) => b.value - a.value)}
                                        layout="vertical"
                                        margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                                    >
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={100}
                                            tick={{ fill: '#cbd5e1', fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
                                        />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Bar dataKey="value" fill="#38bdf8" radius={[0, 4, 4, 0]} name="Expenses">
                                            <LabelList
                                                dataKey="value"
                                                position="right"
                                                fill="#cbd5e1"
                                                style={{ fontSize: '11px', fontWeight: '500' }}
                                                formatter={(val) => formatCurrencyWhole(val)}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Category Details Modal */}
            <div className={`modal ${isCategoryModalOpen ? 'is-active' : ''}`}>
                <div className="modal-background" onClick={() => setIsCategoryModalOpen(false)}></div>
                <div className="modal-card">
                    <header className="modal-card-head">
                        <p className="modal-card-title">Expenses by Category</p>
                        <button className="delete" aria-label="close" onClick={() => setIsCategoryModalOpen(false)}></button>
                    </header>
                    <section className="modal-card-body">
                        <div className="field is-grouped is-grouped-multiline mb-4">
                            <div className="control">
                                <div className="select">
                                    <select value={modalFilterYear} onChange={(e) => setModalFilterYear(e.target.value)}>
                                        <option value="All">All Years</option>
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="control">
                                <div className="select">
                                    <select value={modalFilterMonth} onChange={(e) => setModalFilterMonth(e.target.value)}>
                                        <option value="All">All Months</option>
                                        <option value="0">January</option>
                                        <option value="1">February</option>
                                        <option value="2">March</option>
                                        <option value="3">April</option>
                                        <option value="4">May</option>
                                        <option value="5">June</option>
                                        <option value="6">July</option>
                                        <option value="7">August</option>
                                        <option value="8">September</option>
                                        <option value="9">October</option>
                                        <option value="10">November</option>
                                        <option value="11">December</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <table className="table is-fullwidth is-striped is-hoverable">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th className="has-text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modalCategoryData.map(([cat, amount]) => (
                                    <tr key={cat}>
                                        <td>{cat}</td>
                                        <td className="has-text-right">{formatCurrency(amount)}</td>
                                    </tr>
                                ))}
                                {modalCategoryData.length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="has-text-centered is-italic">No expenses found for selected period.</td>
                                    </tr>
                                )}
                            </tbody>
                            {modalCategoryData.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <th>Total</th>
                                        <th className="has-text-right">
                                            {formatCurrency(modalCategoryData.reduce((sum, [_, amt]) => sum + amt, 0))}
                                        </th>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </section>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;

import React, { useState } from 'react';
import { CATEGORIES } from '../constants';

const Settings = ({ data, onUpdate }) => {
    const { initialCapital, categoryRules, activeYear, transactions } = data;
    const [capital, setCapital] = useState(initialCapital.toString());
    const [year, setYear] = useState(activeYear.toString());
    const [newRuleKeyword, setNewRuleKeyword] = useState("");
    const [newRuleCategory, setNewRuleCategory] = useState("");
    const [newRuleType, setNewRuleType] = useState("any");
    const [filterType, setFilterType] = useState("all");

    const handleSaveCapital = () => {
        const val = parseFloat(capital);
        if (!isNaN(val)) {
            onUpdate({ ...data, initialCapital: val });
        }
    };

    const handleSaveYear = () => {
        const val = parseInt(year);
        if (!isNaN(val)) {
            onUpdate({ ...data, activeYear: val });
        }
    };

    const handleAddRule = () => {
        if (!newRuleKeyword || !newRuleCategory) return;
        const newRule = {
            id: Date.now().toString(),
            keyword: newRuleKeyword,
            category: newRuleCategory,
            ruleType: newRuleType
        };
        onUpdate({
            ...data,
            categoryRules: [...categoryRules, newRule]
        });
        setNewRuleKeyword("");
        setNewRuleCategory("");
        setNewRuleType("any");
    };

    const handleDeleteRule = (id) => {
        onUpdate({
            ...data,
            categoryRules: categoryRules.filter(r => r.id !== id)
        });
    };

    return (
        <div className="container">
            <div className="box">
                <h3 className="title is-4">General Settings</h3>

                <div className="field">
                    <label className="label">Active Year (Read-only mode for others)</label>
                    <div className="control is-flex">
                        <input
                            className="input"
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        />
                        <button className="button is-primary ml-2" onClick={handleSaveYear}>Set Year</button>
                    </div>
                </div>

                <div className="field">
                    <label className="label">Offset Account Balance</label>
                    <div className="control is-flex">
                        <input
                            className="input"
                            type="number"
                            value={capital}
                            onChange={(e) => setCapital(e.target.value)}
                        />
                        <button className="button is-primary ml-2" onClick={handleSaveCapital}>Save</button>
                    </div>
                </div>

            </div>

            <div className="box">
                <h3 className="title is-4">Categorization Rules</h3>
                <p className="subtitle is-6">Automatically categorize transactions if description contains keyword.</p>

                <div className="tabs is-boxed is-small mb-3">
                    <ul>
                        <li className={filterType === 'all' ? 'is-active' : ''}>
                            <a onClick={() => setFilterType('all')}>All</a>
                        </li>
                        <li className={filterType === 'income' ? 'is-active' : ''}>
                            <a onClick={() => setFilterType('income')}>Income</a>
                        </li>
                        <li className={filterType === 'expense' ? 'is-active' : ''}>
                            <a onClick={() => setFilterType('expense')}>Expense</a>
                        </li>
                    </ul>
                </div>

                <table className="table is-fullwidth is-striped">
                    <thead>
                        <tr>
                            <th>Keyword</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryRules
                            .filter(rule => filterType === 'all' || (rule.ruleType || 'any') === filterType)
                            .map(rule => (
                                <tr key={rule.id}>
                                    <td>{rule.keyword}</td>
                                    <td>
                                        <span className={`tag ${rule.ruleType === 'income' ? 'is-success' : rule.ruleType === 'expense' ? 'is-danger' : 'is-light'}`}>
                                            {rule.ruleType || 'any'}
                                        </span>
                                    </td>
                                    <td><span className="tag is-info is-light">{rule.category}</span></td>
                                    <td>
                                        <button className="button is-small is-danger is-light" onClick={() => handleDeleteRule(rule.id)}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        {categoryRules.filter(rule => filterType === 'all' || (rule.ruleType || 'any') === filterType).length === 0 && (
                            <tr>
                                <td colSpan="4" className="has-text-centered has-text-grey">
                                    No rules found for this filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="field is-grouped">
                    <div className="control is-expanded">
                        <input
                            className="input"
                            type="text"
                            placeholder="Keyword (e.g. 'UBER')"
                            value={newRuleKeyword}
                            onChange={(e) => setNewRuleKeyword(e.target.value)}
                        />
                    </div>
                    <div className="control">
                        <div className="select">
                            <select
                                value={newRuleType}
                                onChange={(e) => setNewRuleType(e.target.value)}
                            >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                    </div>
                    <div className="control is-expanded">
                        <div className="select is-fullwidth">
                            <select
                                value={newRuleCategory}
                                onChange={(e) => setNewRuleCategory(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="control">
                        <button className="button is-link" onClick={handleAddRule}>
                            Add Rule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

import React, { useState } from 'react';
import { CATEGORIES } from '../constants';

const Settings = ({ data, onUpdate }) => {
    const { initialCapital, categoryRules, activeYear } = data;
    const [capital, setCapital] = useState(initialCapital.toString());
    const [year, setYear] = useState(activeYear.toString());
    const [newRuleKeyword, setNewRuleKeyword] = useState("");
    const [newRuleCategory, setNewRuleCategory] = useState("");

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
            category: newRuleCategory
        };
        onUpdate({
            ...data,
            categoryRules: [...categoryRules, newRule]
        });
        setNewRuleKeyword("");
        setNewRuleCategory("");
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
                    <label className="label">Initial Capital / Starting Balance</label>
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

                <table className="table is-fullwidth is-striped">
                    <thead>
                        <tr>
                            <th>Keyword</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categoryRules.map(rule => (
                            <tr key={rule.id}>
                                <td>{rule.keyword}</td>
                                <td><span className="tag is-info is-light">{rule.category}</span></td>
                                <td>
                                    <button className="button is-small is-danger is-light" onClick={() => handleDeleteRule(rule.id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
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

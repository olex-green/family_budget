import React, { useState } from 'react';
import { AppData, CategoryRule } from '../lib/types';

interface SettingsProps {
    data: AppData;
    onUpdate: (newData: AppData) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, onUpdate }) => {
    const [initialCapital, setInitialCapital] = useState(data.initialCapital);
    const [rules, setRules] = useState<CategoryRule[]>(data.categoryRules);
    const [newKeyword, setNewKeyword] = useState('');
    const [newCategory, setNewCategory] = useState('');

    const handleSaveCapital = () => {
        onUpdate({ ...data, initialCapital });
    };

    const handleAddRule = () => {
        if (!newKeyword || !newCategory) return;
        const newRule: CategoryRule = {
            id: Date.now().toString(),
            keyword: newKeyword,
            category: newCategory,
        };
        const updatedRules = [...rules, newRule];
        setRules(updatedRules);
        setNewKeyword('');
        setNewCategory('');
        onUpdate({ ...data, categoryRules: updatedRules });
    };

    const handleDeleteRule = (id: string) => {
        const updatedRules = rules.filter(r => r.id !== id);
        setRules(updatedRules);
        onUpdate({ ...data, categoryRules: updatedRules });
    };

    return (
        <div className="container">
            <div className="box">
                <h3 className="title is-4">Financial Settings</h3>
                <div className="field">
                    <label className="label">Initial Capital at Start of Year</label>
                    <div className="control is-flex">
                        <input
                            className="input"
                            type="number"
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                            style={{ marginRight: '1rem' }}
                        />
                        <button className="button is-primary" onClick={handleSaveCapital}>Save</button>
                    </div>
                </div>
            </div>

            <div className="box">
                <h3 className="title is-4">Categorization Rules</h3>
                <p className="subtitle is-6">Transactions containing the keyword will be assigned the category.</p>

                <div className="field is-grouped">
                    <div className="control is-expanded">
                        <input
                            className="input"
                            type="text"
                            placeholder="Keyword (e.g., Woolworths)"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                        />
                    </div>
                    <div className="control is-expanded">
                        <input
                            className="input"
                            type="text"
                            placeholder="Category (e.g., Groceries)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                    </div>
                    <div className="control">
                        <button className="button is-info" onClick={handleAddRule}>Add Rule</button>
                    </div>
                </div>

                <table className="table is-fullwidth is-striped">
                    <thead>
                        <tr>
                            <th>Keyword</th>
                            <th>Category</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rules.map(rule => (
                            <tr key={rule.id}>
                                <td>{rule.keyword}</td>
                                <td>{rule.category}</td>
                                <td>
                                    <button className="button is-small is-danger" onClick={() => handleDeleteRule(rule.id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Settings;

import React, { useState } from 'react';
import { api } from '../lib/api';
import { CATEGORIES } from '../constants';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const Import = ({ onImport, onClearMonth, onAutoCategorize, rules, activeYear }) => {
    // Default to current month index (0-11)
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleAutoCategorize = async () => {
        if (!onImport) return; // Should probably update state directly or inform parent?
        // Actually, Import typically passes data up. But here we might want to modify *staged* data if we had it.
        // But Import.jsx just imports. 
        // Logic: Import -> Filtered -> `onImport` (which is `handleImport` in App.jsx).
        // `handleImport` adds to `data`.
        // So Auto-Categorize should probably run on *existing* data in Dashboard or *during* Import?
        // The prompt says "Auto-Categorize button in Import".
        // Use case: I upload file -> It parses -> I see results (wait, Import just dumps to DB/App State).
        // Current flow: Upload -> Parse -> Save immediately.

        // If the user wants to categorize *existing* data, it should be in Dashboard or a separate tool.
        // If "Import" tab implies "Process Data", maybe we should allow categorizing *before* saving?
        // But currently `handleUpload` does `api.saveData` immediately in `App.jsx`.

        // Let's assume the user wants to categorize *Uncategorized* transactions that are already imported (or just about to be).
        // Since `Import.jsx` doesn't hold state of *all* transactions, maybe we should move this button to Dashboard or allow it here to run on *all* uncategorized in DB?
        // Or change Import flow to: Preview -> Categorize -> Save.
        // Given existing flow, I'll implement "Categorize All Uncategorized" which runs on `activeYear`.
        // User clicks -> We fetch all (via parent prop or just assume we have them? Import doesn't have them passed except rules).

        // Wait, `Import.jsx` receives `rules`. It doesn't receive `transactions`.
        // `App.jsx` passes `activeYear`.
        // I need to ask `App.jsx` to do it.
        // I'll add `onAutoCategorize` prop to `Import`.
        if (onAutoCategorize) onAutoCategorize();
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const text = await file.text();
            let transactions = await api.parseCSV(text, rules);

            // Filter by activeYear ONLY (User requested to remove month selector for import)
            const targetPrefix = `${activeYear}-`;
            const filtered = transactions.filter(tx => tx.date.startsWith(targetPrefix));

            if (filtered.length === 0) {
                setError(`No transactions found for ${activeYear}. Found ${transactions.length} total.`);
                return;
            }

            if (filtered.length < transactions.length) {
                console.log(`Filtered ${transactions.length - filtered.length} transactions outside of ${activeYear}`);
            }

            // Auto-Classify Uncategorized transactions
            onImport(filtered);
            setFile(null);
        } catch (err) {
            setError("Failed to parse CSV: " + err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="box">
            <h3 className="title is-4">Import Bank Statement</h3>

            <div className="notification is-info is-light">
                Active Year: <strong>{activeYear}</strong>
            </div>

            <div className="field">
                <div className="file has-name is-boxed is-primary">
                    <label className="file-label">
                        <input
                            className="file-input"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            key={file ? file.name : 'reset'}
                        />
                        <span className="file-cta">
                            <span className="file-icon">
                                <i className="fas fa-upload"></i>
                            </span>
                            <span className="file-label">
                                Choose CSV file…
                            </span>
                        </span>
                        {file && (
                            <span className="file-name">
                                {file.name}
                            </span>
                        )}
                    </label>
                </div>
            </div>

            {error && <div className="notification is-danger">{error}</div>}

            <div className="field">
                <button
                    className={`button is-primary ${loading ? 'is-loading' : ''}`}
                    onClick={handleUpload}
                    disabled={!file}
                >
                    Import & Analyze (with AI)
                </button>
            </div>

            <hr />

            <div className="field">
                <label className="label">Clear Monthly Data</label>
                <div className="field has-addons">
                    <div className="control">
                        <div className="select">
                            <select
                                value={selectedMonthIndex}
                                onChange={(e) => setSelectedMonthIndex(parseInt(e.target.value))}
                            >
                                {MONTHS.map((m, index) => (
                                    <option key={m} value={index}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="control">
                        <button
                            className="button is-danger is-light"
                            onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ALL data for ${MONTHS[selectedMonthIndex]} ${activeYear}? This cannot be undone.`)) {
                                    onClearMonth(selectedMonthIndex);
                                }
                            }}
                        >
                            Delete {MONTHS[selectedMonthIndex]}
                        </button>
                    </div>
                </div>
                <p className="help is-danger">
                    Permanently deletes all transactions for the selected month in the active year.
                </p>
            </div>
        </div>
    );
};

export default Import;

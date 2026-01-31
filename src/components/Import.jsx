import React, { useState } from 'react';
import { api } from '../lib/api';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const Import = ({ onImport, onClearMonth, rules, activeYear }) => {
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

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const text = await file.text();
            let transactions = await api.parseCSV(text, rules);

            // Filter by activeYear and selectedMonth
            // Transaction date format from Rust is YYYY-MM-DD
            // Construct target prefix: "YYYY-MM"
            const monthStr = (selectedMonthIndex + 1).toString().padStart(2, '0');
            const targetPrefix = `${activeYear}-${monthStr}`;

            const filtered = transactions.filter(tx => tx.date.startsWith(targetPrefix));

            if (filtered.length === 0) {
                setError(`No transactions found for ${MONTHS[selectedMonthIndex]} ${activeYear}. Found ${transactions.length} total.`);
                return;
            }

            if (filtered.length < transactions.length) {
                console.log(`Filtered ${transactions.length - filtered.length} transactions outside of ${targetPrefix}`);
            }

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
                <label className="label">Select Month</label>
                <div className="control">
                    <div className="select is-fullwidth">
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
                    Import & Analyze
                </button>
            </div>

            <hr />

            <div className="field">
                <button
                    className="button is-danger is-light"
                    onClick={() => {
                        if (window.confirm(`Are you sure you want to delete ALL data for ${MONTHS[selectedMonthIndex]} ${activeYear}? This cannot be undone.`)) {
                            onClearMonth(selectedMonthIndex);
                        }
                    }}
                >
                    Clear Data for {MONTHS[selectedMonthIndex]} {activeYear}
                </button>
                <p className="help is-danger">
                    Permanently deletes all transactions for the selected month in the active year.
                </p>
            </div>
        </div>
    );
};

export default Import;

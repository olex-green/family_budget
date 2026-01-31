import React, { useState } from 'react';
import { parseCSV } from '../lib/csvParser';
import { Transaction, CategoryRule } from '../lib/types';

interface ImportProps {
    onImport: (data: Transaction[]) => void;
    rules: CategoryRule[];
}

const Import: React.FC<ImportProps> = ({ onImport, rules }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const transactions = await parseCSV(file, rules);
            onImport(transactions);
        } catch (err: any) {
            setError("Failed to parse CSV: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="box">
            <h3 className="title is-4">Import Bank Statement</h3>
            <div className="field">
                <div className="file has-name is-boxed is-primary">
                    <label className="file-label">
                        <input
                            className="file-input"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
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
        </div>
    );
};

export default Import;

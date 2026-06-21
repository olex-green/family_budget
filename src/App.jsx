import React, { useState, useEffect, useRef } from "react";
import { api } from "./lib/api";
import Dashboard from "./components/Dashboard";
import Import from "./components/Import";
import Settings from "./components/Settings";
import Transactions from "./components/Transactions";
import { Layers, Upload, Wallet, Settings as SettingsIcon, List } from "lucide-react";

function App() {
  const isThin = import.meta.env.VITE_APP_MODE === 'thin';
  const fileInputRef = useRef(null);

  const [data, setData] = useState({
    transactions: [],
    lastUpdated: "",
    initialCapital: 0,
    categoryRules: [],
    activeYear: new Date().getFullYear() // Default
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.loadData().then((loadedData) => {
      setData(loadedData);
      setLoading(false);
    });
  }, []);

  const handleSyncFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Simple validation
        if (!importedData || !Array.isArray(importedData.transactions)) {
          alert("Invalid file format. Please upload a valid sync file.");
          return;
        }

        // Save imported data to DB
        await api.saveData(importedData);
        setData(importedData);
        alert(`Successfully synchronized ${importedData.transactions.length} transactions!`);
      } catch (err) {
        console.error(err);
        alert("Error parsing sync file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset to allow importing same file again
  };

  const handleImport = async (newTransactions) => {
    // Simple verification based on content, avoiding duplicate imports
    const existingStrings = new Set(data.transactions.map(t => `${t.date}|${t.amount}|${t.description}|${t.account || ''}`));
    const seenInBatch = new Set();

    const uniqueNew = newTransactions.filter(t => {
      const key = `${t.date}|${t.amount}|${t.description}|${t.account || ''}`;
      if (existingStrings.has(key) || seenInBatch.has(key)) {
        return false;
      }
      seenInBatch.add(key);
      return true;
    });

    if (uniqueNew.length === 0) {
      alert("No new unique transactions found.");
      return;
    }

    const updatedData = {
      ...data,
      transactions: [...data.transactions, ...uniqueNew],
      lastUpdated: new Date().toISOString(),
    };

    await api.saveData(updatedData);
    setData(updatedData);
    setActiveTab("dashboard");
    alert(`Imported ${uniqueNew.length} transactions.`);
  };

  const handleClearMonth = async (monthIndex) => {
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    const targetPrefix = `${data.activeYear}-${monthStr}`;

    const filteredTransactions = data.transactions.filter(t => !t.date.startsWith(targetPrefix));

    const removedCount = data.transactions.length - filteredTransactions.length;

    if (removedCount === 0) {
      alert(`No transactions found for ${data.activeYear}-${monthStr} to clear.`);
      return;
    }

    const updatedData = {
      ...data,
      transactions: filteredTransactions,
      lastUpdated: new Date().toISOString(),
    };

    await api.saveData(updatedData);
    setData(updatedData);
    await api.saveData(updatedData);
    setData(updatedData);
    alert(`Cleared ${removedCount} transactions for ${data.activeYear}-${monthStr}.`);
  };

  // Simplified Auto-Categorize (Manual Trigger) removed as it is now automatic in Import.
  // Keeping logic if needed for "Scan All" later, but for now Import handles it.


  const handleAddTransaction = async (txData) => {
    const amt = txData.amount || 0;
    const newTx = {
      id: `manual-${Date.now()}`,
      date: txData.date || new Date().toISOString().split('T')[0],
      amount: amt,
      description: txData.description || "New Transaction",
      category: txData.category || "Uncategorized",
      type: amt >= 0 ? "income" : "expense", // Required by Rust model
      account: txData.account || "debit1",
      originalLine: null, // Marker for manual
      endingBalance: null
    };
    const newData = {
      ...data,
      transactions: [newTx, ...data.transactions],
      lastUpdated: new Date().toISOString()
    };
    setData(newData);
    try {
      await api.saveData(newData);
    } catch (err) {
      console.error("Failed to save transaction:", err);
      alert("Error saving transaction: " + err);
    }
  };

  const handleUpdateTransaction = async (id, updates) => {
    const newTransactions = data.transactions.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    const newData = { ...data, transactions: newTransactions, lastUpdated: new Date().toISOString() };
    setData(newData);
    await api.saveData(newData);
  };

  const handleRemoveTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    const newTransactions = data.transactions.filter(t => t.id !== id);
    const newData = { ...data, transactions: newTransactions, lastUpdated: new Date().toISOString() };
    setData(newData);
    await api.saveData(newData);
  };

  const handleAddRule = async (keyword, category, ruleType = "any") => {
    // Check if rule exists?
    const newRule = { id: `rule-${Date.now()}`, keyword, category, rule_type: ruleType }; // DB expects snake_case for consistency or just handle mapping? 
    // Actually backend expects `rule_type` in json if Serde rename_all="camelCase" is on?
    // Rust struct `CategoryRule` has `#[serde(rename_all = "camelCase")]`.
    // So frontend should send `ruleType`.
    // Wait, let's check rust struct in models.rs.
    // Line 17: #[serde(rename_all = "camelCase")]
    // Line 21+: pub rule_type: String
    // So JSON field is `ruleType`.

    // So newRule object in JS should have ruleType.
    const ruleObj = { id: `rule-${Date.now()}`, keyword, category, ruleType };
    const newRules = [...data.categoryRules, ruleObj];

    // Also apply this rule immediately to all matches? 
    let updatedCount = 0;
    const newTransactions = data.transactions.map(t => {
      // Check Rule Type Compatibility (for retroactive application)
      let typeMatch = true;
      if (ruleType === "income") typeMatch = t.amount >= 0;
      if (ruleType === "expense") typeMatch = t.amount < 0;

      if (t.category === "Uncategorized" && typeMatch && t.description.toLowerCase().includes(keyword.toLowerCase())) {
        updatedCount++;
        return { ...t, category };
      }
      return t;
    });

    const newData = {
      ...data,
      categoryRules: newRules,
      transactions: newTransactions,
      lastUpdated: new Date().toISOString()
    };

    setData(newData);
    await api.saveData(newData);
    if (updatedCount > 0) {
      alert(`Rule added and applied to ${updatedCount} existing transactions.`);
    } else {
      alert("Rule added.");
    }
  };

  if (loading) {
    return (
      <section className="hero is-fullheight">
        <div className="hero-body">
          <div className="container has-text-centered">
            <p className="title">Loading Budget...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="container is-fluid p-4">
      <nav className="navbar is-transparent mb-4" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <a className="navbar-item" href="#">
            <span className="icon is-large has-text-primary">
              <Wallet />
            </span>
            <h1 className="title is-4 ml-2">Family Budget ({data.activeYear})</h1>
          </a>
        </div>
        {isThin && (
          <div className="navbar-menu is-active">
            <div className="navbar-end">
              <div className="navbar-item">
                <button 
                  className="button is-primary"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <span className="icon"><Upload /></span>
                  <span>Sync Database</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleSyncFile} 
                  accept=".json" 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="tabs is-centered is-boxed is-medium">
        <ul>
          <li className={activeTab === "dashboard" ? "is-active" : ""}>
            <a onClick={() => setActiveTab("dashboard")}>
              <span className="icon is-small"><Layers /></span>
              <span>Dashboard</span>
            </a>
          </li>
          {!isThin && (
            <li className={activeTab === "import" ? "is-active" : ""}>
              <a onClick={() => setActiveTab("import")}>
                <span className="icon is-small"><Upload /></span>
                <span>Import</span>
              </a>
            </li>
          )}
          <li className={activeTab === "transactions" ? "is-active" : ""}>
            <a onClick={() => setActiveTab("transactions")}>
              <span className="icon is-small"><List /></span>
              <span>Transactions</span>
            </a>
          </li>
          {!isThin && (
            <li className={activeTab === "settings" ? "is-active" : ""}>
              <a onClick={() => setActiveTab("settings")}>
                <span className="icon is-small"><SettingsIcon /></span>
                <span>Settings</span>
              </a>
            </li>
          )}
        </ul>
      </div>

      <div className="container">
        {activeTab === "dashboard" && <Dashboard data={data} />}
        {!isThin && activeTab === "import" && <Import onImport={handleImport} onClearMonth={handleClearMonth} rules={data.categoryRules} activeYear={data.activeYear} transactions={data.transactions} />}
        {activeTab === "transactions" && <Transactions data={data} onUpdateTransaction={handleUpdateTransaction} onRemoveTransaction={handleRemoveTransaction} onAddRule={handleAddRule} onAddTransaction={handleAddTransaction} isThin={isThin} />}
        {!isThin && activeTab === "settings" && <Settings data={data} onUpdate={(newData) => { setData(newData); api.saveData(newData); }} />}
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from "react";
import { api } from "./lib/api";
import Dashboard from "./components/Dashboard";
import Import from "./components/Import";
import Settings from "./components/Settings";
import { Layers, Upload, Wallet, Settings as SettingsIcon } from "lucide-react";

function App() {
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

  const handleImport = async (newTransactions) => {
    // Simple verification based on content
    const existingStrings = new Set(data.transactions.map(t => `${t.date}|${t.amount}|${t.description}`));

    const uniqueNew = newTransactions.filter(t => !existingStrings.has(`${t.date}|${t.amount}|${t.description}`));

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

  const handleAutoCategorize = async () => {
    const uncategorized = data.transactions.filter(t =>
      t.category === "Uncategorized" &&
      t.date.startsWith(data.activeYear.toString())
    );

    if (uncategorized.length === 0) {
      alert("No uncategorized transactions found in active year.");
      return;
    }

    const uniqueCategories = [...new Set(data.categoryRules.map(r => r.category))];
    if (uniqueCategories.length === 0) {
      alert("No categories defined in rules. Please add some rules first to define categories.");
      return;
    }

    if (!window.confirm(`Found ${uncategorized.length} uncategorized transactions. Categorize with AI?`)) return;

    setLoading(true);
    let updatedCount = 0;
    const newTransactions = [...data.transactions];

    for (const tx of uncategorized) {
      try {
        const result = await api.classifyTransaction(tx.description, uniqueCategories);
        const bestCategory = result[0];

        if (bestCategory !== "Uncategorized") {
          const idx = newTransactions.findIndex(t => t.id === tx.id);
          if (idx !== -1) {
            newTransactions[idx] = { ...tx, category: bestCategory };
            updatedCount++;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (updatedCount > 0) {
      const newData = { ...data, transactions: newTransactions, lastUpdated: new Date().toISOString() };
      await api.saveData(newData);
      setData(newData);
      alert(`Auto-categorized ${updatedCount} transactions.`);
    } else {
      alert("AI could not confidently categorize any transactions (or Model not loaded). Check console.");
    }
    setLoading(false);
  };

  const handleAutoCategorize = async () => {
    const uncategorized = data.transactions.filter(t =>
      t.category === "Uncategorized" &&
      t.date.startsWith(data.activeYear.toString())
    );

    if (uncategorized.length === 0) {
      alert("No uncategorized transactions found in active year.");
      return;
    }

    // Derive unique categories from existing rules + maybe unique categories in transactions?
    // Let's use categories found in rules for now as the "known" set.
    const uniqueCategories = [...new Set(data.categoryRules.map(r => r.category))];
    if (uniqueCategories.length === 0) {
      alert("No categories defined in rules. Please add some rules first to define categories.");
      return;
    }

    if (!window.confirm(`Found ${uncategorized.length} uncategorized transactions. Categorize with AI?`)) return;

    setLoading(true);
    let updatedCount = 0;
    const newTransactions = [...data.transactions];

    for (const tx of uncategorized) {
      try {
        const result = await api.classifyTransaction(tx.description, uniqueCategories);
        // Result is [category, score] or just category if Rust returns tuple?
        // Rust: (String, f32) -> JS array [string, number]
        const bestCategory = result[0];
        const score = result[1];

        if (bestCategory !== "Uncategorized") {
          const idx = newTransactions.findIndex(t => t.id === tx.id);
          if (idx !== -1) {
            newTransactions[idx] = { ...tx, category: bestCategory };
            updatedCount++;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (updatedCount > 0) {
      const newData = { ...data, transactions: newTransactions, lastUpdated: new Date().toISOString() };
      await api.saveData(newData);
      setData(newData);
      alert(`Auto-categorized ${updatedCount} transactions.`);
    } else {
      alert("AI could not confidently categorize any transactions.");
    }
    setLoading(false);
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
      </nav>

      <div className="tabs is-centered is-boxed is-medium">
        <ul>
          <li className={activeTab === "dashboard" ? "is-active" : ""}>
            <a onClick={() => setActiveTab("dashboard")}>
              <span className="icon is-small"><Layers /></span>
              <span>Dashboard</span>
            </a>
          </li>
          <li className={activeTab === "import" ? "is-active" : ""}>
            <a onClick={() => setActiveTab("import")}>
              <span className="icon is-small"><Upload /></span>
              <span>Import</span>
            </a>
          </li>
          <li className={activeTab === "settings" ? "is-active" : ""}>
            <a onClick={() => setActiveTab("settings")}>
              <span className="icon is-small"><SettingsIcon /></span>
              <span>Settings</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="container">
        {activeTab === "dashboard" && <Dashboard data={data} />}
        {activeTab === "import" && <Import onImport={handleImport} onClearMonth={handleClearMonth} rules={data.categoryRules} activeYear={data.activeYear} />}
        {activeTab === "settings" && <Settings data={data} onUpdate={(newData) => { setData(newData); api.saveData(newData); }} />}
      </div>
    </div>
  );
}

export default App;

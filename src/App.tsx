import React, { useState, useEffect } from "react";
import { AppData, Transaction } from "./lib/types";
import { loadData, saveData } from "./lib/storage";
import Dashboard from "./components/Dashboard";
import Import from "./components/Import";
import Settings from "./components/Settings";
import { Layers, Upload, Wallet, Settings as SettingsIcon } from "lucide-react";

function App() {
  const [data, setData] = useState<AppData>({ transactions: [], lastUpdated: "", initialCapital: 0, categoryRules: [] });
  const [activeTab, setActiveTab] = useState<"dashboard" | "import" | "settings">("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData().then((loadedData) => {
      setData(loadedData);
      setLoading(false);
    });
  }, []);

  const handleImport = async (newTransactions: Transaction[]) => {
    // Merge logic: avoid duplicates?
    // For now, let's just append/merge. Or simplistic: replace?
    // User probably wants to add data.
    // Simple deduplication could be based on ID (if generated consistently) or just trust the user import.
    // Given the parser generates IDs based on timestamp, duplicates will be duplicated.
    // Improved logic: Filter duplicates based on Date + Amount + Description + Balance? 
    // Let's just append for now to follow requirements "import data".

    // Actually, let's check for existing identical transactions to be nice.
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

    await saveData(updatedData);
    setData(updatedData);
    setActiveTab("dashboard");
    alert(`Imported ${uniqueNew.length} transactions.`);
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
            <h1 className="title is-4 ml-2">Family Budget</h1>
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
        {activeTab === "import" && <Import onImport={handleImport} rules={data.categoryRules} />}
        {activeTab === "settings" && <Settings data={data} onUpdate={(newData) => { setData(newData); saveData(newData); }} />}
      </div>
    </div>
  );
}

export default App;

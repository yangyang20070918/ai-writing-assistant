"use client";

import { useState } from "react";
import { apiSummarize } from "../../lib/api";

export default function SummarizePage() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const summary = await apiSummarize(text, language);
      setResult(summary);
    } catch {
      setError("要約に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>📝 要約</h1>

      <div className="tool-layout">
        <div className="tool-input-section">
          <div className="lang-selector">
            <label>出力言語：</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="Japanese">日本語</option>
              <option value="English">英語</option>
              <option value="Chinese">中国語</option>
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="要約したいテキストを入力..."
            rows={10}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="submit-btn"
          >
            {isLoading ? "要約中..." : "要約する"}
          </button>
        </div>

        <div className="tool-result-section">
          <h3>要約結果</h3>
          {error && <p className="error-text">{error}</p>}
          {result ? (
            <div className="result-box">{result}</div>
          ) : (
            <div className="result-placeholder">
              要約結果がここに表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

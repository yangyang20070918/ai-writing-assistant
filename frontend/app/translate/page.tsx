"use client";

import { useState } from "react";
import { apiTranslate } from "../../lib/api";

const LANGUAGES = [
  { value: "Japanese", label: "日本語" },
  { value: "English", label: "英語" },
  { value: "Chinese", label: "中国語" },
];

export default function TranslatePage() {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("Japanese");
  const [targetLang, setTargetLang] = useState("English");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const translated = await apiTranslate(text, sourceLang, targetLang);
      setResult(translated);
    } catch {
      setError("翻訳に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>🌐 翻訳</h1>

      <div className="tool-layout">
        <div className="tool-input-section">
          <div className="lang-selector">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="arrow">→</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="翻訳したいテキストを入力..."
            rows={8}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="submit-btn"
          >
            {isLoading ? "翻訳中..." : "翻訳する"}
          </button>
        </div>

        <div className="tool-result-section">
          <h3>翻訳結果</h3>
          {error && <p className="error-text">{error}</p>}
          {result ? (
            <div className="result-box">{result}</div>
          ) : (
            <div className="result-placeholder">
              翻訳結果がここに表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

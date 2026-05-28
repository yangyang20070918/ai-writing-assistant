"use client";

import { useState } from "react";
import { apiGenerate } from "../../lib/api";

export default function GeneratePage() {
  const [keywords, setKeywords] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [style, setStyle] = useState("blog");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!keywords.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const generated = await apiGenerate(keywords, language, style);
      setResult(generated);
    } catch {
      setError("文章生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>✨ 文章生成</h1>

      <div className="tool-layout">
        <div className="tool-input-section">
          <div className="lang-selector">
            <label>言語：</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="Japanese">日本語</option>
              <option value="English">英語</option>
              <option value="Chinese">中国語</option>
            </select>

            <label>スタイル：</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="blog">ブログ記事</option>
              <option value="formal">ビジネス文書</option>
              <option value="casual">カジュアル</option>
              <option value="technical">技術記事</option>
            </select>
          </div>

          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="キーワードやトピックを入力..."
            rows={4}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || !keywords.trim()}
            className="submit-btn"
          >
            {isLoading ? "生成中..." : "文章を生成する"}
          </button>
        </div>

        <div className="tool-result-section">
          <h3>生成結果</h3>
          {error && <p className="error-text">{error}</p>}
          {result ? (
            <div className="result-box">{result}</div>
          ) : (
            <div className="result-placeholder">
              生成された文章がここに表示されます
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

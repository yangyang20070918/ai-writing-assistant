"use client";

import { useState } from "react";
import { apiGenerate } from "../../lib/api";

export default function GeneratePage() {
  const [keywords, setKeywords] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [style, setStyle] = useState("blog");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!keywords.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await apiGenerate(keywords, language, style);
      setResult(data.result);
      setIsDemo(!!data.demo);
    } catch {
      setError("文章生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>✨ 文章生成</h1>

      {(!result || isDemo) && (
        <div className="demo-banner">
          <span className="demo-banner-icon">ℹ️</span>
          <span>
            デモモードで動作中です。API利用料金を発生させないため、固定のサンプル応答を表示します（実際のClaude
            APIは呼び出していません）。
          </span>
        </div>
      )}

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

          <button
            type="button"
            className="sample-btn"
            onClick={() => {
              const samples: Record<string, string> = {
                Japanese: "AI 業務効率化 自動化 働き方改革",
                English: "AI business efficiency automation future of work",
                Chinese: "AI 业务效率 自动化 工作方式改革",
              };
              setKeywords(samples[language] || samples["Japanese"]);
              setResult("");
              setIsDemo(false);
            }}
          >
            📋 サンプル入力
          </button>

          <textarea
            value={keywords}
            readOnly
            placeholder="「サンプル入力」ボタンを押してください"
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
          {isDemo && result && <span className="demo-badge">Demo応答</span>}
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

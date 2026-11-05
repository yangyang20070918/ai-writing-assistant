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
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await apiTranslate(text, sourceLang, targetLang);
      setResult(data.result);
      setIsDemo(!!data.demo);
    } catch {
      setError("翻訳に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>🌐 翻訳</h1>

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

          <button
            type="button"
            className="sample-btn"
            onClick={() => {
              const samples: Record<string, string> = {
                Japanese:
                  "本日はお忙しいところ、お時間をいただきありがとうございます。弊社のAIソリューションについてご紹介させていただきます。",
                English:
                  "Thank you for taking the time out of your busy schedule today. I would like to introduce our AI solutions.",
                Chinese:
                  "感谢您在百忙之中抽出时间。我想向您介绍一下我们的AI解决方案。",
              };
              setText(samples[sourceLang] || samples["Japanese"]);
              setResult("");
              setIsDemo(false);
            }}
          >
            📋 サンプル入力
          </button>

          <textarea
            value={text}
            readOnly
            placeholder="「サンプル入力」ボタンを押してください"
            rows={8}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim() || sourceLang === targetLang}
            className="submit-btn"
          >
            {isLoading ? "翻訳中..." : "翻訳する"}
          </button>
          {sourceLang === targetLang && (
            <p className="error-text">
              翻訳元と翻訳先には異なる言語を選択してください。
            </p>
          )}
        </div>

        <div className="tool-result-section">
          <h3>翻訳結果</h3>
          {isDemo && result && <span className="demo-badge">Demo応答</span>}
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

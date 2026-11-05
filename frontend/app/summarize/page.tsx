"use client";

import { useState } from "react";
import { apiSummarize } from "../../lib/api";

export default function SummarizePage() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Japanese");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await apiSummarize(text, language);
      setResult(data.result);
      setIsDemo(!!data.demo);
    } catch {
      setError("要約に失敗しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="tool-page">
      <h1>📝 要約</h1>

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

          <button
            type="button"
            className="sample-btn"
            onClick={() => {
              const samples: Record<string, string> = {
                Japanese:
                  "人工知能（AI）は、コンピュータサイエンスの一分野であり、人間の知能を模倣するシステムの開発を目指しています。近年、深層学習技術の進歩により、自然言語処理、画像認識、音声認識などの分野で飛躍的な進歩を遂げました。特に大規模言語モデル（LLM）の登場は、テキスト生成、翻訳、要約、コード生成など、幅広いタスクにおいて人間に匹敵する性能を実現しています。企業におけるAI導入は加速しており、業務効率化、コスト削減、意思決定支援など、多くの分野で実用化が進んでいます。一方で、AIの倫理的課題やプライバシーの問題、雇用への影響なども議論されており、責任あるAI開発が求められています。",
                English:
                  "Artificial intelligence (AI) is a branch of computer science that aims to develop systems capable of mimicking human intelligence. In recent years, advances in deep learning have led to breakthroughs in natural language processing, image recognition, and speech recognition. The emergence of large language models (LLMs) has achieved human-level performance in a wide range of tasks, including text generation, translation, summarization, and code generation. AI adoption in enterprises is accelerating, with practical applications in areas such as operational efficiency, cost reduction, and decision-making support. At the same time, ethical challenges, privacy concerns, and the impact on employment are being discussed, calling for responsible AI development.",
                Chinese:
                  "人工智能（AI）是计算机科学的一个分支，旨在开发能够模拟人类智能的系统。近年来，深度学习技术的进步推动了自然语言处理、图像识别和语音识别等领域的飞跃式发展。特别是大型语言模型（LLM）的出现，在文本生成、翻译、摘要和代码生成等广泛任务中实现了接近人类的性能。企业AI应用正在加速，在业务效率化、成本削减和决策支持等领域得到广泛应用。与此同时，AI的伦理问题、隐私保护和就业影响等也引发了讨论，负责任的AI开发成为了重要课题。",
              };
              setText(samples[language] || samples["Japanese"]);
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
          {isDemo && result && <span className="demo-badge">Demo応答</span>}
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

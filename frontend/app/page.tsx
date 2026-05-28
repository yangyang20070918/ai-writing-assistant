import Link from "next/link";

export default function Home() {
  return (
    <div className="home">
      <h1>AI Writing Assistant</h1>
      <p className="home-desc">
        Claude APIを活用した文章作成支援ツール
      </p>

      <div className="feature-grid">
        <Link href="/translate" className="feature-card">
          <div className="feature-icon">🌐</div>
          <h2>翻訳</h2>
          <p>日本語・英語・中国語の相互翻訳</p>
        </Link>

        <Link href="/summarize" className="feature-card">
          <div className="feature-icon">📝</div>
          <h2>要約</h2>
          <p>長い文章を簡潔に要約</p>
        </Link>

        <Link href="/generate" className="feature-card">
          <div className="feature-icon">✨</div>
          <h2>文章生成</h2>
          <p>キーワードから文章を自動生成</p>
        </Link>
      </div>
    </div>
  );
}

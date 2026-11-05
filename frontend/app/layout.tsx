import type { Metadata } from "next";
import { Navigation } from "./components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Writing Assistant",
  description:
    "Demo of a translation, summarization, and text generation tool using fixed sample responses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Navigation />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

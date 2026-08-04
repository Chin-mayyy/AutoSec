import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Sec",
  description: "AI-assisted repository and smart contract security analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Osama Studio · استوديو أسامة لصناعة ونشر الفيديوهات القصيرة",
  description: "Osama Studio - استوديو أسامة الذكي والمتكامل لصناعة وإنتاج ونشر الفيديوهات القصيرة بالذكاء الاصطناعي (Shorts & TikTok)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-red-500/30 selection:text-red-100">
        {children}
      </body>
    </html>
  );
}

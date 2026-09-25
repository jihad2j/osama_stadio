import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Osama Studio · استوديو أسامة لصناعة ونشر الفيديوهات القصيرة",
  description: "Osama Studio - استوديو أسامة الذكي والمتكامل لصناعة وإنتاج ونشر الفيديوهات القصيرة بالذكاء الاصطناعي (Shorts & TikTok)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Osama Studio" />
        <link rel="apple-touch-icon" href="/studio-icon.svg" />
        <link rel="icon" href="/studio-icon.svg" type="image/svg+xml" />
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

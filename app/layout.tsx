import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Flow Journal | Trading Journal",
  description: "Trading journal for options flow, order flow & AMT traders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={fontSans.variable + " font-sans antialiased"}>
        <Script id="app-language-init" strategy="beforeInteractive">
          {`(function(){try{var k='app-language',v=localStorage.getItem(k);if(v==='ru')document.documentElement.lang='ru';}catch(e){}})();`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

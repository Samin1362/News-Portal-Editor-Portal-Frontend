import type { Metadata, Viewport } from "next";
import { Inter, Kalam, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers/Providers";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-serif-google",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-google",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  variable: "--font-hand-google",
});

export const metadata: Metadata = {
  title: {
    default: "Deligo · Editor Desk",
    template: "%s · Deligo Editor",
  },
  description: "Deligo News — editor portal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${inter.variable} ${kalam.variable} h-full`}
    >
      <body className="min-h-full bg-canvas text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

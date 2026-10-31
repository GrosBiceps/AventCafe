import type { Metadata, Viewport } from "next";
import { Karla, Zilla_Slab } from "next/font/google";
import "./globals.css";

const zilla = Zilla_Slab({
  variable: "--font-zilla",
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const karla = Karla({
  variable: "--font-karla",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "L’Avent torréfié",
  description: "Vingt-quatre sachets, sept cafés, un rituel par matin.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EEE4" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${zilla.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const notoSansMono = Noto_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-noto-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WePass | Secure Password Manager",
  description: "Your passwords, encrypted and yours. WePass keeps your credentials safe with AES-256 encryption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSansMono.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

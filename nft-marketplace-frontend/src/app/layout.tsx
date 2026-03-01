import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SecureNFT Hub - Secure & AI-Powered',
  description: 'Production-grade NFT marketplace with fraud detection, price prediction, and trust scoring',
  icons: {
    icon: '/logo-t.png',
    shortcut: '/logo-t.png',
    apple: '/logo-t.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

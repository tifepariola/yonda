import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yonda — China payments, sorted.',
  description:
    'Buy Chinese Yuan with Naira and send it straight to Alipay or WeChat Pay — in minutes, right from WhatsApp. No bank visits. No stress.',
  openGraph: {
    title: 'Yonda — China payments, sorted.',
    description:
      'Buy Chinese Yuan with Naira and send it straight to Alipay or WeChat Pay — in minutes, right from WhatsApp.',
    type: 'website',
    siteName: 'Yonda',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yonda — China payments, sorted.',
    description: 'Buy Chinese Yuan with Naira and send it straight to Alipay or WeChat Pay.',
  },
};

export const viewport: Viewport = {
  themeColor: '#1E2A38',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

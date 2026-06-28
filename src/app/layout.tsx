import type { Metadata } from 'next';
import { Newsreader, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
});
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'Procur — Procurement Terminal',
  description: 'The Bloomberg Terminal for software purchasing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-accent="teal"
      className={`${newsreader.variable} ${grotesk.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

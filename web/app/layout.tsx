import type { Metadata } from 'next';
import '../styles/globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Hawk Bot — Modern SaaS Dashboard',
  description: 'Manage economy, private voice channels, welcome embeds, and community tools with Hawk dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

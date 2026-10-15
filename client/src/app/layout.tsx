import type { Metadata } from 'next';
import '../index.css';
export const metadata: Metadata = { title: 'Meridian | School Operations', description: 'Trust-first school operations, relational integrity and semantic knowledge retrieval.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div id="root">{children}</div></body></html>;
}

'use client';
import dynamic from 'next/dynamic';
const Meridian = dynamic(() => import('../NextApp'), { ssr: false, loading: () => <p className="p-8">Loading Meridian…</p> });
export default function ClientApp() { return <Meridian />; }

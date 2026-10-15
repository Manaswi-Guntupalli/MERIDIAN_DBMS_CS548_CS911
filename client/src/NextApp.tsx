'use client';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
export default function NextApp() {
  const [client] = useState(() => new QueryClient({defaultOptions:{queries:{staleTime:15000,refetchOnWindowFocus:false,retry:1}}}));
  return <QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>;
}

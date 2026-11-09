'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useAuth } from './store/auth';
import { useUI } from './store/ui';
import { TOKEN_KEY } from './lib/api';

function AccountData({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({defaultOptions:{queries:{staleTime:15000,refetchOnWindowFocus:false,retry:1}}}));
  useLayoutEffect(() => {
    useUI.setState({ toasts: [], paletteOpen: false });
    return () => { void client.cancelQueries(); client.clear(); };
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default function NextApp() {
  const user = useAuth(state => state.user);
  const syncSession = useAuth(state => state.syncSession);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === TOKEN_KEY || event.key === null)) void syncSession();
    };
    window.addEventListener('storage',changed);
    return () => window.removeEventListener('storage',changed);
  },[syncSession]);
  // Every account gets a new query cache and mounted page state. Returning
  // from impersonation also starts fresh instead of restoring another feed.
  const account = user ? `${user.schoolId}:${user.id}:${user.role}:${user.impersonator?.id ?? ''}` : 'signed-out';
  return <BrowserRouter><AccountData key={account}><App /></AccountData></BrowserRouter>;
}

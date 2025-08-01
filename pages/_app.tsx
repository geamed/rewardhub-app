import type { AppProps } from 'next/app';
import '../index.css';
import { AuthProvider } from '../contexts/AuthContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

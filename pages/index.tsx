// ...existing code...
import { AuthProvider } from '../contexts/AuthContext';
import '../index.css';
import App from '../App';

export default function Home() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/Dialog';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import PublicSite from './pages/PublicSite';

function Protected({ children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <Routes>
            <Route path="/for/:slug" element={<PublicSite />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/edit/:id" element={<Protected><Builder /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

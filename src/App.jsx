import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AppLock from './components/AppLock';
import DashboardPage from './pages/DashboardPage';
import { useAuthStore } from './stores/authStore';
import { useAppLockStore } from './stores/appLockStore';

async function configureStatusBar() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch {}
}

function App() {
  const init = useAuthStore((s) => s.init);
  const isUnlocked = useAppLockStore((s) => s.isUnlocked);

  useEffect(() => {
    init();
    configureStatusBar();
  }, [init]);

  if (!isUnlocked) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <AppLock onUnlocked={() => {}} />
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/dashboard/*" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default App;

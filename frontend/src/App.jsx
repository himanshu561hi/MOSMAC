import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from '@/store';
import { setCredentials, setAuthLoading } from '@/store/slices/authSlice';
import authService from '@/features/auth/authService';
import AppRoutes from '@/routes/AppRoutes';
import ErrorBoundary from '@/components/common/ErrorBoundary';

function AuthInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const refreshData = await authService.refresh();
        if (refreshData?.accessToken) {
          const meData = await authService.getMe();
          if (isMounted && meData?.user) {
            dispatch(setCredentials({ user: meData.user, accessToken: refreshData.accessToken }));
          }
        }
      } catch (err) {
        // Normal guest session - no active refresh cookie
      } finally {
        if (isMounted) {
          dispatch(setAuthLoading(false));
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return children;
}

export function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundary variant="global">
          <AuthInitializer>
            <AppRoutes />
          </AuthInitializer>
        </ErrorBoundary>
      </BrowserRouter>
    </Provider>
  );
}

export default App;

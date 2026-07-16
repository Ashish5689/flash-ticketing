import { createBrowserRouter } from 'react-router-dom';

import App from './App';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RouteLoading } from './components/auth/RouteLoading';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    HydrateFallback: RouteLoading,
    lazy: async () => ({ Component: (await import('./pages/LoginPage')).default }),
  },
  {
    path: '/register',
    HydrateFallback: RouteLoading,
    lazy: async () => ({ Component: (await import('./pages/RegisterPage')).default }),
  },
  {
    path: '/movies',
    HydrateFallback: RouteLoading,
    lazy: async () => ({ Component: (await import('./pages/MovieListPage')).default }),
  },
  {
    path: '/movies/:id',
    HydrateFallback: RouteLoading,
    lazy: async () => ({ Component: (await import('./pages/MovieDetailPage')).default }),
  },
  {
    path: '/shows/:id/seats',
    HydrateFallback: RouteLoading,
    lazy: async () => ({ Component: (await import('./pages/SeatMapPage')).default }),
  },
  {
    path: '/checkout/:holdId',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const CheckoutPage = (await import('./pages/CheckoutPage')).default;
      return {
        Component: () => (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/bookings',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const MyBookingsPage = (await import('./pages/MyBookingsPage')).default;
      return {
        Component: () => (
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/bookings/:orderId',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const OrderConfirmationPage = (await import('./pages/OrderConfirmationPage')).default;
      return {
        Component: () => (
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/account',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const AccountPage = (await import('./pages/AccountPage')).default;
      return {
        Component: () => (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/admin',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const AdminPage = (await import('./pages/AdminPage')).default;
      return {
        Component: () => (
          <ProtectedRoute role="ADMIN">
            <AdminPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/organizer/apply',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const OrganizerApplyPage = (await import('./pages/OrganizerApplyPage')).default;
      return {
        Component: () => (
          <ProtectedRoute>
            <OrganizerApplyPage />
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    path: '/organizer',
    HydrateFallback: RouteLoading,
    lazy: async () => {
      const OrganizerPage = (await import('./pages/OrganizerPage')).default;
      return {
        Component: () => (
          <ProtectedRoute role="ORGANIZER">
            <OrganizerPage />
          </ProtectedRoute>
        ),
      };
    },
  },
]);

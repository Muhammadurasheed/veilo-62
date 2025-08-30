import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/optimized/AuthContextRefactored';
import { SmartRouter } from '@/components/routing/SmartRouter';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ui/error-boundary';

import FlagshipLanding from '@/pages/FlagshipLanding';
import Dashboard from '@/pages/Dashboard';
import Auth from '@/pages/Auth';
import { FlagshipSanctuaryLanding } from '@/pages/FlagshipSanctuaryLanding';
import { InstantSanctuaryCreator } from '@/pages/InstantSanctuaryCreator';
import { ScheduledSanctuaryCreator } from '@/pages/ScheduledSanctuaryCreator';
import { EnhancedLiveAudioSpace } from '@/components/sanctuary/EnhancedLiveAudioSpace';
import Feed from '@/pages/Feed';
import BeaconsList from '@/pages/BeaconsList';
import ExpertProfile from '@/pages/ExpertProfile';
import ExpertRegistration from '@/pages/ExpertRegistration';
import ExpertDashboard from '@/pages/ExpertDashboard';
import Chat from '@/pages/Chat';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import SessionHub from '@/pages/SessionHub';
import NotFound from '@/pages/NotFound';
import AdminPanel from '@/pages/AdminPanel';
import BookSession from '@/pages/BookSession';
import MySanctuariesPage from '@/pages/MySanctuaries';
import { SessionProvider } from '@/contexts/SessionContext';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  useEffect(() => {
    document.title = 'Veilo - Anonymous Support & Guidance';
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <SmartRouter>
                <Routes>
                  <Route path="/" element={<FlagshipLanding />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute requireAuth={true}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Flagship Sanctuary Routes */}
                  <Route path="/sanctuary" element={<FlagshipSanctuaryLanding />} />
                  <Route path="/sanctuary/create/instant" element={
                    <ProtectedRoute requireAuth={true}>
                      <InstantSanctuaryCreator />
                    </ProtectedRoute>
                  } />
                  <Route path="/sanctuary/create/scheduled" element={
                    <ProtectedRoute requireAuth={true}>
                      <ScheduledSanctuaryCreator />
                    </ProtectedRoute>
                  } />
                  <Route path="/sanctuary/live/:sessionId" element={
                    <ProtectedRoute requireAuth={true}>
                      <EnhancedLiveAudioSpace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/beacons" element={<BeaconsList />} />
                  <Route path="/expert/:expertId" element={<ExpertProfile />} />
                  <Route path="/register-expert" element={<ExpertRegistration />} />
                  <Route path="/expert-dashboard" element={<ExpertDashboard />} />
                  <Route path="/sessions/book/:expertId" element={<BookSession />} />
                  <Route path="/chat/:sessionId?" element={<Chat />} />
                  <Route path="/sessions" element={<SessionHub />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin/*" element={<AdminPanel />} />
                  <Route path="/my-sanctuaries" element={<MySanctuariesPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SmartRouter>
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
import React from 'react';
import { AppProvider } from './context/AppContext';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary title="AI-Bhideo could not start">
      <AppProvider>
        <WorkspaceLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}

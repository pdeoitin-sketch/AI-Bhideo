import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  // Fails loudly instead of silently rendering a blank document.
  // eslint-disable-next-line no-console
  console.error('[AI-Bhideo] #root element was not found in index.html — nothing can be mounted.');
} else {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary title="AI-Bhideo failed to start">
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

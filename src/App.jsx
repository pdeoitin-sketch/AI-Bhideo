import React, { useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PromptStudio } from './components/PromptStudio';
import { VideoShowcase } from './components/VideoShowcase';
import { ModelArchitectureSection } from './components/ModelArchitectureSection';
import { VideoModelCatalog } from './components/VideoModelCatalog';
import { FeaturesGrid } from './components/FeaturesGrid';
import { PricingSection } from './components/PricingSection';
import { UserProfile } from './components/UserProfile';
import { AiPromptAssistant } from './components/AiPromptAssistant';
import { AuthModal } from './components/AuthModal';
import { VideoLightboxModal } from './components/VideoLightboxModal';
import { ApiKeysModal } from './components/ApiKeysModal';
import { UpgradeModal } from './components/UpgradeModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationToast } from './components/NotificationToast';
import { Footer } from './components/Footer';

function MainLayout() {
  const { currentView, setCurrentView } = useApp();
  const studioRef = useRef(null);

  const scrollToStudio = () => {
    if (currentView !== 'home' && currentView !== 'studio') {
      setCurrentView('studio');
    } else {
      const el = document.getElementById('video-studio');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white relative">
      
      {/* Background Neural Grid and Ambient Glows */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none z-0" />
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-brand-cyan/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1">
        
        {/* Navigation Bar */}
        <Navbar />

        {/* View Routing */}
        <main>
          <ErrorBoundary key={currentView} title="This section failed to load">
          {currentView === 'home' && (
            <>
              <HeroSection onOpenStudio={scrollToStudio} />
              <PromptStudio />
              <VideoShowcase />
              <ModelArchitectureSection />
              <FeaturesGrid />
              <PricingSection />
            </>
          )}

          {currentView === 'studio' && (
            <div className="pt-4">
              <PromptStudio />
              <VideoShowcase />
            </div>
          )}

          {currentView === 'showcase' && (
            <div className="pt-6">
              <VideoShowcase />
            </div>
          )}

          {currentView === 'models' && (
            <div className="pt-6 space-y-4">
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-5">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-200 text-[11px] font-mono font-bold">
                    LIVE CATALOGUE
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                    Video models this studio can actually call
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                    Every route below is wired end to end: the same adapter runs in your browser (BYOK) and behind
                    the gateway. Prices are public list rates, cheapest first — the free local renderer always works
                    with no key and no network. Add a provider key in the studio to unlock a paid route.
                  </p>
                </div>
                <VideoModelCatalog />
              </section>
              <ModelArchitectureSection />
              <FeaturesGrid />
            </div>
          )}

          {currentView === 'profile' && (
            <div className="pt-4">
              <UserProfile />
            </div>
          )}

          {currentView === 'pricing' && (
            <div className="pt-6">
              <PricingSection />
            </div>
          )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Modals & Interactive Drawers */}
      <ErrorBoundary title="A modal failed to open">
        <VideoLightboxModal />
        <AuthModal />
        <AiPromptAssistant />
        <ApiKeysModal />
        <UpgradeModal />
      </ErrorBoundary>
      <NotificationToast />

      {/* Global Footer */}
      <div className="relative z-10">
        <ErrorBoundary title="Footer failed to render">
          <Footer />
        </ErrorBoundary>
      </div>

    </div>
  );
}
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

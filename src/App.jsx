import React, { useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { PromptStudio } from './components/PromptStudio';
import { VideoShowcase } from './components/VideoShowcase';
import { ModelArchitectureSection } from './components/ModelArchitectureSection';
import { FeaturesGrid } from './components/FeaturesGrid';
import { PricingSection } from './components/PricingSection';
import { UserProfile } from './components/UserProfile';
import { AiPromptAssistant } from './components/AiPromptAssistant';
import { AuthModal } from './components/AuthModal';
import { VideoLightboxModal } from './components/VideoLightboxModal';
import { ApiKeysModal } from './components/ApiKeysModal';
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
            <div className="pt-6">
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
        </main>
      </div>

      {/* Global Modals & Interactive Drawers */}
      <VideoLightboxModal />
      <AuthModal />
      <AiPromptAssistant />
      <ApiKeysModal />
      <NotificationToast />

      {/* Global Footer */}
      <div className="relative z-10">
        <Footer />
      </div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

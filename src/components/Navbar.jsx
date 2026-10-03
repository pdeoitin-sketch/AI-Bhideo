import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  Search, 
  Zap, 
  Bell, 
  User, 
  Sliders, 
  Key, 
  LogOut, 
  ChevronDown, 
  Menu, 
  X, 
  Film, 
  Layers, 
  Cpu, 
  CreditCard, 
  ExternalLink,
  Code2,
  CheckCircle2
} from 'lucide-react';

export const Navbar = () => {
  const { 
    currentView, 
    setCurrentView, 
    user, 
    isAuthenticated, 
    setIsAuthModalOpen, 
    setAuthModalMode,
    setIsPromptAssistantOpen,
    setIsUpgradeModalOpen,
    setIsApiKeysModalOpen,
    handleLogout,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifications = [
    { id: 1, title: 'Video Rendered (4K 60FPS)', desc: 'Your "Cyberpunk Tokyo Rain" video is ready for download.', time: '2m ago', read: false },
    { id: 2, title: 'New Model Released', desc: 'Bhideo-Cinema-v3 is now available with native 4K anamorphic mode.', time: '1h ago', read: false },
    { id: 3, title: 'Credit Bonus Added', desc: 'You received +250 promotional GPU compute credits.', time: '1d ago', read: true }
  ];

  const handleNavClick = (viewId) => {
    setCurrentView(viewId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-dark-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-cyan to-brand-pink p-[1.5px] transition-transform duration-300 group-hover:scale-105 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              <svg className="w-6 h-6 text-brand-400 group-hover:text-brand-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="url(#logo-grad)" stroke="none" />
                <circle cx="12" cy="12" r="9" stroke="url(#logo-grad)" strokeWidth="1.5" strokeDasharray="4 2" />
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-brand-300 group-hover:to-brand-cyan transition-all">
                AI-Bhideo
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-brand-500/10 text-brand-300 border border-brand-500/30 rounded-md">
                v2.5 DiT
              </span>
            </div>
            <p className="hidden md:block text-[10px] text-slate-400 tracking-wider uppercase font-medium">Neural Video Synthesis</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'home' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleNavClick('studio')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'studio' ? 'text-brand-300 bg-brand-500/15 border border-brand-500/30' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Video Studio
          </button>
          <button
            onClick={() => handleNavClick('showcase')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'showcase' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            Showcase
          </button>
          <button
            onClick={() => handleNavClick('models')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentView === 'models' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            AI Models & DiT
          </button>
          <button
            onClick={() => handleNavClick('pricing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'pricing' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Pricing
          </button>
        </nav>

        {/* Global Quick Search Input */}
        <div className="hidden md:flex items-center flex-1 max-w-xs relative mx-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (currentView !== 'showcase') setCurrentView('showcase');
            }}
            placeholder="Search prompts, models, tags..."
            className="w-full bg-dark-900/80 border border-white/10 text-xs rounded-full pl-9 pr-8 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* AI Prompt Assistant Trigger */}
          <button
            onClick={() => setIsPromptAssistantOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-500/10 to-brand-cyan/10 border border-brand-500/30 hover:border-brand-400 text-brand-300 hover:text-white text-xs font-semibold transition-all group"
            title="Open AI Prompt Director Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400 group-hover:rotate-12 transition-transform" />
            <span>AI Director</span>
          </button>

          {/* Credits Counter Pill */}
          <div 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-900 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 cursor-pointer text-xs font-medium transition-all group"
            title="Click to recharge credits or upgrade plan"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>{user.credits.toLocaleString()}</span>
            <span className="hidden sm:inline text-[10px] text-amber-400/70 font-mono">⚡ Refill</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg bg-dark-900/80 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-cyan" />
            </button>

            {isNotifOpen && (
              <div 
                className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel p-3 shadow-2xl border border-white/10 animate-fade-in z-50"
                onMouseLeave={() => setIsNotifOpen(false)}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10 px-2">
                  <span className="font-semibold text-xs text-white">Notifications</span>
                  <span className="text-[10px] text-brand-400 font-medium">Mark all read</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                        <span className="text-[10px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar / Auth Button */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-full bg-dark-900 border border-white/10 hover:border-brand-500/40 transition-all group"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-brand-500/50"
                />
                <span className="hidden sm:block text-xs font-medium text-slate-200 group-hover:text-white max-w-[80px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl glass-panel p-2 shadow-2xl border border-white/10 animate-fade-in z-50 text-left"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="p-3 border-b border-white/10 mb-1">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      ⚡ {user.tier} Plan
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleNavClick('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <User className="w-4 h-4 text-brand-400" />
                    <span>User Profile & Creations</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleNavClick('studio');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <Film className="w-4 h-4 text-cyan-400" />
                    <span>Video Studio Generator</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsApiKeysModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>API Keys & SDK</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsUpgradeModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-pink-400" />
                    <span>Recharge & Subscriptions</span>
                  </button>

                  <div className="border-t border-white/10 my-1"></div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/25 transition-all"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 lg:hidden rounded-lg bg-dark-900 border border-white/10 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-dark-900/95 backdrop-blur-2xl px-4 py-4 space-y-2 animate-fade-in">
          <button
            onClick={() => handleNavClick('home')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Overview
          </button>
          <button
            onClick={() => handleNavClick('studio')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-brand-300 hover:bg-white/5 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Video Studio
            </span>
            <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-bold">HOT</span>
          </button>
          <button
            onClick={() => handleNavClick('showcase')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5 flex items-center gap-2"
          >
            <Film className="w-4 h-4 text-cyan-400" />
            Showcase Gallery
          </button>
          <button
            onClick={() => handleNavClick('models')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5 flex items-center gap-2"
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            AI Video Models & DiT
          </button>
          <button
            onClick={() => handleNavClick('pricing')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Pricing & Plans
          </button>
          <button
            onClick={() => handleNavClick('profile')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-white/5 flex items-center gap-2"
          >
            <User className="w-4 h-4 text-amber-400" />
            Profile & Creations
          </button>
        </div>
      )}
    </header>
  );
};

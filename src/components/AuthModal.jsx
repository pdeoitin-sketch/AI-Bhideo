import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User, Sparkles, Github } from 'lucide-react';

export const AuthModal = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode, 
    handleLogin, 
    setUser,
    showToast 
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isAuthModalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsAuthModalOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAuthModalOpen, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();

    if (!normalizedEmail) {
      showToast('Email Required', 'Please enter your email address.', 'warning');
      return;
    }

    if (authModalMode !== 'forgot' && !password.trim()) {
      showToast('Password Required', 'Please enter your password to continue.', 'warning');
      return;
    }

    if (authModalMode === 'signup' && !normalizedName) {
      showToast('Name Required', 'Please enter your name to create an account.', 'warning');
      return;
    }

    if (authModalMode === 'signup') {
      setUser(prev => ({
        ...prev,
        name: normalizedName,
        email: normalizedEmail,
        tier: 'Free Explorer',
        credits: 50
      }));
      handleLogin(normalizedEmail, password);
      setPassword('');
      showToast('Account Created!', `Welcome to AI-Bhideo, ${normalizedName}!`, 'success');
    } else if (authModalMode === 'forgot') {
      showToast('Reset Link Sent', `Check ${normalizedEmail} for password reset instructions.`, 'info');
      setAuthModalMode('login');
    } else {
      handleLogin(normalizedEmail, password);
      setPassword('');
    }
  };

  const handleOAuthLogin = (provider) => {
    setUser(prev => ({
      ...prev,
      name: `${provider} Creator`,
      email: `creator@${provider.toLowerCase()}.com`
    }));
    handleLogin();
    showToast(`${provider} Connected`, `Signed in via ${provider} OAuth.`, 'success');
  };

  return (
    <div
      className="fixed inset-0 bright-modal-overlay z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) setIsAuthModalOpen(false);
      }}
    >
      <div
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 max-w-md w-full animate-fade-in relative shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Close sign-in"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-cyan to-brand-pink mx-auto flex items-center justify-center text-white mb-3 shadow-lg shadow-brand-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 id="auth-modal-title" className="text-xl font-bold text-white font-display">
            {authModalMode === 'login' ? 'Sign in to AI-Bhideo' : 
             authModalMode === 'signup' ? 'Create your Studio Account' : 
             'Reset your Password'}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            Sign in to your AI-Bhideo creative workspace.
          </p>
          <p className="auth-preview-notice" role="note">
            Preview mode: sign-in is simulated in this browser. Do not enter a real password.
          </p>
        </div>

        {/* OAuth Buttons */}
        {authModalMode !== 'forgot' && (
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={() => handleOAuthLogin('Google')}
              className="w-full py-2.5 px-4 rounded-xl bg-dark-900 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('GitHub')}
              className="w-full py-2.5 px-4 rounded-xl bg-dark-900 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-4 h-4" />
              <span>Continue with GitHub</span>
            </button>
          </div>
        )}

        {authModalMode !== 'forgot' && (
          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] text-slate-500 uppercase font-mono">Or with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {authModalMode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">Password</label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('forgot')}
                    className="text-[11px] text-brand-400 hover:text-brand-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={authModalMode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="modal-primary-action w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all mt-2"
          >
            {authModalMode === 'login' ? 'Sign In to Studio' : 
             authModalMode === 'signup' ? 'Create Studio Account' : 
             'Send Password Reset Link'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
          {authModalMode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('signup')}
                className="text-brand-400 hover:text-brand-300 font-semibold"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthModalMode('login')}
                className="text-brand-400 hover:text-brand-300 font-semibold"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

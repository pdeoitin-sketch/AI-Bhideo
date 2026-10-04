import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Clock3,
  Compass,
  Cpu,
  Film,
  FolderOpen,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatWorkspace } from './ChatWorkspace';
import { Footer } from './Footer';
import { FeaturesGrid } from './FeaturesGrid';
import { ModelArchitectureSection } from './ModelArchitectureSection';
import { PricingSection } from './PricingSection';
import { PromptStudio } from './PromptStudio';
import { UserProfile } from './UserProfile';
import { VideoLightboxModal } from './VideoLightboxModal';
import { VideoShowcase } from './VideoShowcase';
import { AuthModal } from './AuthModal';
import { AiPromptAssistant } from './AiPromptAssistant';
import { ApiKeysModal } from './ApiKeysModal';
import { UpgradeModal } from './UpgradeModal';
import { ErrorBoundary } from './ErrorBoundary';
import { NotificationToast } from './NotificationToast';
import { readJSON, writeJSON } from '../utils/safeStorage';

const CHAT_THREADS_KEY = 'bhideo_chat_threads_v1';
const ACTIVE_CHAT_KEY = 'bhideo_active_chat_v1';

const PRIMARY_NAVIGATION = [
  { id: 'home', label: 'Chat', icon: MessageSquareText },
  { id: 'studio', label: 'Video studio', icon: Clapperboard },
  { id: 'showcase', label: 'Explore', icon: Compass },
  { id: 'models', label: 'Models', icon: Cpu },
];

const PERSONAL_NAVIGATION = [
  { id: 'profile', label: 'My creations', icon: FolderOpen },
  { id: 'pricing', label: 'Plans & credits', icon: Zap },
];

const VIEW_LABELS = {
  home: 'New conversation',
  chat: 'Conversation',
  studio: 'Video Studio',
  showcase: 'Explore',
  models: 'Models',
  profile: 'My creations',
  pricing: 'Plans & credits',
};

function getInitials(name = 'Creator') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'CR';
}

function formatChatDate(timestamp) {
  const date = new Date(timestamp || Date.now());
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function normalizeChatThreads(saved) {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((thread) => thread && typeof thread.id === 'string' && Array.isArray(thread.messages))
    .map((thread) => ({
      ...thread,
      title: typeof thread.title === 'string' ? thread.title : 'Untitled conversation',
      updatedAt: Number(thread.updatedAt) || Date.now(),
      messages: thread.messages
        .filter((message) => message && typeof message === 'object' && ['user', 'assistant'].includes(message.role))
        .map((message) => ({
          ...message,
          content: typeof message.content === 'string' ? message.content : '',
          attachments: Array.isArray(message.attachments)
            ? message.attachments.filter((file) => file && typeof file.name === 'string').map((file) => ({
                name: file.name,
                size: Number(file.size) || 0,
                type: typeof file.type === 'string' ? file.type : '',
              }))
            : [],
        })),
    }))
    .filter((thread) => thread.messages.length > 0)
    .slice(0, 40);
}

function WorkspaceSidebar({
  currentView,
  setCurrentView,
  user,
  threads,
  activeChatId,
  onNewChat,
  onSelectChat,
  onOpenCredits,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) {
  const [historyQuery, setHistoryQuery] = useState('');
  const visibleThreads = threads
    .filter((thread) => thread.messages?.length)
    .filter((thread) => !historyQuery.trim() || String(thread.title || '').toLowerCase().includes(historyQuery.trim().toLowerCase()))
    .slice(0, 8);

  const handleNavigate = (view) => {
    setCurrentView(view);
    setIsMobileOpen(false);
  };

  return (
    <>
      {isMobileOpen && <button className="workspace-sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setIsMobileOpen(false)} />}
      <aside className={`workspace-sidebar${isCollapsed ? ' workspace-sidebar-collapsed' : ''}${isMobileOpen ? ' workspace-sidebar-mobile-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <button type="button" className="sidebar-brand" onClick={onNewChat} title="AI-Bhideo home">
            <span className="brand-symbol" aria-hidden="true"><Film size={19} strokeWidth={2.2} /></span>
            <span className="brand-type">
              <strong>AI-Bhideo</strong>
              <small>CREATIVE WORKSPACE</small>
            </span>
          </button>
          <button type="button" className="sidebar-collapse-button" onClick={() => setIsCollapsed((collapsed) => !collapsed)} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button type="button" className="sidebar-mobile-close" onClick={() => setIsMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="sidebar-main-actions">
          <button type="button" className="new-chat-button" onClick={onNewChat} title={isCollapsed ? 'New chat' : undefined}>
            <Plus size={18} strokeWidth={2.2} />
            <span>New chat</span>
            <kbd>⌘ K</kbd>
          </button>
          {!isCollapsed && (
            <div className="sidebar-search-row">
              <Search size={15} aria-hidden="true" />
              <input
                aria-label="Search recent chats"
                placeholder="Search your chats"
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
              />
              {historyQuery && <button type="button" onClick={() => setHistoryQuery('')} aria-label="Clear chat search"><X size={14} /></button>}
            </div>
          )}
          {isCollapsed && (
            <button type="button" className="sidebar-icon-search" onClick={() => setIsCollapsed(false)} aria-label="Search chats" title="Search chats"><Search size={17} /></button>
          )}
        </div>

        <nav className="sidebar-navigation" aria-label="Workspace">
          <p className="sidebar-section-label">WORKSPACE</p>
          {PRIMARY_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'home' && currentView === 'chat');
            return (
              <button
                type="button"
                key={item.id}
                className={`sidebar-nav-link${isActive ? ' sidebar-nav-link-active' : ''}`}
                onClick={() => handleNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.9} />
                <span>{item.label}</span>
                {item.id === 'studio' && <span className="sidebar-nav-new">LOCAL</span>}
              </button>
            );
          })}
          <p className="sidebar-section-label sidebar-section-label-personal">YOUR SPACE</p>
          {PERSONAL_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                type="button"
                key={item.id}
                className={`sidebar-nav-link${isActive ? ' sidebar-nav-link-active' : ''}`}
                onClick={() => handleNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.9} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="sidebar-history">
            <div className="sidebar-history-heading">
              <p className="sidebar-section-label">RECENT</p>
            </div>
            {visibleThreads.length > 0 ? (
              <div className="sidebar-thread-list">
                {visibleThreads.map((thread) => (
                  <button type="button" key={thread.id} className={`sidebar-thread${activeChatId === thread.id && currentView === 'home' ? ' sidebar-thread-active' : ''}`} onClick={() => onSelectChat(thread.id)} title={thread.title}>
                    <Clock3 size={14} />
                    <span>{thread.title || 'Untitled conversation'}</span>
                    <small>{formatChatDate(thread.updatedAt)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="sidebar-no-history">{historyQuery ? 'No matching chats.' : 'Your conversations will appear here.'}</p>
            )}
          </div>
        )}

        {isCollapsed && (
          <div className="sidebar-collapsed-history" aria-label="Recent conversations">
            {visibleThreads.slice(0, 4).map((thread) => (
              <button type="button" key={thread.id} onClick={() => onSelectChat(thread.id)} className={activeChatId === thread.id && currentView === 'home' ? 'is-active' : ''} title={thread.title || 'Recent conversation'} aria-label={thread.title || 'Open recent conversation'}>
                <Clock3 size={15} />
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-bottom">
          {!isCollapsed && (
            <button type="button" className="sidebar-credit-card" onClick={onOpenCredits}>
              <span className="credit-card-top"><span><Zap size={14} fill="currentColor" /> Credits</span><ArrowUpRight size={14} /></span>
              <span className="credit-card-amount">{Number(user?.credits || 0).toLocaleString()} <small>available</small></span>
              <span className="credit-meter"><span style={{ width: `${Math.max(7, Math.min(100, (Number(user?.credits || 0) / Math.max(1, Number(user?.maxCredits || 1000))) * 100))}%` }} /></span>
              <span className="credit-plan-name">{user?.tier || 'Free plan'} <span>Manage plan</span></span>
            </button>
          )}
          {isCollapsed && (
            <button type="button" className="sidebar-collapsed-credit" onClick={onOpenCredits} title={`${Number(user?.credits || 0).toLocaleString()} credits available`} aria-label="Manage credits"><Zap size={17} /></button>
          )}
          <button type="button" className="sidebar-profile" onClick={() => handleNavigate('profile')} title={isCollapsed ? `Profile: ${user?.name || 'Creator'}` : undefined}>
            <span className="profile-avatar">{getInitials(user?.name)}</span>
            <span className="profile-copy"><strong>{user?.name || 'Creator'}</strong><small>{user?.tier || 'Member'}</small></span>
            <ChevronDown size={15} className="profile-chevron" />
          </button>
        </div>
      </aside>
    </>
  );
}

function WorkspaceTopbar({
  currentView,
  activeChat,
  user,
  models,
  selectedModel,
  setSelectedModel,
  setIsUpgradeModalOpen,
  setIsCollapsed,
  setIsMobileOpen,
  showToast,
  setCurrentView,
}) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const {
    isAuthenticated,
    setIsAuthModalOpen,
    setAuthModalMode,
    setIsApiKeysModalOpen,
    handleLogout,
  } = useApp();
  const currentLabel = currentView === 'home' && activeChat?.title ? activeChat.title : (VIEW_LABELS[currentView] || 'Workspace');

  return (
    <header className="workspace-topbar">
      <div className="topbar-leading">
        <button type="button" className="topbar-menu-button" onClick={() => {
          if (window.matchMedia('(max-width: 820px)').matches) setIsMobileOpen(true);
          else setIsCollapsed((collapsed) => !collapsed);
        }} aria-label="Toggle navigation" title="Toggle navigation">
          <Menu size={19} />
        </button>
        <div className="topbar-breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={14} />
          <strong title={currentLabel}>{currentLabel}</strong>
        </div>
      </div>
      <div className="topbar-trailing">
        <div className="topbar-local-status"><span className="status-dot" /> <span>LOCAL PREVIEW</span></div>
        <div className="topbar-model-wrap">
          <button type="button" className={`topbar-model-button${modelMenuOpen ? ' is-open' : ''}`} onClick={() => setModelMenuOpen((open) => !open)} aria-expanded={modelMenuOpen}>
            <span className="model-button-mark"><Sparkles size={14} /></span>
            <span className="topbar-model-name">{selectedModel?.name || 'Bhideo Cinema v3'}</span>
            <ChevronDown size={14} />
          </button>
          {modelMenuOpen && (
            <>
              <button type="button" className="popover-dismiss" aria-label="Close model selector" onClick={() => setModelMenuOpen(false)} />
              <div className="topbar-model-menu" role="menu" aria-label="Choose a render profile">
                <div className="model-menu-heading"><strong>Choose a profile</strong><span>Local render preset</span></div>
                {models.map((model) => (
                  <button type="button" key={model.id} role="menuitem" className={`model-option${selectedModel?.id === model.id ? ' model-option-selected' : ''}`} onClick={() => {
                    setSelectedModel(model);
                    setModelMenuOpen(false);
                    showToast('Render profile selected', `${model.name} is ready to use in Video Studio.`, 'success');
                  }}>
                    <span className="model-option-icon"><Film size={16} /></span>
                    <span className="model-option-copy"><strong>{model.name}</strong><small>{model.tag} · {model.creditCost} demo credits</small></span>
                    {selectedModel?.id === model.id && <span className="model-option-check">✓</span>}
                  </button>
                ))}
                <p className="model-menu-note">Profiles style a browser-rendered preview. They do not call a hosted model.</p>
              </div>
            </>
          )}
        </div>
        <button type="button" className="topbar-credit-button" onClick={() => setIsUpgradeModalOpen(true)} title="Manage credits">
          <Zap size={15} fill="currentColor" /><span>{Number(user?.credits || 0).toLocaleString()}</span><small>credits</small>
        </button>
        <span className="topbar-divider" />
        <button type="button" className="topbar-help-button" onClick={() => showToast('Preview mode', 'This interface is ready for a model API connection; current video previews render locally in your browser.', 'info')} aria-label="About local preview mode" title="About local preview mode"><CircleHelp size={17} /></button>
        <div className="topbar-profile-wrap">
          <button type="button" className="topbar-avatar" onClick={() => setProfileMenuOpen((open) => !open)} title="Account menu" aria-label="Open account menu" aria-expanded={profileMenuOpen}>{getInitials(user?.name)}</button>
          {profileMenuOpen && (
            <>
              <button type="button" className="popover-dismiss" aria-label="Close account menu" onClick={() => setProfileMenuOpen(false)} />
              <div className="topbar-profile-menu">
                <div className="profile-menu-identity">
                  <span className="profile-avatar">{getInitials(user?.name)}</span>
                  <span><strong>{user?.name || 'Creator'}</strong><small>{user?.email || user?.tier || 'AI-Bhideo account'}</small></span>
                </div>
                <button type="button" onClick={() => { setCurrentView('profile'); setProfileMenuOpen(false); }}><UserRound size={15} /><span>My profile & creations</span></button>
                <button type="button" onClick={() => { setIsApiKeysModalOpen(true); setProfileMenuOpen(false); }}><Settings size={15} /><span>Developer API keys</span></button>
                <div className="profile-menu-separator" />
                {isAuthenticated ? (
                  <button type="button" className="profile-menu-signout" onClick={() => { handleLogout(); setProfileMenuOpen(false); }}><LogOut size={15} /><span>Sign out</span></button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); setProfileMenuOpen(false); }}><UserRound size={15} /><span>Sign in</span></button>
                    <button type="button" className="profile-menu-signup" onClick={() => { setAuthModalMode('signup'); setIsAuthModalOpen(true); setProfileMenuOpen(false); }}><Sparkles size={15} /><span>Create an account</span></button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function WorkspaceLayout() {
  const {
    currentView,
    setCurrentView,
    user,
    models,
    selectedModel,
    setSelectedModel,
    setIsUpgradeModalOpen,
    showToast,
  } = useApp();
  const [threads, setThreads] = useState(() => normalizeChatThreads(readJSON(CHAT_THREADS_KEY, [])));
  const [activeChatId, setActiveChatId] = useState(() => readJSON(ACTIVE_CHAT_KEY, null));
  const [newChatVersion, setNewChatVersion] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    writeJSON(CHAT_THREADS_KEY, threads);
  }, [threads]);

  useEffect(() => {
    writeJSON(ACTIVE_CHAT_KEY, activeChatId);
    if (activeChatId && !threads.some((thread) => thread.id === activeChatId)) setActiveChatId(null);
  }, [activeChatId, threads]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [currentView]);

  const openNewChat = () => {
    setActiveChatId(null);
    setNewChatVersion((version) => version + 1);
    setCurrentView('home');
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openNewChat();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const selectChat = (threadId) => {
    setActiveChatId(threadId);
    setCurrentView('home');
    setIsMobileSidebarOpen(false);
  };

  const activeChat = threads.find((thread) => thread.id === activeChatId) || null;
  const isChatView = currentView === 'home' || currentView === 'chat';

  return (
    <div className={`workspace-shell${isSidebarCollapsed ? ' workspace-shell-collapsed' : ''}`}>
      <WorkspaceSidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        threads={threads}
        activeChatId={activeChatId}
        onNewChat={openNewChat}
        onSelectChat={selectChat}
        onOpenCredits={() => setIsUpgradeModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />
      <div className="workspace-main">
        <WorkspaceTopbar
          currentView={isChatView ? 'home' : currentView}
          activeChat={activeChat}
          user={user}
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          setIsUpgradeModalOpen={setIsUpgradeModalOpen}
          setIsCollapsed={setIsSidebarCollapsed}
          setIsMobileOpen={setIsMobileSidebarOpen}
          showToast={showToast}
          setCurrentView={setCurrentView}
        />
        <main className={`workspace-content${isChatView ? ' workspace-content-chat' : ' workspace-content-legacy'}`}>
          <ErrorBoundary key={currentView} title="This section could not be loaded">
            {isChatView && <ChatWorkspace key={newChatVersion} threads={threads} setThreads={setThreads} activeChatId={activeChatId} setActiveChatId={setActiveChatId} />}
            {currentView === 'studio' && (
              <div className="legacy-view">
                <PromptStudio />
                <VideoShowcase />
                <Footer />
              </div>
            )}
            {currentView === 'showcase' && (
              <div className="legacy-view">
                <VideoShowcase />
                <Footer />
              </div>
            )}
            {currentView === 'models' && (
              <div className="legacy-view">
                <ModelArchitectureSection />
                <FeaturesGrid />
                <Footer />
              </div>
            )}
            {currentView === 'profile' && <div className="legacy-view"><UserProfile /><Footer /></div>}
            {currentView === 'pricing' && <div className="legacy-view"><PricingSection /><Footer /></div>}
          </ErrorBoundary>
        </main>
      </div>

      <div className="workspace-global-overlays">
        <ErrorBoundary title="An overlay could not be opened">
          <VideoLightboxModal />
          <AuthModal />
          <AiPromptAssistant />
          <ApiKeysModal />
          <UpgradeModal />
        </ErrorBoundary>
        <NotificationToast />
      </div>
    </div>
  );
}

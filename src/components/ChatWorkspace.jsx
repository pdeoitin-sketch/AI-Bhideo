import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Film,
  Image as ImageIcon,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  Mic,
  Paperclip,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INSPIRATION_PROMPTS } from '../data/mockData';

const STARTER_CARDS = [
  {
    id: 'cinema',
    title: 'A scene from a film',
    description: 'Build a cinematic opening shot',
    prompt: 'A lone cyclist rides through a quiet coastal town just before sunrise, pale blue mist drifting between the buildings, a slow tracking shot, soft film grain.',
    mode: 'create',
    art: 'art-cinema',
    icon: Film,
  },
  {
    id: 'product',
    title: 'A product story',
    description: 'Give a launch film a clear mood',
    prompt: 'A sculptural glass perfume bottle on a dark stone plinth, a ribbon of crimson silk floating past it, cool blue studio light, elegant slow-motion product film.',
    mode: 'create',
    art: 'art-product',
    icon: Sparkles,
  },
  {
    id: 'world',
    title: 'A world to explore',
    description: 'Imagine somewhere unexpected',
    prompt: 'A tiny floating garden above a sea of clouds, paper lanterns drifting between old stone arches, warm sunrise on the horizon, a gentle aerial camera move.',
    mode: 'create',
    art: 'art-world',
    icon: Lightbulb,
  },
];

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

function makeId(prefix = 'chat') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return 'File';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function createLocalReply(attachments = []) {
  if (attachments.length > 0) {
    const fileNames = attachments.map((file) => file.name).join(', ');
    return `I’ve added ${fileNames} to this conversation. In this preview, files stay in your browser and are not uploaded or analyzed by a model. You can still describe the scene you want to make, then continue in Video Studio.\n\nThis build uses a local, prompt-themed video renderer; no hosted AI inference service is connected.`;
  }

  return `Your idea is saved in this conversation. To make a strong first video pass, keep the direction focused on three things:\n\n• **Subject and action** — one clear focal point and a simple movement.\n• **Camera** — choose a single move, such as a slow push-in or a smooth pan.\n• **Light and mood** — describe the time of day, palette, and atmosphere.\n\nUse **Create video** to open the Studio with your prompt. This demo renders a prompt-themed clip in your browser; it does not connect to a hosted language or video model.`;
}

function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MessageContent({ content }) {
  return (
    <div className="message-copy">
      {String(content || '').split('\n').map((line, index) => {
        if (!line.trim()) return <div className="message-spacer" key={`line-${index}`} />;
        const isBullet = line.startsWith('• ');
        return (
          <p className={isBullet ? 'message-bullet' : ''} key={`line-${index}`}>
            {renderInline(isBullet ? line.slice(2) : line, `line-${index}`)}
          </p>
        );
      })}
    </div>
  );
}

function AttachmentChip({ file, removable, onRemove, compact = false }) {
  const isImage = String(file.type || '').startsWith('image/');
  const FileIcon = isImage ? ImageIcon : FileText;
  return (
    <div className={`attachment-chip${compact ? ' attachment-chip-compact' : ''}`}>
      <span className="attachment-icon"><FileIcon size={15} aria-hidden="true" /></span>
      <span className="attachment-copy">
        <span className="attachment-name" title={file.name}>{file.name}</span>
        <span className="attachment-size">{formatFileSize(file.size)}</span>
      </span>
      {removable && (
        <button type="button" className="attachment-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-row message-row-assistant" role="status" aria-label="Bhideo is preparing a response">
      <div className="assistant-avatar" aria-hidden="true"><Sparkles size={16} /></div>
      <div className="typing-indicator"><span /><span /><span /></div>
    </div>
  );
}

export function ChatWorkspace({ threads, setThreads, activeChatId, setActiveChatId }) {
  const {
    user,
    prompt,
    setPrompt,
    selectedAspectRatio,
    setSelectedAspectRatio,
    selectedDuration,
    setSelectedDuration,
    selectedFps,
    setSelectedFps,
    copyToClipboard,
    setCurrentView,
    showToast,
  } = useApp();
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [mode, setMode] = useState('ask');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);

  const activeThread = threads.find((thread) => thread.id === activeChatId) || null;
  const messages = activeThread?.messages || [];
  const hasConversation = messages.length > 0;
  const isWaiting = pendingThreadId === activeChatId && Boolean(activeChatId);
  const firstName = (user?.name || 'Creator').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    mountedRef.current = true;
    if (!activeChatId) textareaRef.current?.focus();
    return () => {
      mountedRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* Speech recognition may already be stopped. */ }
      }
    };
  }, []);

  useEffect(() => {
    setDraft('');
    setAttachments([]);
    setMode('ask');
    setIsSettingsOpen(false);
  }, [activeChatId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [draft]);

  useEffect(() => {
    if (!scrollRef.current || !hasConversation) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeChatId, messages.length, isWaiting]);

  const chooseStarter = (starter) => {
    setDraft(starter.prompt);
    setMode(starter.mode);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const updateThreadWithUserMessage = (content, attachedFiles) => {
    const existing = threads.find((thread) => thread.id === activeChatId) || null;
    const threadId = existing?.id || makeId();
    const now = Date.now();
    const safeContent = content.trim() || 'Please take a look at the attached file.';
    const userMessage = {
      id: makeId('message'),
      role: 'user',
      content: safeContent,
      attachments: attachedFiles.map(({ name, size, type }) => ({ name, size, type })),
      createdAt: now,
    };
    const nextThread = {
      id: threadId,
      title: existing?.messages?.length ? existing.title : (safeContent.length > 44 ? `${safeContent.slice(0, 44).trim()}…` : safeContent),
      updatedAt: now,
      messages: [...(existing?.messages || []), userMessage],
    };
    const nextThreads = [nextThread, ...threads.filter((thread) => thread.id !== threadId)].slice(0, 40);
    setThreads(nextThreads);
    setActiveChatId(threadId);
    return { threadId, safeContent, nextThread };
  };

  const handleSubmit = (event) => {
    event?.preventDefault();
    if (isWaiting) return;
    const content = draft.trim();
    if (!content && attachments.length === 0) return;
    if (mode === 'create' && !content) {
      showToast('Add a scene description', 'Write a text prompt before opening Video Studio.', 'warning');
      return;
    }

    const submittedFiles = [...attachments];
    const { threadId, safeContent } = updateThreadWithUserMessage(content, submittedFiles);
    setDraft('');
    setAttachments([]);

    if (mode === 'create') {
      setPrompt(safeContent);
      setMode('ask');
      setCurrentView('studio');
      showToast('Prompt sent to Video Studio', 'Refine your settings, then render a browser preview.', 'success');
      return;
    }

    setPendingThreadId(threadId);
    window.setTimeout(() => {
      const assistantMessage = {
        id: makeId('message'),
        role: 'assistant',
        content: createLocalReply(submittedFiles),
        sourcePrompt: safeContent,
        createdAt: Date.now(),
      };
      setThreads((currentThreads) => currentThreads.map((thread) => (
        thread.id === threadId
          ? { ...thread, updatedAt: Date.now(), messages: [...thread.messages, assistantMessage] }
          : thread
      )));
      if (mountedRef.current) {
        setPendingThreadId((currentId) => currentId === threadId ? null : currentId);
      }
    }, 520);
  };

  const handleFileSelection = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    const accepted = incoming.filter((file) => {
      if (file.size > MAX_FILE_BYTES) {
        showToast('File is too large', `${file.name} is over the 15 MB per-file limit.`, 'warning');
        return false;
      }
      return true;
    });
    setAttachments((current) => {
      const room = Math.max(0, MAX_ATTACHMENTS - current.length);
      if (accepted.length > room) {
        showToast('Attachment limit reached', `You can attach up to ${MAX_ATTACHMENTS} files per message.`, 'warning');
      }
      return [...current, ...accepted.slice(0, room)];
    });
  };

  const removeAttachment = (fileIndex) => {
    setAttachments((current) => current.filter((_, index) => index !== fileIndex));
  };

  const toggleVoiceInput = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input unavailable', 'Your browser does not support speech recognition. You can still type a prompt.', 'info');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) setDraft((current) => `${current}${current ? ' ' : ''}${transcript}`);
      };
      recognition.onerror = () => showToast('Voice input stopped', 'Please try again or type your prompt.', 'warning');
      recognition.onend = () => {
        recognitionRef.current = null;
        if (mountedRef.current) setIsListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      showToast('Could not start voice input', 'Check your browser microphone permission and try again.', 'warning');
      setIsListening(false);
    }
  };

  const openStudio = (scenePrompt) => {
    const text = String(scenePrompt || prompt || '').trim();
    if (text) setPrompt(text);
    setCurrentView('studio');
    showToast('Video Studio opened', 'Your scene is ready to refine and render locally.', 'success');
  };

  const handleCopy = (message) => {
    const copied = copyToClipboard(message.content);
    if (copied) {
      setCopiedMessageId(message.id);
      showToast('Response copied', 'The text is ready to paste.', 'success');
      window.setTimeout(() => setCopiedMessageId((id) => id === message.id ? null : id), 1800);
    } else {
      showToast('Copy failed', 'Your browser blocked clipboard access.', 'warning');
    }
  };

  const useRandomIdea = () => {
    const idea = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
    setDraft(idea.prompt);
    setMode('create');
    window.requestAnimationFrame(() => textareaRef.current?.focus());
    showToast('A new idea is ready', `Try “${idea.title}” in Video Studio.`, 'info');
  };

  return (
    <section className="chat-workspace" aria-label="AI-Bhideo conversation">
      <div className={`chat-scroll-area${hasConversation ? ' chat-scroll-area-conversation' : ''}`} ref={scrollRef}>
        {hasConversation ? (
          <div className="conversation-column">
            <div className="conversation-meta">
              <span className="conversation-date">{new Date(activeThread.updatedAt || Date.now()).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
              <span className="conversation-model"><span className="status-dot" /> Local preview assistant</span>
            </div>
            {messages.map((message) => (
              <article className={`message-row ${message.role === 'user' ? 'message-row-user' : 'message-row-assistant'}`} key={message.id}>
                {message.role === 'assistant' && (
                  <div className="assistant-avatar" aria-hidden="true"><Sparkles size={16} /></div>
                )}
                <div className={`message-card ${message.role === 'user' ? 'message-card-user' : 'message-card-assistant'}`}>
                  {message.role === 'assistant' && (
                    <div className="assistant-message-heading">
                      <span>Bhideo</span>
                      <span className="assistant-local-label">Local guide</span>
                    </div>
                  )}
                  <MessageContent content={message.content} />
                  {message.attachments?.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((file, index) => <AttachmentChip key={`${file.name}-${index}`} file={file} compact />)}
                    </div>
                  )}
                  {message.role === 'assistant' && (
                    <div className="assistant-message-actions">
                      <button type="button" className="message-icon-action" onClick={() => handleCopy(message)} aria-label="Copy response" title="Copy response">
                        {copiedMessageId === message.id ? <Check size={15} /> : <Copy size={15} />}
                        <span>{copiedMessageId === message.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button type="button" className="message-studio-action" onClick={() => openStudio(message.sourcePrompt)}>
                        <Film size={15} />
                        <span>Continue in Studio</span>
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {isWaiting && <TypingIndicator />}
          </div>
        ) : (
          <div className="welcome-state">
            <div className="welcome-badge"><span className="welcome-badge-mark"><Sparkles size={14} /></span> A creative studio for moving ideas</div>
            <h1>{greeting}, <span>{firstName}.</span></h1>
            <p className="welcome-subtitle">What would you like to make today?</p>
            <p className="welcome-description">Start with a question, shape a story, or send a scene straight to the video studio.</p>

            <div className="starter-grid" aria-label="Prompt ideas">
              {STARTER_CARDS.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button type="button" className="starter-card" key={starter.id} onClick={() => chooseStarter(starter)}>
                    <span className={`starter-art ${starter.art}`} aria-hidden="true">
                      <span className="starter-art-orbit" />
                      <span className="starter-art-symbol"><Icon size={18} /></span>
                    </span>
                    <span className="starter-card-copy">
                      <span className="starter-card-title">{starter.title}</span>
                      <span className="starter-card-description">{starter.description}</span>
                    </span>
                    <span className="starter-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
                  </button>
                );
              })}
            </div>
            <div className="welcome-shortcuts">
              <span>Need a spark?</span>
              <button type="button" onClick={useRandomIdea}><Wand2 size={14} /> Surprise me</button>
              <button type="button" onClick={() => setCurrentView('showcase')}>
                <Film size={14} /> Explore showcase
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="composer-dock">
        <form className="chat-composer" onSubmit={handleSubmit}>
          {attachments.length > 0 && (
            <div className="pending-attachments" aria-label="Files to attach">
              {attachments.map((file, index) => (
                <AttachmentChip key={`${file.name}-${index}`} file={file} removable onRemove={() => removeAttachment(index)} />
              ))}
            </div>
          )}
          {isSettingsOpen && (
            <div className="composer-settings-panel">
              <div className="composer-setting-heading"><SlidersHorizontal size={15} /><span>Clip settings</span><span className="settings-local-note">Applied in Video Studio</span></div>
              <label className="composer-setting">
                <span>Aspect ratio</span>
                <select value={selectedAspectRatio} onChange={(event) => setSelectedAspectRatio(event.target.value)}>
                  {['16:9', '9:16', '1:1', '2.39:1', '4:5'].map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </label>
              <label className="composer-setting">
                <span>Duration</span>
                <select value={selectedDuration} onChange={(event) => setSelectedDuration(event.target.value)}>
                  {['4s', '8s', '12s', '16s'].map((duration) => <option key={duration} value={duration}>{duration}</option>)}
                </select>
              </label>
              <label className="composer-setting">
                <span>Frame rate</span>
                <select value={selectedFps} onChange={(event) => setSelectedFps(Number(event.target.value))}>
                  {[24, 30, 60].map((fps) => <option key={fps} value={fps}>{fps} FPS</option>)}
                </select>
              </label>
              <button type="button" className="settings-close" onClick={() => setIsSettingsOpen(false)} aria-label="Close clip settings"><X size={15} /></button>
            </div>
          )}
          <label className="sr-only" htmlFor="bhideo-chat-input">Message AI-Bhideo</label>
          <textarea
            id="bhideo-chat-input"
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={mode === 'create' ? 'Describe the scene you want to bring to life…' : 'Ask Bhideo or describe an idea…'}
            maxLength={4000}
          />
          <div className="composer-toolbar">
            <div className="composer-toolbar-left">
              <input ref={fileInputRef} className="visually-hidden" type="file" multiple accept="image/*,.pdf,.txt,.md,.csv" onChange={handleFileSelection} />
              <button type="button" className="composer-icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach files" title="Attach files (15 MB max, 4 files)">
                <Paperclip size={17} />
              </button>
              <div className="composer-mode-wrap">
                <button type="button" className={`composer-mode-button${mode === 'create' ? ' composer-mode-create' : ''}`} onClick={() => setIsModeMenuOpen((open) => !open)} aria-expanded={isModeMenuOpen}>
                  {mode === 'create' ? <Film size={15} /> : <MessageSquareText size={15} />}
                  <span>{mode === 'create' ? 'Create video' : 'Ask Bhideo'}</span>
                  <ChevronDown size={13} />
                </button>
                {isModeMenuOpen && (
                  <div className="composer-popover mode-popover">
                    <button type="button" className={mode === 'ask' ? 'is-selected' : ''} onClick={() => { setMode('ask'); setIsModeMenuOpen(false); }}>
                      <MessageSquareText size={16} /><span><strong>Ask Bhideo</strong><small>Organize an idea in this local chat</small></span>
                    </button>
                    <button type="button" className={mode === 'create' ? 'is-selected' : ''} onClick={() => { setMode('create'); setIsModeMenuOpen(false); }}>
                      <Film size={16} /><span><strong>Create video</strong><small>Open Video Studio with your prompt</small></span>
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className={`composer-icon-button composer-settings-trigger${isSettingsOpen ? ' is-active' : ''}`} onClick={() => setIsSettingsOpen((open) => !open)} aria-label="Clip settings" title="Clip settings">
                <SlidersHorizontal size={16} />
              </button>
            </div>
            <div className="composer-toolbar-right">
              <span className="composer-char-count">{draft.length ? `${draft.length}/4000` : ' '}</span>
              <button type="button" className={`composer-icon-button voice-button${isListening ? ' is-listening' : ''}`} onClick={toggleVoiceInput} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} title={isListening ? 'Stop voice input' : 'Voice input'}>
                <Mic size={17} />
              </button>
              <button type="submit" className="composer-send-button" disabled={(!draft.trim() && attachments.length === 0) || isWaiting} aria-label={mode === 'create' ? 'Open Video Studio' : 'Send message'} title={mode === 'create' ? 'Continue in Video Studio' : 'Send message'}>
                {isWaiting ? <LoaderCircle size={17} className="spin-icon" /> : mode === 'create' ? <ArrowUpRight size={17} /> : <ArrowUp size={18} />}
              </button>
            </div>
          </div>
        </form>
        <div className="composer-footnote">
          <span className="local-mode-dot" />
          <span>Local preview mode · No hosted AI model is connected</span>
          <span className="footnote-separator">·</span>
          <span>Enter to send</span>
        </div>
      </div>
    </section>
  );
}

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { VideoCard } from './VideoCard';
import { 
  Film, 
  Search, 
  Filter, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Clock, 
  Flame, 
  X,
  SlidersHorizontal
} from 'lucide-react';

const CATEGORIES = [
  'All Showcase',
  'Photorealistic',
  'Sci-Fi & Cyberpunk',
  'Fantasy & Nature',
  'Anime & VFX',
  'Drone & Aerial',
  'Commercial & Ads',
  'My Generations'
];

export const VideoShowcase = () => {
  const { 
    communityVideos, 
    userCreations, 
    searchQuery, 
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setCurrentView
  } = useApp();

  const [selectedModelFilter, setSelectedModelFilter] = useState('All');
  const [sortBy, setSortBy] = useState('trending'); // 'trending' | 'likes' | 'newest'

  // Combine community videos and user creations for display
  const allVideos = useMemo(() => {
    // Unique by ID
    const map = new Map();
    [...userCreations, ...communityVideos].forEach(v => {
      if (!map.has(v.id)) map.set(v.id, v);
    });
    return Array.from(map.values());
  }, [communityVideos, userCreations]);

  // Filter & Sort
  const filteredVideos = useMemo(() => {
    return allVideos.filter(video => {
      // Category filter
      if (selectedCategory === 'My Generations') {
        const isUserGen = userCreations.some(uv => uv.id === video.id);
        if (!isUserGen) return false;
      } else if (selectedCategory !== 'All Showcase' && video.category !== selectedCategory) {
        return false;
      }

      // Model filter
      if (selectedModelFilter !== 'All' && video.model !== selectedModelFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPrompt = video.prompt?.toLowerCase().includes(q);
        const matchesTitle = video.title?.toLowerCase().includes(q);
        const matchesModel = video.model?.toLowerCase().includes(q);
        const matchesAuthor = video.author?.name?.toLowerCase().includes(q);
        if (!matchesPrompt && !matchesTitle && !matchesModel && !matchesAuthor) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'newest') return b.id.localeCompare(a.id);
      return (b.views || 0) - (a.views || 0); // Trending
    });
  }, [allVideos, userCreations, selectedCategory, selectedModelFilter, searchQuery, sortBy]);

  return (
    <section id="showcase-section" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Film className="w-4 h-4 text-cyan-400" />
            </span>
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-widest">
              Community Gallery & Inspiration
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white">
            Explore 4K AI Video Masterpieces
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Hover to preview animations in real time. Click any card to inspect model hyperparameters or remix the prompt directly into the studio.
          </p>
        </div>

        {/* Global Total Counter Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-dark-900 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>{filteredVideos.length} Curated Videos</span>
          </span>
        </div>
      </div>

      {/* Filter Category Tabs Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-dark-900/80 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {cat === 'My Generations' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Search & Sorting Toolbar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-white/10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompt keywords..."
            className="w-full bg-dark-900 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Model and Sort dropdowns */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Model Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden md:inline">Model:</span>
            <select
              value={selectedModelFilter}
              onChange={(e) => setSelectedModelFilter(e.target.value)}
              className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="All">All AI Models</option>
              <option value="Bhideo Cinema v3">Bhideo Cinema v3</option>
              <option value="Bhideo Turbo v2.1">Bhideo Turbo v2.1</option>
              <option value="Bhideo Motion Pro">Bhideo Motion Pro</option>
              <option value="Bhideo Anime-X">Bhideo Anime-X</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden md:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="trending">🔥 Trending</option>
              <option value="likes">❤️ Most Liked</option>
              <option value="newest">⚡ Newest</option>
            </select>
          </div>
        </div>

      </div>

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center max-w-lg mx-auto">
          <Film className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white">No Videos Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            No videos matched your filter criteria "{searchQuery || selectedCategory}".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All Showcase');
              setSelectedModelFilter('All');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition-all"
          >
            Reset All Filters
          </button>
        </div>
      )}

    </section>
  );
};

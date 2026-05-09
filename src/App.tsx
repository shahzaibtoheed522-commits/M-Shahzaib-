/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Download, 
  Music, 
  Video, 
  Home, 
  TrendingUp, 
  History, 
  Settings,
  MoreVertical,
  Play,
  Heart,
  Share2,
  X,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ListPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { GoogleGenAI } from "@google/genai";

// Types
interface MediaItem {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  type: 'music' | 'video';
  views: string;
  publishedAt: string;
}

interface Playlist {
  id: string;
  name: string;
  items: MediaItem[];
  createdAt: number;
}

const MOCK_DATA: MediaItem[] = [
  {
    id: '1',
    title: 'Top Hits 2024 - Non Stop Music',
    author: 'Music Central',
    thumbnail: 'https://picsum.photos/seed/music1/400/225',
    duration: '45:20',
    type: 'music',
    views: '1.2M views',
    publishedAt: '2 days ago'
  },
  {
    id: '2',
    title: 'New Movie Trailer 2025 - Official HD',
    author: 'Movie Studio',
    thumbnail: 'https://picsum.photos/seed/video1/400/225',
    duration: '2:34',
    type: 'video',
    views: '5M views',
    publishedAt: '1 week ago'
  },
  {
    id: '3',
    title: 'Relaxing Lo-Fi Beats for Study',
    author: 'LoFi Girl Clone',
    thumbnail: 'https://picsum.photos/seed/music2/400/225',
    duration: '11:00:00',
    type: 'music',
    views: '800K views',
    publishedAt: '5 hours ago'
  },
  {
    id: '4',
    title: 'Cooking Masterclass: Italian Pasta',
    author: 'Chef Mario',
    thumbnail: 'https://picsum.photos/seed/video2/400/225',
    duration: '12:45',
    type: 'video',
    views: '200K views',
    publishedAt: '3 days ago'
  },
  {
    id: '5',
    title: 'Midnight City - Synthwave Mix',
    author: 'Retro Future',
    thumbnail: 'https://picsum.photos/seed/music5/400/225',
    duration: '3:45',
    type: 'music',
    views: '1.5M views',
    publishedAt: '1 month ago'
  },
  {
    id: '6',
    title: 'Extreme Mountain Biking 4K',
    author: 'Adrenaline Junkie',
    thumbnail: 'https://picsum.photos/seed/video3/400/225',
    duration: '08:15',
    type: 'video',
    views: '890K views',
    publishedAt: '2 weeks ago'
  },
  {
    id: '7',
    title: 'Acoustic Guitar Sessions',
    author: 'Elena Rose',
    thumbnail: 'https://picsum.photos/seed/music7/400/225',
    duration: '4:20',
    type: 'music',
    views: '450K views',
    publishedAt: '5 days ago'
  },
  {
    id: '8',
    title: 'Space Journey: Documenting Mars',
    author: 'Galactic Horizon',
    thumbnail: 'https://picsum.photos/seed/video4/400/225',
    duration: '22:15',
    type: 'video',
    views: '2.1M views',
    publishedAt: '3 months ago'
  },
];

// Media items state and handlers
export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'music' | 'video' | 'downloads' | 'playlists'>('home');
  const [downloading, setDownloading] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [aiRecommendations, setAiRecommendations] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [customItems, setCustomItems] = useState<MediaItem[]>([]);

  const allMediaData = [...MOCK_DATA, ...customItems];

  const handleManualAdd = () => {
    const title = prompt("Enter title:");
    if (!title) return;
    const author = prompt("Enter artist/author:");
    if (!author) return;
    const type = confirm("Is this a Music track? (Cancel for Video)") ? 'music' : 'video';
    
    const newItem: MediaItem = {
      id: `custom-${Date.now()}`,
      title,
      author,
      thumbnail: `https://picsum.photos/seed/${Date.now()}/400/225`,
      duration: type === 'music' ? '3:30' : '10:00',
      type,
      views: '0 views',
      publishedAt: 'Just now'
    };
    
    setCustomItems(prev => [newItem, ...prev]);
  };

  // Lazy initialize Gemini only when needed
  const getAiModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    const genAI = new GoogleGenAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  };

  const createPlaylist = () => {
    const name = prompt("Enter playlist name:");
    if (!name) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      items: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const addToPlaylist = (item: MediaItem, playlistId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        if (pl.items.find(i => i.id === item.id)) return pl;
        return { ...pl, items: [...pl.items, item] };
      }
      return pl;
    }));
  };

  const removeFromPlaylist = (playlistId: string, itemId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, items: pl.items.filter(i => i.id !== itemId) };
      }
      return pl;
    }));
  };

  const renamePlaylist = (playlistId: string) => {
    const newName = prompt("Enter new name:");
    if (!newName) return;
    setPlaylists(prev => prev.map(pl => pl.id === playlistId ? { ...pl, name: newName } : pl));
  };

  const deletePlaylist = (playlistId: string) => {
    if (!confirm("Are you sure you want to delete this playlist?")) return;
    setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
  };

  const movePlaylistItem = (playlistId: string, itemId: string, direction: 'up' | 'down') => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        const index = pl.items.findIndex(i => i.id === itemId);
        if (index === -1) return pl;
        const newItems = [...pl.items];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newItems.length) return pl;
        
        const [movedItem] = newItems.splice(index, 1);
        newItems.splice(newIndex, 0, movedItem);
        return { ...pl, items: newItems };
      }
      return pl;
    }));
  };

  const handleDownload = (id: string) => {
    if (downloading.includes(id)) return;
    
    setDownloading(prev => [...prev, id]);
    setDownloadProgress(prev => ({ ...prev, [id]: 0 }));

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const next = (prev[id] || 0) + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          setDownloading(old => old.filter(item => item !== id));
          return { ...prev, [id]: 100 };
        }
        return { ...prev, [id]: next };
      });
    }, 500);
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const model = getAiModel();
      const prompt = `Act as a media recommendation engine for an app called Haseeb. 
      The user wants to find: "${searchQuery}". 
      Return a JSON array of 4 objects with fields: title, author, type (music or video). 
      Make the titles sound like real trending YouTube or Spotify content.
      Format: JSON only.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\[.*\]/s);
      if (match) {
        const data = JSON.parse(match[0]);
        const formatted: MediaItem[] = data.map((item: any, index: number) => ({
          id: `ai-${index}-${Date.now()}`,
          title: item.title,
          author: item.author,
          thumbnail: `https://picsum.photos/seed/ai-${index}-${Date.now()}/400/225`,
          duration: item.type === 'music' ? '3:45' : '10:20',
          type: item.type,
          views: `${Math.floor(Math.random() * 900 + 100)}K views`,
          publishedAt: 'Suggested for you'
        }));
        setAiRecommendations(formatted);
      }
    } catch (error) {
      console.error('AI Search failed:', error);
      alert(error instanceof Error ? error.message : 'AI search failed. Please check your configuration.');
    } finally {
      setIsSearching(false);
    }
  };

  const currentDisplayData = aiRecommendations.length > 0 && searchQuery 
    ? aiRecommendations 
    : allMediaData.filter(item => 
        (activeTab === 'home' || item.type === (activeTab === 'music' ? 'music' : 'video')) &&
        (item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
         item.author.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-600/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col pt-8 bg-[#0f0f0f] hidden md:flex">
        <div className="px-8 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-red-600/20">
            SH
          </div>
          <span className="text-2xl font-bold tracking-tight">Haseeb</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem 
            icon={<Home size={20} />} 
            label="Home" 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          <NavItem 
            icon={<Music size={20} />} 
            label="Music" 
            active={activeTab === 'music'} 
            onClick={() => setActiveTab('music')} 
          />
          <NavItem 
            icon={<Video size={20} />} 
            label="Videos" 
            active={activeTab === 'video'} 
            onClick={() => setActiveTab('video')} 
          />
          <NavItem 
            icon={<Download size={20} />} 
            label="Downloads" 
            active={activeTab === 'downloads'} 
            onClick={() => setActiveTab('downloads')} 
          />
          <NavItem 
            icon={<Heart size={20} />} 
            label="Playlists" 
            active={activeTab === 'playlists'} 
            onClick={() => setActiveTab('playlists')} 
          />
          
          <div className="pt-6 pb-2 px-4 text-xs font-semibold text-white/40 uppercase tracking-widest">
            Library
          </div>
          <NavItem icon={<History size={20} />} label="History" />
          <NavItem icon={<Heart size={20} />} label="Favorites" />
          <NavItem icon={<TrendingUp size={20} />} label="Trending" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
        <header className="sticky top-0 z-20 bg-[#1a1a1a]/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-4 text-white/60">
            <button className="hover:text-white transition-colors">Discover</button>
            <button className="hover:text-white transition-colors">Following</button>
          </div>

          <div className="flex-1 max-w-2xl px-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search music, videos, or paste link..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 transition-all placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
              />
              <button 
                onClick={handleAiSearch}
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full text-red-500 transition-all active:scale-90"
              >
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
              <History size={22} className="text-white/80" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center font-bold">
              H
            </div>
          </div>
        </header>

        <div className="px-4 md:px-8 py-8">
          {activeTab === 'home' && !searchQuery && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-3xl overflow-hidden mb-12 aspect-[21/9] md:aspect-[3/1] bg-gradient-to-r from-red-900 to-red-600 group cursor-pointer"
            >
              <img 
                src="https://picsum.photos/seed/haseeb-hero/1200/400" 
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 transition-transform duration-700 group-hover:scale-105"
                alt="Banner"
              />
              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-white/80 mb-4">
                  <Sparkles size={20} className="text-yellow-400" />
                  <span className="text-sm font-bold uppercase tracking-widest">Haseeb AI Choice</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
                  Fastest Video & Music<br />Downloader in the World
                </h2>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors">Start Discovery</button>
                  <button className="px-8 py-3 bg-black/40 backdrop-blur-md text-white font-bold rounded-full border border-white/20 hover:bg-black/60 transition-colors">How it works</button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTab === 'home' && 'Explore Everything'}
              {activeTab === 'music' && 'Latest Music'}
              {activeTab === 'video' && 'Hot Videos'}
              {activeTab === 'downloads' && 'Your Downloads'}
              {activeTab === 'playlists' && 'Your Playlists'}
            </h1>
            <div className="flex gap-2">
              {activeTab !== 'playlists' && activeTab !== 'downloads' && (
                <button 
                  onClick={handleManualAdd}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all flex items-center gap-2 group"
                  title="Add Media Manually"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                  <span className="text-xs font-bold hidden sm:inline">Add Song</span>
                </button>
              )}
              {activeTab === 'playlists' && (
                <button 
                  onClick={createPlaylist}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> New Playlist
                </button>
              )}
            </div>
          </div>

          {activeTab === 'playlists' ? (
            <div className="space-y-8">
              {!selectedPlaylistId ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {playlists.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/40">
                      <Heart size={64} strokeWidth={1} className="mb-4 opacity-20" />
                      <p>Create your first playlist to organize media</p>
                    </div>
                  ) : (
                    playlists.map(pl => (
                      <div 
                        key={pl.id} 
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className="bg-white/5 border border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                      >
                        <div className="aspect-square rounded-xl bg-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                          {pl.items[0] ? (
                            <img src={pl.items[0].thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                          ) : (
                            <Music size={40} className="text-white/20" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={24} />
                          </div>
                        </div>
                        <h3 className="font-bold truncate">{pl.name}</h3>
                        <p className="text-xs text-white/40 mt-1">{pl.items.length} items</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div>
                  <button 
                    onClick={() => setSelectedPlaylistId(null)}
                    className="flex items-center gap-2 text-white/40 hover:text-white mb-6 transition-colors"
                  >
                    <ChevronLeft size={18} /> Back to Playlists
                  </button>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-4xl font-black">{playlists.find(p => p.id === selectedPlaylistId)?.name}</h2>
                      <button onClick={() => renamePlaylist(selectedPlaylistId)} className="p-2 hover:bg-white/5 rounded-full"><Edit2 size={16} /></button>
                    </div>
                    <button onClick={() => deletePlaylist(selectedPlaylistId)} className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-full"><Trash2 size={18} /></button>
                  </div>
                  
                  <div className="space-y-2">
                    {playlists.find(p => p.id === selectedPlaylistId)?.items.length === 0 ? (
                      <p className="text-white/40 py-10 text-center">No items in this playlist. Browse and add some!</p>
                    ) : (
                      playlists.find(p => p.id === selectedPlaylistId)?.items.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl group hover:bg-white/10 transition-colors">
                          <span className="text-white/20 w-6 text-sm">{idx + 1}</span>
                          <img src={item.thumbnail} className="w-16 aspect-video rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.title}</h4>
                            <p className="text-xs text-white/40">{item.author}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => movePlaylistItem(selectedPlaylistId, item.id, 'up')}
                              disabled={idx === 0}
                              className="p-2 text-white/20 hover:text-white disabled:opacity-0"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button 
                              onClick={() => movePlaylistItem(selectedPlaylistId, item.id, 'down')}
                              disabled={idx === (playlists.find(p => p.id === selectedPlaylistId)?.items.length || 0) - 1}
                              className="p-2 text-white/20 hover:text-white disabled:opacity-0"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button 
                              onClick={() => removeFromPlaylist(selectedPlaylistId, item.id)}
                              className="p-2 text-white/20 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Trending Tags */}
              <div className="flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
                {['All', 'Music', 'Funny', 'Games', 'News', 'Movies', 'Shorts', 'Learning', 'Live', 'Tech'].map((tag) => (
                  <button 
                    key={tag}
                    onClick={() => setSearchQuery(tag === 'All' ? '' : tag)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                      (searchQuery === tag || (tag === 'All' && !searchQuery)) 
                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeTab === 'downloads' ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/40">
                    <Download size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <p>No active downloads</p>
                  </div>
                ) : (
                  currentDisplayData.map((item) => (
                    <MediaCard 
                      key={item.id} 
                      item={item} 
                      onDownload={() => handleDownload(item.id)}
                      isDownloading={downloading.includes(item.id)}
                      progress={downloadProgress[item.id]}
                      playlists={playlists}
                      onAddToPlaylist={(plId) => addToPlaylist(item, plId)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f0f0f]/90 backdrop-blur-lg border-t border-white/5 flex items-center justify-around z-50">
        <MobileNavItem icon={<Home size={20} />} active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <MobileNavItem icon={<Music size={20} />} active={activeTab === 'music'} onClick={() => setActiveTab('music')} />
        <MobileNavItem icon={<Video size={20} />} active={activeTab === 'video'} onClick={() => setActiveTab('video')} />
        <MobileNavItem icon={<Heart size={20} />} active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} />
        <MobileNavItem icon={<Download size={20} />} active={activeTab === 'downloads'} onClick={() => setActiveTab('downloads')} />
      </nav>

      {/* Floating Download Manager (Desktop) */}
      <AnimatePresence>
        {Object.keys(downloadProgress).some(id => downloadProgress[id] < 100) && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 right-8 w-80 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Downloads</h3>
              <button className="p-1 hover:bg-white/5 rounded-md"><X size={16} /></button>
            </div>
            <div className="max-h-60 overflow-y-auto p-4 space-y-4">
              {Object.entries(downloadProgress)
                .filter(([_, p]) => p < 100)
                .map(([id, p]) => {
                  const item = MOCK_DATA.find(m => m.id === id);
                  return (
                    <div key={id} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="truncate w-40">{item?.title}</span>
                        <span>{Math.round(p)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-red-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all",
        active ? "text-red-500 scale-110" : "text-white/40"
      )}
    >
      {icon}
    </button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
        active ? "bg-red-600 text-white font-medium shadow-lg shadow-red-600/20" : "text-white/60 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn("transition-transform duration-200 group-hover:scale-110", active && "text-white")}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function MediaCard({ 
  item, 
  onDownload, 
  isDownloading, 
  progress,
  playlists,
  onAddToPlaylist
}: { 
  item: MediaItem, 
  onDownload: () => void,
  isDownloading: boolean,
  progress?: number,
  playlists: Playlist[],
  onAddToPlaylist: (id: string) => void
}) {
  const [showPlaylists, setShowPlaylists] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all hover:bg-white/[0.08] relative"
    >
      <div className="relative aspect-video">
        <img 
          src={item.thumbnail} 
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
            <Play size={24} fill="currentColor" />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold">
          {item.duration}
        </div>
        {item.type === 'music' && (
          <div className="absolute top-2 left-2 p-1.5 bg-red-600 rounded-full">
            <Music size={12} />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug flex-1 group-hover:text-red-400 transition-colors">
            {item.title}
          </h3>
          <div className="relative">
            <button 
              onClick={() => setShowPlaylists(!showPlaylists)}
              className="text-white/20 hover:text-white transition-colors pt-0.5"
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {showPlaylists && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPlaylists(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden"
                  >
                    <div className="p-2 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/40 px-3">
                      Add to Playlist
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {playlists.length === 0 ? (
                        <div className="text-[11px] text-white/20 p-3 italic text-center">No playlists yet</div>
                      ) : (
                        playlists.map(pl => (
                          <button 
                            key={pl.id}
                            onClick={() => {
                              onAddToPlaylist(pl.id);
                              setShowPlaylists(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 rounded-lg truncate transition-colors"
                          >
                            {pl.name}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">
            {item.author[0]}
          </div>
          <div className="text-[11px] text-white/40 flex-1">
            <p className="font-medium hover:text-white transition-colors cursor-pointer">{item.author}</p>
            <p>{item.views} • {item.publishedAt}</p>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <button 
            onClick={onDownload}
            disabled={isDownloading || progress === 100}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95",
              isDownloading 
                ? "bg-white/10 text-white/50 cursor-not-allowed" 
                : progress === 100 
                  ? "bg-green-600/20 text-green-500 border border-green-500/30"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/10"
            )}
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {Math.round(progress || 0)}%
              </>
            ) : progress === 100 ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Downloaded
              </>
            ) : (
              <>
                <Download size={14} />
                Download
              </>
            )}
          </button>
          <button 
            onClick={() => setShowPlaylists(!showPlaylists)}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
          >
            <ListPlus size={14} className="text-white/60" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}


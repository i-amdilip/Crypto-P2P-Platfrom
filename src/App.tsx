import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  MessageSquare, 
  User as UserIcon, 
  Shield, 
  TrendingUp,
  History,
  Settings,
  ChevronRight,
  Send,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { User, Ad, Trade, Message } from './types';

// Mock Telegram WebApp for local dev
const WebApp = (window as any).Telegram?.WebApp || {
  initData: '',
  user: { id: 1, username: 'dev_user', first_name: 'Dev', last_name: 'User' },
  ready: () => {},
  expand: () => {},
  close: () => {},
  MainButton: {
    setText: () => {},
    show: () => {},
    hide: () => {},
    onClick: () => {},
  },
  setHeaderColor: () => {},
  setBackgroundColor: () => {},
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'market' | 'wallet' | 'trades' | 'profile'>('market');
  const [marketType, setMarketType] = useState<'buy' | 'sell'>('buy');
  const [ads, setAds] = useState<Ad[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor('#0a0a0a');
    WebApp.setBackgroundColor('#0a0a0a');
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'market') fetchAds();
    if (activeTab === 'trades') fetchTrades();
  }, [activeTab, marketType]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me', {
        headers: { 'x-telegram-init-data': WebApp.initData }
      });
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async () => {
    try {
      const res = await fetch(`/api/ads?type=${marketType}`, {
        headers: { 'x-telegram-init-data': WebApp.initData }
      });
      const data = await res.json();
      setAds(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades', {
        headers: { 'x-telegram-init-data': WebApp.initData }
      });
      const data = await res.json();
      setTrades(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTradeDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/trades/${id}`, {
        headers: { 'x-telegram-init-data': WebApp.initData }
      });
      const data = await res.json();
      setSelectedTrade(data);
    } catch (e) {
      console.error(e);
    }
  };

  const openTrade = async (ad: Ad, amount: number) => {
    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-init-data': WebApp.initData 
        },
        body: JSON.stringify({ ad_id: ad.id, amount_usdt: amount })
      });
      const data = await res.json();
      if (data.id) {
        setActiveTab('trades');
        fetchTradeDetail(data.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 relative overflow-x-hidden">
      {/* Header */}
      <header className="p-4 flex items-center justify-between sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neon-green rounded-lg flex items-center justify-center neon-glow">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight">RoyalMint <span className="text-neon-green">P2P</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Balance</p>
            <p className="text-sm font-mono font-bold text-neon-green">{(user?.usdt_balance ?? 0).toFixed(2)} USDT</p>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
            <img src={user?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} alt="Avatar" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'market' && (
            <motion.div
              key="market"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Market Toggle */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                <button 
                  onClick={() => setMarketType('buy')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${marketType === 'buy' ? 'bg-neon-green text-black neon-glow' : 'text-white/60'}`}
                >
                  Buy USDT
                </button>
                <button 
                  onClick={() => setMarketType('sell')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${marketType === 'sell' ? 'bg-neon-green text-black neon-glow' : 'text-white/60'}`}
                >
                  Sell USDT
                </button>
              </div>

              {/* Ads List */}
              <div className="space-y-3">
                {ads.map(ad => (
                  <motion.div 
                    key={ad.id}
                    whileTap={{ scale: 0.98 }}
                    className="glass p-4 rounded-2xl space-y-3 relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                          {ad.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-1">
                            {ad.username}
                            {ad.is_verified && <CheckCircle2 className="w-3 h-3 text-neon-green" />}
                          </p>
                          <p className="text-[10px] text-white/40">{ad.trades_completed} trades • {(ad.rating ?? 0).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-white">₹{(ad.price ?? 0).toFixed(2)}</p>
                        <p className="text-[10px] text-white/40">Price per USDT</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-white/5 pt-3">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Limits</p>
                        <p className="text-xs font-medium">₹{ad.min_limit} - ₹{ad.max_limit}</p>
                      </div>
                      <button 
                        onClick={() => openTrade(ad, 10)} // Mock 10 USDT trade for now
                        className="px-6 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-neon-green transition-colors"
                      >
                        {marketType === 'buy' ? 'Buy' : 'Sell'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="glass p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <TrendingUp className="w-24 h-24" />
                </div>
                <p className="text-sm text-white/60 mb-1">Total Balance</p>
                <h2 className="text-4xl font-display font-bold mb-6">₹{((user?.usdt_balance ?? 0) * 90 + (user?.inr_balance ?? 0)).toFixed(2)}</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase mb-1">USDT Wallet</p>
                    <p className="text-xl font-mono font-bold text-neon-green">{(user?.usdt_balance ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-white/40 uppercase mb-1">INR Wallet</p>
                    <p className="text-xl font-mono font-bold text-royal-gold">₹{(user?.inr_balance ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 bg-neon-green text-black p-4 rounded-2xl font-bold neon-glow">
                  <ArrowDownLeft className="w-5 h-5" /> Deposit
                </button>
                <button className="flex items-center justify-center gap-2 glass p-4 rounded-2xl font-bold">
                  <ArrowUpRight className="w-5 h-5" /> Withdraw
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4" /> Recent Activity</h3>
                  <button className="text-xs text-neon-green">View All</button>
                </div>
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="glass p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white/40" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Deposit USDT</p>
                          <p className="text-[10px] text-white/40">Feb 28, 2024 • 14:20</p>
                        </div>
                      </div>
                      <p className="text-sm font-mono font-bold text-neon-green">+100.00</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'trades' && (
            <motion.div
              key="trades"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold px-2">Active Trades</h2>
              {trades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-white/20">
                  <MessageSquare className="w-16 h-16 mb-4" />
                  <p>No active trades found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trades.map(trade => (
                    <div 
                      key={trade.id} 
                      onClick={() => fetchTradeDetail(trade.id)}
                      className="glass p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:border-neon-green/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trade.status === 'completed' ? 'bg-neon-green/20 text-neon-green' : 'bg-royal-gold/20 text-royal-gold'}`}>
                          {trade.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">Trade #{trade.id}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                            {trade.buyer_id === user?.id ? `Buying from ${trade.seller_username}` : `Selling to ${trade.buyer_username}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold">₹{(trade.amount_inr ?? 0).toFixed(2)}</p>
                        <p className={`text-[10px] font-bold uppercase ${trade.status === 'completed' ? 'text-neon-green' : 'text-royal-gold'}`}>{trade.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center py-6">
                <div className="w-24 h-24 rounded-full border-4 border-neon-green p-1 mb-4 neon-glow">
                  <img src={user?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} className="w-full h-full rounded-full object-cover" alt="Profile" />
                </div>
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  {user?.first_name} {user?.last_name}
                  {user?.is_verified && <CheckCircle2 className="w-5 h-5 text-neon-green" />}
                </h2>
                <p className="text-white/40 text-sm">@{user?.username}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="glass p-3 rounded-2xl text-center">
                  <p className="text-lg font-bold text-neon-green">{user?.trades_completed}</p>
                  <p className="text-[10px] text-white/40 uppercase">Trades</p>
                </div>
                <div className="glass p-3 rounded-2xl text-center">
                  <p className="text-lg font-bold text-royal-gold">{(user?.rating ?? 0).toFixed(1)}%</p>
                  <p className="text-[10px] text-white/40 uppercase">Rating</p>
                </div>
                <div className="glass p-3 rounded-2xl text-center">
                  <p className="text-lg font-bold">1y</p>
                  <p className="text-[10px] text-white/40 uppercase">Age</p>
                </div>
              </div>

              <div className="space-y-2">
                <button className="w-full glass p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-white/40 group-hover:text-neon-green transition-colors" />
                    <span className="font-medium">Account Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
                <button className="w-full glass p-4 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-white/40 group-hover:text-neon-green transition-colors" />
                    <span className="font-medium">Verification Center</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
                {user?.is_admin && (
                  <button className="w-full glass p-4 rounded-2xl flex items-center justify-between group border-neon-green/20">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-neon-green" />
                      <span className="font-medium text-neon-green">Admin Dashboard</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neon-green/40" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Trade Detail Modal */}
      <AnimatePresence>
        {selectedTrade && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <button onClick={() => setSelectedTrade(null)} className="p-2 bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-xs text-white/40 uppercase font-bold">Trade #{selectedTrade.id}</p>
                <p className="text-sm font-bold text-neon-green">₹{(selectedTrade.amount_inr ?? 0).toFixed(2)}</p>
              </div>
              <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Status Banner */}
              <div className="glass p-4 rounded-2xl flex items-center gap-4 border-neon-green/20">
                <div className="w-12 h-12 bg-neon-green/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <p className="font-bold text-neon-green uppercase text-sm">{selectedTrade.status}</p>
                  <p className="text-xs text-white/60">
                    {selectedTrade.status === 'pending' && 'Waiting for buyer to pay'}
                    {selectedTrade.status === 'paid' && 'Buyer has marked as paid. Verify and release.'}
                    {selectedTrade.status === 'completed' && 'Trade completed successfully'}
                  </p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase px-2">Trade Chat</h3>
                <div className="space-y-3">
                  {selectedTrade.messages?.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender_id === user?.id ? 'bg-neon-green text-black rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white/5 border-t border-white/10 space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neon-green"
                />
                <button className="w-12 h-12 bg-neon-green text-black rounded-xl flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {selectedTrade.status === 'pending' && selectedTrade.buyer_id === user?.id && (
                <button className="w-full py-4 bg-white text-black rounded-2xl font-bold">I Have Paid</button>
              )}
              {selectedTrade.status === 'paid' && selectedTrade.seller_id === user?.id && (
                <button className="w-full py-4 bg-neon-green text-black rounded-2xl font-bold neon-glow">Release USDT</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 z-40">
        <div className="max-w-md mx-auto glass rounded-2xl p-2 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'market' ? 'bg-neon-green text-black' : 'text-white/40'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] font-bold">Market</span>
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'wallet' ? 'bg-neon-green text-black' : 'text-white/40'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-bold">Wallet</span>
          </button>
          <button 
            onClick={() => setActiveTab('trades')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'trades' ? 'bg-neon-green text-black' : 'text-white/40'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-bold">Trades</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-neon-green text-black' : 'text-white/40'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </nav>

      {/* Floating Action Button */}
      {activeTab === 'market' && (
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-28 right-6 w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl z-30"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}

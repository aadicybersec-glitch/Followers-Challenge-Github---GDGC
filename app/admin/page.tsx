"use client";

import { useEffect, useState, useRef } from "react";
import { 
  motion, 
  AnimatePresence, 
  useMotionTemplate, 
  useMotionValue, 
  useSpring,
  LayoutGroup
} from "framer-motion";
import { 
  Play, 
  Square, 
  Users, 
  Activity, 
  Trophy,
  Sparkles,
  Crown,
  Medal,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Fingerprint,
  Search
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type User = {
  username: string;
  githubId: string;
  followers: number;
};

// --- Visual Components ---

const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

  const transform = useMotionTemplate`perspective(1000px) rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(yPct * -5); 
    y.set(xPct * 5); 
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-200",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};

const AnimatedBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#030014]">
    <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] rounded-full bg-cyan-900/20 blur-[120px] animate-pulse delay-700" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
  </div>
);

// Helper for Rank Icons
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 0) return (
    <div className="relative">
      <motion.div 
        animate={{ y: [0, -5, 0] }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6 left-1/2 -translate-x-1/2"
      >
        <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
      </motion.div>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-300">
        1
      </div>
    </div>
  );
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-bold text-black shadow-lg shadow-gray-500/20 ring-1 ring-gray-300">
      <Medal className="w-4 h-4 mr-0.5" /> 2
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-400">
      <Medal className="w-4 h-4 mr-0.5" /> 3
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-gray-500">
      {rank + 1}
    </div>
  );
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState<{ started: boolean }>({ started: false });
  // 📺 Stage Mode State
  const [isStageMode, setIsStageMode] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const sorted = data.sort((a: User, b: User) => b.followers - a.followers);
      setUsers(sorted);
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchTimer = async () => {
    try {
      const res = await fetch("/api/timer");
      const data = await res.json();
      setTimer(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 3000); // Faster polling for overtaking updates
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    await fetch("/api/timer", { method: "POST", body: JSON.stringify({ action: "start" }) });
    fetchTimer();
  };

  const handleEnd = async () => {
    await fetch("/api/timer", { method: "POST", body: JSON.stringify({ action: "end" }) });
    fetchTimer();
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center p-6 md:p-12 gap-8 font-sans text-white overflow-x-hidden selection:bg-indigo-500/30 transition-all duration-500">
      <AnimatedBackground />

      {/* Header - Hidden in Stage Mode */}
      <motion.div 
        layout
        className={cn(
          "z-10 w-full max-w-6xl flex justify-between items-end border-b border-white/10 pb-6 transition-all duration-500",
          isStageMode ? "opacity-0 h-0 overflow-hidden pb-0 border-none" : "opacity-100"
        )}
      >
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Restricted Access</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            Admin Console
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg flex items-center gap-3">
            <Users className="w-4 h-4 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Total Players</span>
              <span className="text-sm font-mono font-bold">{users.length}</span>
            </div>
          </div>
          
          {/* Stage Mode Toggle Button */}
          <button 
            onClick={() => setIsStageMode(!isStageMode)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
          >
            {isStageMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isStageMode ? "Exit Stage" : "Stage Mode"}
          </button>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className={cn(
        "z-10 w-full grid gap-6 transition-all duration-500",
        isStageMode ? "max-w-[95vw] grid-cols-1" : "max-w-6xl grid-cols-1 md:grid-cols-12"
      )}>
        
        {/* LEFT: Control Panel (Hidden in Stage Mode) */}
        {!isStageMode && (
          <motion.div 
            initial={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="md:col-span-4 flex flex-col gap-6"
          >
            {/* 1. Game State Card */}
            <TiltCard className="p-6 flex flex-col justify-between">
               <div>
                  <h3 className="text-xl font-bold text-white mb-1">Game Controls</h3>
                  <p className="text-sm text-gray-400">Manage the live competition state.</p>
               </div>

               <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
                  <div className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500",
                    timer.started 
                      ? "border-green-500/30 bg-green-500/10 shadow-green-500/20" 
                      : "border-red-500/30 bg-red-500/10 shadow-red-500/20"
                  )}>
                      {timer.started ? (
                         <Activity className="w-12 h-12 text-green-500 animate-pulse" />
                      ) : (
                         <Square className="w-12 h-12 text-red-500 fill-red-500/50" />
                      )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Current State</p>
                    <p className={cn("text-2xl font-bold", timer.started ? "text-green-400" : "text-red-400")}>
                      {timer.started ? "LIVE ROUND" : "OFFLINE"}
                    </p>
                  </div>
               </div>

               {!timer.started ? (
                  <button
                    onClick={handleStart}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                  >
                    <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                    INITIALIZE ROUND
                  </button>
               ) : (
                  <button
                    onClick={handleEnd}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                  >
                    <Square className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                    TERMINATE ROUND
                  </button>
               )}
            </TiltCard>

            {/* 2. 🔥 NEW: Live Attendee Roster (The feature you requested) */}
            <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 max-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                   <Fingerprint className="w-5 h-5 text-indigo-400" />
                   <h3 className="font-bold text-white">Live Roster</h3>
                </div>
                <div className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                  {users.length} Online
                </div>
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {users.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">Waiting for logins...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {/* Displaying users as simple cards, separate from ranking */}
                    {users.map((user, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={`${user.githubId}-roster`}
                        className="flex items-center gap-3 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                      >
                         <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                         <span className="text-sm font-medium text-gray-200 truncate">{user.username}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/20 border border-white/5 backdrop-blur-sm">
               <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <strong className="text-gray-200">Pro Tip:</strong> Enter "Stage Mode" to project the leaderboard on the big screen without showing these admin controls.
                  </p>
               </div>
            </div>
          </motion.div>
        )}

        {/* RIGHT: Live Data Feed (Expands in Stage Mode) */}
        <motion.div 
          layout
          className={cn(
            "h-full transition-all duration-500 ease-in-out",
            isStageMode ? "col-span-1" : "md:col-span-8"
          )}
        >
          <div className={cn(
            "bg-zinc-900/40 border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col h-full",
            isStageMode ? "min-h-[90vh] border-none bg-black/40" : "min-h-[500px]"
          )}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className={cn("font-bold text-white flex items-center gap-2 transition-all", isStageMode ? "text-3xl" : "text-lg")}>
                <Trophy className={cn("text-indigo-400", isStageMode ? "w-8 h-8" : "w-4 h-4")} />
                Live Standings
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-xs text-indigo-300 font-mono">LIVE SYNC</span>
                {isStageMode && (
                   <button onClick={() => setIsStageMode(false)} className="ml-4 text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">
                     <Minimize2 className="w-3 h-3" />
                   </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20 text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Participant</th>
                    <th className="px-6 py-4 text-right">Metric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <LayoutGroup>
                    <AnimatePresence mode='popLayout'>
                      {users.map((user, index) => (
                        <motion.tr
                          layout
                          key={user.githubId}
                          initial={{ opacity: 0, scale: 0.9, backgroundColor: "rgba(99, 102, 241, 0.5)" }} 
                          animate={{ opacity: 1, scale: 1, backgroundColor: "rgba(0,0,0,0)" }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ 
                            duration: 0.6, 
                            type: "spring",
                            bounce: 0.3,
                            backgroundColor: { duration: 1.5 } // ⚡ Flash duration
                          }}
                          className={cn(
                            "group hover:bg-white/5 transition-colors relative",
                            index === 0 && !isStageMode ? "bg-gradient-to-r from-yellow-500/10 to-transparent" : "",
                            isStageMode && index === 0 ? "bg-yellow-500/10" : ""
                          )}
                        >
                          <td className="px-6 py-4 relative">
                            {/* 🔥 Crown / Medal Logic handled in RankBadge */}
                            <RankBadge rank={index} />
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                                "font-mono text-gray-200 group-hover:text-white transition-colors",
                                isStageMode ? "text-2xl font-bold" : "text-sm"
                            )}>
                              {user.username}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                                "font-mono text-indigo-300 font-bold",
                                isStageMode ? "text-2xl" : "text-sm"
                            )}>
                              {user.followers.toLocaleString()}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </LayoutGroup>
                  
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-600 text-sm">
                        No active participants connected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
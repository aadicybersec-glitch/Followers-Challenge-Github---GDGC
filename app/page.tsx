"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { 
  motion, 
  useMotionTemplate, 
  useMotionValue, 
  useSpring, 
  AnimatePresence,
  LayoutGroup
} from "framer-motion";
import { 
  Github, 
  Trophy, 
  Timer, 
  User as UserIcon, 
  LogOut, 
  Sparkles, 
  Maximize, 
  Minimize, 
  Wifi, 
  WifiOff,
  Crown,
  Medal
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

// --- Components ---

// 1. Rank Badge Helper (Crowns & Medals)
const RankBadge = ({ rank, isStageMode }: { rank: number, isStageMode: boolean }) => {
  if (rank === 0) return (
    <div className="relative flex items-center justify-center">
      <motion.div 
        animate={{ y: [0, -5, 0] }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-6"
      >
        <Crown className={cn(
          "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]",
          isStageMode ? "w-10 h-10" : "w-6 h-6"
        )} />
      </motion.div>
      <div className={cn(
        "rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-300",
        isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm"
      )}>
        1
      </div>
    </div>
  );
  if (rank === 1) return (
    <div className={cn(
      "rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-bold text-black shadow-lg shadow-gray-500/20 ring-1 ring-gray-300",
      isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm"
    )}>
      <Medal className={cn("mr-1", isStageMode ? "w-6 h-6" : "w-3 h-3")} /> 2
    </div>
  );
  if (rank === 2) return (
    <div className={cn(
      "rounded-lg bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-400",
      isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm"
    )}>
      <Medal className={cn("mr-1", isStageMode ? "w-6 h-6" : "w-3 h-3")} /> 3
    </div>
  );
  return (
    <div className={cn(
      "rounded-lg bg-white/5 flex items-center justify-center font-bold text-gray-500",
      isStageMode ? "w-12 h-12 text-xl" : "w-8 h-8 text-sm"
    )}>
      {rank + 1}
    </div>
  );
};

// 2. Winner Reveal Overlay
const ConfettiExplosion = () => {
  const particles = [...Array(40)].map((_, i) => ({
    id: i,
    x: Math.random() * 100 - 50, 
    y: Math.random() * 100 - 50,
    color: ["#FFD700", "#FF4500", "#4B0082", "#00CED1"][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x * 15, y: p.y * 15, scale: 0, opacity: 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          style={{ backgroundColor: p.color }}
          className="w-3 h-3 rounded-full absolute"
        />
      ))}
    </div>
  );
};

const WinnerReveal = ({ winner, onDismiss }: { winner: User; onDismiss: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
    onClick={onDismiss}
  >
    <ConfettiExplosion />
    <motion.div
      initial={{ scale: 0.5, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.5 }}
      className="relative flex flex-col items-center gap-6 p-12 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-3xl border border-yellow-500/30 shadow-[0_0_100px_-20px_rgba(234,179,8,0.3)]"
    >
      <div className="absolute -top-12">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 animate-pulse" />
          <Trophy className="w-24 h-24 text-yellow-400 fill-yellow-400" />
        </div>
      </div>
      
      <div className="text-center mt-8 space-y-2">
        <h2 className="text-3xl font-bold text-yellow-200 uppercase tracking-widest">Champion</h2>
        <h1 className="text-6xl md:text-8xl font-black text-white drop-shadow-2xl">
          {winner.username}
        </h1>
        <p className="text-2xl text-yellow-400/80 font-mono mt-4">
          {winner.followers.toLocaleString()} Followers
        </p>
      </div>

      <div className="text-sm text-gray-500 mt-8 animate-pulse">Click anywhere to close</div>
    </motion.div>
  </motion.div>
);

// 3. 3D Tilt Card Component
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
    x.set(yPct * -10);
    y.set(xPct * 10);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-200 hover:shadow-indigo-500/20",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      {children}
    </motion.div>
  );
};

// 4. Animated Background
const AnimatedBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#030014]">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-700/20 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-700/20 blur-[120px] animate-pulse delay-700" />
    <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-purple-700/20 blur-[100px] animate-pulse delay-1000" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
  </div>
);

export default function Home() {
  const { data: session } = useSession();
  
  // --- State ---
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState<{ started: boolean; startTime?: string }>({ started: false });
  const [wsConnected, setWsConnected] = useState(false);
  const [showWinner, setShowWinner] = useState<User | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- 🛡️ Anti-Refresh Abuse Protection ---
  useEffect(() => {
    const cachedUsers = localStorage.getItem("leaderboard_cache");
    const cachedTimer = localStorage.getItem("timer_cache");
    if (cachedUsers) setUsers(JSON.parse(cachedUsers));
    if (cachedTimer) setTimer(JSON.parse(cachedTimer));
  }, []);

  useEffect(() => {
    if (users.length > 0) localStorage.setItem("leaderboard_cache", JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem("timer_cache", JSON.stringify(timer));
  }, [timer]);

  // --- 🔥 WebSocket Logic ---
  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001");

    ws.onopen = () => {
      setWsConnected(true);
      console.log("🔥 Connected to Live Stream");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "leaderboard_update") setUsers(message.data);
        if (message.type === "timer_update") setTimer(message.data);
        if (message.type === "game_over") setShowWinner(message.winner);
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onclose = () => setWsConnected(false);
    return () => ws.close();
  }, []);

  // --- Fallback Polling ---
  useEffect(() => {
    if (wsConnected) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
      } catch (e) { console.error("Fetch error"); }
    };

    const interval = setInterval(fetchUsers, timer.started ? 3000 : 15000); // Faster polling for smooth animation
    fetchUsers();
    return () => clearInterval(interval);
  }, [timer.started, wsConnected]);

  // Fetch timer periodically
  useEffect(() => {
    const fetchTimer = async () => {
      const res = await fetch("/api/timer");
      const data = await res.json();
      
      if (timer.started && !data.started && users.length > 0) {
        setShowWinner(users[0]);
      }
      setTimer(data);
    };
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [timer.started, users]);

  // --- 📺 Projector Mode Logic ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const progress = timer.started ? 100 : 0;

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start p-4 md:p-12 gap-10 font-sans text-white overflow-x-hidden selection:bg-indigo-500/30 transition-all duration-500">
      <AnimatedBackground />

      {/* 🏆 Winner Overlay */}
      <AnimatePresence>
        {showWinner && <WinnerReveal winner={showWinner} onDismiss={() => setShowWinner(null)} />}
      </AnimatePresence>

      {/* Header Section */}
      <motion.div 
        layout
        className="z-10 flex flex-col items-center gap-2 w-full relative"
      >
        {/* Top Bar Controls */}
        <div className="absolute right-0 top-0 flex items-center gap-3">
           <div className={cn(
             "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-colors",
             wsConnected ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
           )}>
             {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
             {wsConnected ? "REALTIME" : "POLLING"}
           </div>
           <button 
             onClick={toggleFullscreen}
             className="p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
             title="Stage Mode"
           >
             {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
           </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-indigo-300 uppercase tracking-widest shadow-lg">
          <Sparkles className="w-3 h-3" />
          <span>GDGC Event</span>
        </div>
        <motion.h1 
          layout
          className={cn(
            "font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50 tracking-tight drop-shadow-2xl transition-all duration-500",
            isFullscreen ? "text-7xl md:text-9xl mt-4" : "text-5xl md:text-7xl"
          )}
        >
          GitHub Legends
        </motion.h1>
      </motion.div>

      {/* Main Grid Layout */}
      <motion.div 
        layout
        className={cn(
          "z-10 w-full grid gap-8 items-start transition-all duration-500",
          isFullscreen ? "max-w-[95vw] grid-cols-1" : "max-w-5xl grid-cols-1 lg:grid-cols-12"
        )}
      >
        
        {/* Left Column: User Panel (Hidden in Fullscreen) */}
        {!isFullscreen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="lg:col-span-5 lg:sticky lg:top-12 flex flex-col gap-6"
          >
            <TiltCard className="p-8 flex flex-col items-center gap-6">
              {!session ? (
                <div className="text-center w-full space-y-6">
                  <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-indigo-500/50 shadow-[0_0_30px_-5px_rgba(79,70,229,0.3)]">
                    <Github className="w-10 h-10 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Join the Battle</h3>
                    <p className="text-gray-400 mt-2 text-sm">Sign in to appear on the live board.</p>
                  </div>
                  <button
                    onClick={() => signIn("github")}
                    className="group relative w-full py-4 bg-white text-black font-bold rounded-xl shadow-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                    <span className="flex items-center justify-center gap-2">
                      <Github className="w-5 h-5" />
                      Connect GitHub
                    </span>
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-6">
                   <div className="flex items-center gap-4">
                     <img src={session.user?.image || ""} alt="User" className="w-16 h-16 rounded-full border-2 border-white/20" />
                     <div>
                       <p className="text-sm text-indigo-300 font-medium">PLAYER</p>
                       <h3 className="text-xl font-bold text-white">{session.user?.name}</h3>
                     </div>
                   </div>
                   <div className="h-px bg-white/10" />
                   <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400 flex items-center gap-2"><Timer className="w-4 h-4"/> Status</span>
                        <span className={cn("text-xs font-bold px-2 py-1 rounded uppercase", timer.started ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                          {timer.started ? "Live" : "Waiting"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          className="bg-indigo-500 h-full" 
                          animate={{ width: `${progress}%` }} 
                          transition={{ duration: 1 }} 
                        />
                      </div>
                   </div>
                   <button onClick={() => signOut()} className="w-full py-3 text-sm text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">
                     <LogOut className="w-4 h-4 inline mr-2" /> Sign Out
                   </button>
                </div>
              )}
            </TiltCard>
          </motion.div>
        )}

        {/* Right Column: Leaderboard */}
        <motion.div 
          layout
          className={cn(
             "transition-all duration-500",
             isFullscreen ? "col-span-1" : "lg:col-span-7"
          )}
        >
          <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h2 className={cn("font-bold text-white flex items-center gap-2", isFullscreen ? "text-2xl" : "text-xl")}>
                <Trophy className={cn("text-yellow-500", isFullscreen ? "w-6 h-6" : "w-5 h-5")} />
                Live Standings
              </h2>
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full animate-pulse", wsConnected ? "bg-green-500" : "bg-yellow-500")}></span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{wsConnected ? "Live Sync" : "Syncing..."}</span>
              </div>
            </div>

            <div className="p-2">
              <table className="w-full text-left border-collapse">
                <thead className="text-xs uppercase text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4 text-right">Followers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <LayoutGroup>
                    <AnimatePresence mode="popLayout">
                      {users.map((user, idx) => (
                        <motion.tr
                          layout
                          key={user.githubId}
                          initial={{ opacity: 0, scale: 0.95, backgroundColor: "rgba(99, 102, 241, 0.5)" }} 
                          animate={{ opacity: 1, scale: 1, backgroundColor: "rgba(0,0,0,0)" }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ 
                            duration: 0.4, 
                            type: "spring",
                            backgroundColor: { duration: 2 } // ⚡ Flash duration
                          }}
                          className={cn(
                            "group hover:bg-white/5 transition-colors relative",
                            idx === 0 && !isFullscreen ? "bg-gradient-to-r from-yellow-500/10 to-transparent" : "",
                            isFullscreen && idx === 0 ? "bg-yellow-500/10" : ""
                          )}
                        >
                          <td className="px-6 py-4 relative">
                            {/* 🔥 Custom Rank Badge */}
                            <RankBadge rank={idx} isStageMode={isFullscreen} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {!isFullscreen && (
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                  <UserIcon className="w-4 h-4" />
                                </div>
                              )}
                              <span className={cn(
                                  "font-semibold text-gray-200 group-hover:text-white transition-colors",
                                  isFullscreen ? "text-3xl" : "text-base"
                              )}>
                                {user.username}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                               "font-mono text-indigo-300 font-medium bg-indigo-500/10 px-3 py-1 rounded border border-indigo-500/20",
                               isFullscreen ? "text-3xl font-bold" : "text-sm"
                            )}>
                              {user.followers.toLocaleString()}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </LayoutGroup>
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-12 text-center text-gray-500">Waiting for players to join...</div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
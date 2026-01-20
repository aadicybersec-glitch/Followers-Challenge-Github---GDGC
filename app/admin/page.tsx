"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { Crown, Medal, Activity, Square, Users } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type User = {
  username: string;
  githubId: string;
  followers: number;
};

// 3D Tilt Card
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
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
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

// Rank Badge
const RankBadge = ({ rank, isStageMode }: { rank: number; isStageMode: boolean }) => {
  if (rank === 0) return (
    <div className="relative flex items-center justify-center">
      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-6">
        <Crown className={cn("text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]", isStageMode ? "w-10 h-10" : "w-6 h-6")} />
      </motion.div>
      <div className={cn("rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-300", isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm")}>1</div>
    </div>
  );
  if (rank === 1) return (
    <div className={cn("rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-bold text-black shadow-lg shadow-gray-500/20 ring-1 ring-gray-300", isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm")}>
      <Medal className={cn("mr-1", isStageMode ? "w-6 h-6" : "w-3 h-3")} /> 2
    </div>
  );
  if (rank === 2) return (
    <div className={cn("rounded-lg bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-400", isStageMode ? "w-12 h-12 text-2xl" : "w-8 h-8 text-sm")}>
      <Medal className={cn("mr-1", isStageMode ? "w-6 h-6" : "w-3 h-3")} /> 3
    </div>
  );
  return <div className={cn("rounded-lg bg-white/5 flex items-center justify-center font-bold text-gray-500", isStageMode ? "w-12 h-12 text-xl" : "w-8 h-8 text-sm")}>{rank + 1}</div>;
};

// Animated Background
const AnimatedBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#030014]">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-700/20 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-700/20 blur-[120px] animate-pulse delay-700" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
  </div>
);

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState<{ started: boolean }>({ started: false });
  const [showWinner, setShowWinner] = useState<User | null>(null);
  const broadcast = useRef<BroadcastChannel | null>(null);

  // --- Setup BroadcastChannel for instant updates ---
  useEffect(() => {
    broadcast.current = new BroadcastChannel("timer_channel");
    broadcast.current.onmessage = (event) => {
      const data = event.data;
      if (data.started !== undefined) {
        setTimer({ started: data.started });
        if (!data.started && users.length > 0) setShowWinner(users[0]);
      }
    };
    return () => broadcast.current?.close();
  }, [users]);

  // --- Fetch users every 3s ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data.sort((a: User, b: User) => b.followers - a.followers));
      } catch (err) { console.error(err); }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Start / End round ---
  const handleStart = async () => {
    await fetch("/api/timer", { method: "POST", body: JSON.stringify({ action: "start" }) });
    setTimer({ started: true });
    broadcast.current?.postMessage({ started: true });
  };
  const handleEnd = async () => {
    await fetch("/api/timer", { method: "POST", body: JSON.stringify({ action: "end" }) });
    setTimer({ started: false });
    broadcast.current?.postMessage({ started: false });
    if (users.length > 0) setShowWinner(users[0]);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start p-6 gap-8 font-sans text-white overflow-x-hidden selection:bg-indigo-500/30">
      <AnimatedBackground />
      <h1 className="text-5xl font-bold text-center mb-8">Admin Dashboard</h1>

      <div className="flex gap-6 w-full max-w-6xl">
        {/* Controls */}
        <TiltCard className="flex-1 p-6 flex flex-col gap-6">
          <h2 className="font-bold text-xl">Game Controls</h2>
          <div className="flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${timer.started ? "border-green-500/50" : "border-red-500/50"}`}>
              {timer.started ? <Activity className="w-12 h-12 text-green-500 animate-pulse" /> : <Square className="w-12 h-12 text-red-500" />}
            </div>
            <p className="font-bold text-lg">{timer.started ? "LIVE ROUND" : "OFFLINE"}</p>
          </div>
          {!timer.started ? (
            <button onClick={handleStart} className="bg-green-600 py-3 rounded-lg font-bold hover:bg-green-500 transition-colors">Start Round</button>
          ) : (
            <button onClick={handleEnd} className="bg-red-600 py-3 rounded-lg font-bold hover:bg-red-500 transition-colors">Terminate Round</button>
          )}
        </TiltCard>

        {/* Leaderboard */}
        <TiltCard className="flex-1 p-6 overflow-y-auto max-h-[500px]">
          <h2 className="font-bold text-xl mb-4">Live Standings</h2>
          <table className="w-full text-left">
            <thead className="text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-2">Rank</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2 text-right">Followers</th>
              </tr>
            </thead>
            <tbody>
              <LayoutGroup>
                <AnimatePresence>
                  {users.map((user, idx) => (
                    <motion.tr key={user.githubId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="border-b border-white/10">
                      <td className="px-4 py-2"><RankBadge rank={idx} isStageMode={false} /></td>
                      <td className="px-4 py-2">{user.username}</td>
                      <td className="px-4 py-2 text-right">{user.followers.toLocaleString()}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </LayoutGroup>
            </tbody>
          </table>
        </TiltCard>
      </div>

      <AnimatePresence>
        {showWinner && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowWinner(null)}>
            <motion.div className="bg-yellow-500/10 p-12 rounded-3xl text-center">
              <h2 className="text-4xl font-bold mb-2">{showWinner.username} Wins!</h2>
              <p className="text-lg">{showWinner.followers} Followers</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

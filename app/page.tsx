"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { Crown, Medal, Activity, Square } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type User = {
  username: string;
  githubId?: string;
  followers: number;
};

// --- 3D Tilt Card ---
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

// --- Rank Badge ---
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

// --- Animated Background ---
const AnimatedBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden bg-[#030014]">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-700/20 blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-700/20 blur-[120px] animate-pulse delay-700" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
  </div>
);

export default function AttendeeDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState<{ started: boolean }>({ started: false });
  const [showWinner, setShowWinner] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const broadcast = useRef<BroadcastChannel | null>(null);

  // --- BroadcastChannel for instant updates ---
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

// --- Fetch users and update GitHub followers every 3s (only if timer is live) ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        let data = await res.json();

        if (timer.started && data.length > 0) {
          // --- Update followers live from GitHub API ---
          data = await Promise.all(
            data.map(async (user: User) => {
              try {
                const githubRes = await fetch(`https://api.github.com/users/${user.username}`, {
                  headers: {
                    "Accept": "application/vnd.github+json",
                  },
                });

                if (!githubRes.ok) return user;

                const githubData = await githubRes.json();
                const followers = typeof githubData.followers === "number" ? githubData.followers : user.followers;

                return { ...user, followers };
              } catch (err) {
                console.error(`Failed to update ${user.username}:`, err);
                return user;
              }
            })
          );
        }

        setUsers(data.sort((a: User, b: User) => b.followers - a.followers));
      } catch (err) { console.error(err); }
    };
    fetchUsers();
    const interval = setInterval(() => { if (timer.started) fetchUsers(); }, 3000);
    return () => clearInterval(interval);
  }, [timer.started]);

  // --- Fetch timer every 1s as backup ---
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await fetch("/api/timer");
        const data = await res.json();
        setTimer(data);
      } catch (err) { console.error(err); }
    };
    fetchTimer();
    const interval = setInterval(fetchTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Connect GitHub username ---
  const handleConnectGithub = async () => {
    const username = usernameInput.trim();
    if (!username) return alert("Enter your GitHub username");
    setSaving(true);
    try {
      // Validate username exists on GitHub
      const githubRes = await fetch(`https://api.github.com/users/${username}`);
      if (!githubRes.ok) throw new Error("GitHub username not found");
      const githubData = await githubRes.json();

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, githubId: githubData.id }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else alert("Username saved!");
      setUsernameInput("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-start p-6 gap-8 font-sans text-white overflow-x-hidden selection:bg-indigo-500/30">
      <AnimatedBackground />
      <h1 className="text-5xl font-bold text-center mb-8">Attendee Dashboard</h1>

      {/* Connect GitHub */}
      <TiltCard className="w-full max-w-4xl p-6 flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter GitHub username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="px-4 py-2 rounded-lg text-black flex-1"
          />
          <button
            onClick={handleConnectGithub}
            disabled={saving}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Connect GitHub"}
          </button>
        </div>
      </TiltCard>

      {/* Timer */}
      <TiltCard className="w-full max-w-4xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${timer.started ? "border-green-500/50" : "border-red-500/50"}`}>
            {timer.started ? <Activity className="w-12 h-12 text-green-500 animate-pulse" /> : <Square className="w-12 h-12 text-red-500" />}
          </div>
          <p className="font-bold text-xl">{timer.started ? "LIVE ROUND" : "OFFLINE"}</p>
        </div>
      </TiltCard>

      {/* Live Standings */}
      <TiltCard className="w-full max-w-4xl p-6 overflow-y-auto max-h-[500px]">
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
                  <motion.tr key={user.githubId || user.username} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="border-b border-white/10">
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

      {/* Winner Overlay */}
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

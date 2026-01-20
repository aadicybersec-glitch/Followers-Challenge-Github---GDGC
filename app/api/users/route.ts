import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

type User = {
  githubId: string;
  username: string;
  followers?: number;
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");

    const timer = await db.collection("timer").findOne({});
    const competitionRunning = timer?.started ?? false;

    const rawUsers = await db.collection("users").find({}).toArray();
    const users: User[] = rawUsers.map((doc) => ({
      githubId: doc.githubId,
      username: doc.username,
      followers: doc.followers ?? 0,
    }));

    if (!competitionRunning) {
      // Freeze follower counts
      return NextResponse.json(users.sort((a, b) => (b.followers || 0) - (a.followers || 0)));
    }

    // Update follower counts live
    const usersWithFollowers = await Promise.all(
      users.map(async (user) => {
        try {
          const res = await fetch(`https://api.github.com/users/${user.username}`);
          const data = await res.json();
          const followers = data.followers ?? 0;

          // Update in DB
          await db.collection("users").updateOne(
            { githubId: user.githubId },
            { $set: { followers } }
          );

          return { ...user, followers };
        } catch {
          return { ...user, followers: user.followers ?? 0 };
        }
      })
    );

    usersWithFollowers.sort((a, b) => (b.followers || 0) - (a.followers || 0));
    return NextResponse.json(usersWithFollowers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch users" });
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Not authenticated" });

    const username = session.user.name!;
    const githubId = session.user.id;

    // Check timer
    const timer = await db.collection("timer").findOne({});
    if (!timer?.started) {
      return NextResponse.json({ message: "Competition not started yet" }, { status: 403 });
    }

    await db.collection("users").updateOne(
      { githubId },
      { $set: { username, githubId } },
      { upsert: true }
    );

    return NextResponse.json({ message: "User saved" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save user" });
  }
}

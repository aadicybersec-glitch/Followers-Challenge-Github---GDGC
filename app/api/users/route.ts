import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// Type for user object
type User = {
  githubId: string;
  username: string;
  followers?: number;
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");

    const rawUsers = await db.collection("users").find({}).toArray();

    // Map documents to User type safely
    const users: User[] = rawUsers.map((doc) => ({
      githubId: doc.githubId,
      username: doc.username,
      followers: doc.followers ?? 0,
    }));

    // Fetch latest follower count from GitHub API
    const usersWithFollowers = await Promise.all(
      users.map(async (user) => {
        try {
          const res = await fetch(`https://api.github.com/users/${user.username}`);
          const data = await res.json();
          return {
            ...user,
            followers: data.followers ?? 0,
          };
        } catch {
          return { ...user, followers: 0 };
        }
      })
    );

    // Sort by followers descending
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

    // Get the logged-in session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" });
    }

    // Use extended session type (id now exists)
    const username = session.user.name!;
    const githubId = session.user.id;

    // Upsert user into MongoDB
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

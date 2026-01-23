import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

type User = {
  githubId: string;
  username: string;
  followers: number;
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");

    // Check if competition is running
    const timer = await db.collection("timer").findOne({});
    const competitionRunning = timer?.started ?? false;

    // Fetch all users from DB
    const rawUsers = await db.collection("users").find({}).toArray();
    let users: User[] = rawUsers.map((doc) => ({
      githubId: doc.githubId,
      username: doc.username,
      followers: doc.followers ?? 0,
    }));

    if (competitionRunning) {
      // Update follower counts live from GitHub API
      users = await Promise.all(
        users.map(async (user) => {
          try {
            const res = await fetch(`https://api.github.com/users/${user.username}`);
            const data = await res.json();
            const followers = data.followers ?? 0;

            // Update DB
            await db.collection("users").updateOne(
              { githubId: user.githubId },
              { $set: { followers } }
            );

            return { ...user, followers };
          } catch {
            return user;
          }
        })
      );
    }

    // Sort users by followers descending
    users.sort((a, b) => b.followers - a.followers);
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");
    const { username, githubId } = await req.json();

    if (!username || !githubId) {
      return NextResponse.json({ error: "Missing username or githubId" }, { status: 400 });
    }

    // Upsert user into DB
    await db.collection("users").updateOne(
      { githubId },
      { $set: { username, githubId, followers: 0 } },
      { upsert: true }
    );

    return NextResponse.json({ message: "User saved" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save user" }, { status: 500 });
  }
}

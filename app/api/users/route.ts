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

    // --- Check if competition is running ---
    const timer = await db.collection("timer").findOne({});
    const competitionRunning = timer?.started ?? false;

    // --- Fetch all users from DB ---
    const rawUsers = await db.collection("users").find({}).toArray();
    let users: User[] = rawUsers.map((doc) => ({
      githubId: doc.githubId,
      username: doc.username,
      followers: doc.followers ?? 0,
    }));

    if (competitionRunning && users.length > 0) {
      // --- Update followers live from GitHub API ---
      users = await Promise.all(
        users.map(async (user) => {
          try {
            const res = await fetch(`https://api.github.com/users/${user.username}`, {
              headers: {
                "Accept": "application/vnd.github+json",
                // Optional: add a GitHub token for higher rate limit
                // "Authorization": `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`
              },
            });

            if (!res.ok) return user; // Skip if API call fails

            const data = await res.json();
            const followers = typeof data.followers === "number" ? data.followers : user.followers;

            // Only update DB if followers changed
            if (followers !== user.followers) {
              await db.collection("users").updateOne(
                { githubId: user.githubId },
                { $set: { followers } }
              );
            }

            return { ...user, followers };
          } catch (err) {
            console.error(`Failed to update ${user.username}:`, err);
            return user;
          }
        })
      );
    }

    // --- Sort by followers descending ---
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

    // --- Upsert user into DB ---
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

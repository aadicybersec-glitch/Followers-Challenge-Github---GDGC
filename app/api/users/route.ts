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

    // --- Fetch all users from DB ---
    const rawUsers = await db.collection("users").find({}).toArray();
    const users: User[] = rawUsers.map((doc) => ({
      githubId: doc.githubId,
      username: doc.username,
      followers: doc.followers ?? 0,
    }));

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

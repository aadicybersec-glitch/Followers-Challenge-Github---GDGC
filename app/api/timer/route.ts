import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");

    // Fetch current timer state
    const timer = await db.collection("timer").findOne({});
    return NextResponse.json(timer || { started: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { started: false, error: "Failed to fetch timer" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("github-game");
    const { action } = await req.json(); // expected: "start" or "end"

    if (!action || (action !== "start" && action !== "end")) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update timer in DB
    if (action === "start") {
      await db.collection("timer").updateOne(
        {},
        { $set: { started: true, startTime: new Date(), endTime: null } },
        { upsert: true }
      );
    } else if (action === "end") {
      await db.collection("timer").updateOne(
        {},
        { $set: { started: false, endTime: new Date() } },
        { upsert: true }
      );
    }

    // Broadcast the new timer state to clients (if using BroadcastChannel)
    // Note: front-end uses BroadcastChannel to react instantly

    return NextResponse.json({ message: `Timer ${action}ed` });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update timer" },
      { status: 500 }
    );
  }
}

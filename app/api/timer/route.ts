import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("github-game");
  const timer = await db.collection("timer").findOne({});
  return NextResponse.json(timer || { started: false });
}

export async function POST(req: Request) {
  const client = await clientPromise;
  const db = client.db("github-game");
  const { action } = await req.json(); // "start" or "end"

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

  return NextResponse.json({ message: "Timer updated" });
}

import { NextResponse } from "next/server";
import { Server } from "socket.io";
import { NextRequest } from "next/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: Server;

export default function handler(req: NextRequest) {
  if (!io) {
    const { Server } = require("socket.io");
    // @ts-ignore
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connected: " + socket.id);

      socket.on("startRound", () => {
        io.emit("timerUpdate", { started: true });
      });

      socket.on("endRound", () => {
        io.emit("timerUpdate", { started: false });
      });

      socket.on("updateUser", (user) => {
        io.emit("userUpdate", user);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected: " + socket.id);
      });
    });
  }

  return NextResponse.json({ message: "WebSocket server running" });
}

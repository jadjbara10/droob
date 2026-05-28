import { Server as SocketIOServer } from "socket.io";

export function setupWebSocket(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ---- Join Rooms ----

    // Listen to a specific vehicle
    socket.on("join:vehicle", (vehicleId: string) => {
      const room = `vehicle:${vehicleId}`;
      socket.join(room);
      console.log(`[WS] ${socket.id} joined ${room}`);
    });

    // Listen to all vehicles on a transit line
    socket.on("join:line", (lineCode: string) => {
      const room = `line:${lineCode}:jo`;
      socket.join(room);
      console.log(`[WS] ${socket.id} joined ${room}`);
    });

    // Listen to arrivals at a specific stop
    socket.on("join:stop", (stopId: string) => {
      const room = `stop:${stopId}:arrivals`;
      socket.join(room);
      console.log(`[WS] ${socket.id} joined ${room}`);
    });

    // Listen to city-wide alerts
    socket.on("join:alerts:amman", () => {
      socket.join("alerts:amman");
    });

    // Listen to nationwide alerts
    socket.on("join:alerts:national", () => {
      socket.join("alerts:national");
    });

    // ---- Leave Rooms ----
    socket.on("leave:vehicle", (vehicleId: string) => {
      socket.leave(`vehicle:${vehicleId}`);
    });

    socket.on("leave:line", (lineCode: string) => {
      socket.leave(`line:${lineCode}:jo`);
    });

    socket.on("leave:stop", (stopId: string) => {
      socket.leave(`stop:${stopId}:arrivals`);
    });

    // ---- Disconnect ----
    socket.on("disconnect", (reason) => {
      console.log(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // ---- Broadcast helpers (used by routes/services) ----
  // These can be called from API route handlers to push updates

  io.of("/").adapter.on("create-room", (room) => {
    console.log(`[WS] Room created: ${room}`);
  });

  console.log("[WebSocket] Server initialized with rooms support");
}

// Helper: broadcast vehicle position update
export function broadcastVehiclePosition(
  io: SocketIOServer,
  vehicleId: string,
  position: { lat: number; lng: number; bearing: number; speed: number }
) {
  // Emit to specific vehicle room
  io.to(`vehicle:${vehicleId}`).emit("vehicle:position", {
    vehicleId,
    ...position,
    timestamp: Date.now(),
  });
}

// Helper: broadcast departure update for a stop
export function broadcastDepartureUpdate(
  io: SocketIOServer,
  stopId: string,
  data: {
    routeCode: string;
    destination: string;
    scheduledTime: string;
    estimatedTime: string;
    status: string;
    occupancy: string | null;
  }
) {
  io.to(`stop:${stopId}:arrivals`).emit("departure:update", {
    stopId,
    ...data,
    timestamp: Date.now(),
  });
}

// Helper: broadcast alert
export function broadcastAlert(
  io: SocketIOServer,
  scope: "amman" | "national",
  alert: {
    id: string;
    severity: string;
    titleAr: string;
    titleEn: string;
    messageAr: string;
    messageEn: string;
  }
) {
  const room = scope === "amman" ? "alerts:amman" : "alerts:national";
  io.to(room).emit("alert:new", { ...alert, timestamp: Date.now() });
}
import { Server, Socket } from "socket.io";

// A simple in-memory queue for waiting users
const waitingQueue: { socketId: string; gender: string }[] = [];

export const handleSocketConnections = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user searching for a match
    socket.on("find_match", ({ gender }) => {
      console.log(`User ${socket.id} is looking for a match with gender preference: ${gender}`);

      // Add the current user to the waiting queue first.
      const currentUser = { socketId: socket.id, gender };
      waitingQueue.push(currentUser);
      console.log(`User ${socket.id} added to waiting queue. Queue size: ${waitingQueue.length}`);

      // Now, try to find a pair of users in the queue.
      if (waitingQueue.length >= 2) {
        // For simplicity, we'll pair the first two users.
        // You can add more complex gender-based matching logic here.
        const user1 = waitingQueue.shift()!;
        const user2 = waitingQueue.shift()!;

        console.log(`Match found: ${user1.socketId} and ${user2.socketId}`);

        // Notify both users about the match
        io.to(user1.socketId).emit("match_found", { partnerId: user2.socketId });
        io.to(user2.socketId).emit("match_found", { partnerId: user1.socketId });
      } else {
        console.log("Not enough users to form a match. Waiting for more users.");
      }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // Remove the user from the waiting queue if they are in it
      const index = waitingQueue.findIndex((user) => user.socketId === socket.id);
      if (index !== -1) {
        waitingQueue.splice(index, 1);
        console.log(`User ${socket.id} removed from waiting queue.`);
      }
    });
  });
};
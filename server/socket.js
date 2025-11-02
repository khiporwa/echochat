const users = {}; // Stores user data { socketId: { id, username, gender, socketId } }
const queue = []; // Queue of users waiting for a match { socketId, genderPreference }
const rooms = {}; // Stores active chat rooms { socketId: partnerSocketId }

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a user provides their info after connecting
    socket.on("user:online", (userData) => {
      users[socket.id] = { ...userData, socketId: socket.id };
      console.log(`User data received for ${socket.id}:`, users[socket.id].username);
    });

    const findMatch = ({ genderPreference }) => {
      const currentUser = users[socket.id];
      if (!currentUser) {
        return socket.emit("match:error", { message: "User data not found. Please try again." });
      }

      console.log(`${currentUser.username} is looking for a match with preference: ${genderPreference}`);

      const partnerIndex = queue.findIndex(partner => {
        const partnerUser = users[partner.socketId];
        if (!partnerUser || partner.socketId === socket.id) return false;

        const currentUserMatches = genderPreference === 'any' || partnerUser.gender === genderPreference;
        const partnerMatches = partner.genderPreference === 'any' || currentUser.gender === partner.genderPreference;

        return currentUserMatches && partnerMatches;
      });

      if (partnerIndex !== -1) {
        const partner = queue.splice(partnerIndex, 1)[0];
        const partnerUser = users[partner.socketId];

        rooms[socket.id] = partner.socketId;
        rooms[partner.socketId] = socket.id;

        console.log(`Match found: ${currentUser.username} and ${partnerUser.username}`);

        socket.emit("match:found", { partner: { username: partnerUser.username, gender: partnerUser.gender } });
        io.to(partner.socketId).emit("match:found", { partner: { username: currentUser.username, gender: currentUser.gender } });
      } else {
        console.log(`${currentUser.username} added to queue.`);
        queue.push({ socketId: socket.id, genderPreference });
        socket.emit("match:searching");
      }
    };

    const leaveChat = () => {
      const partnerSocketId = rooms[socket.id];
      if (partnerSocketId) {
        console.log(`User ${socket.id} left chat with ${partnerSocketId}`);
        io.to(partnerSocketId).emit("chat:partner_left");
        delete rooms[partnerSocketId];
      }
      delete rooms[socket.id];
    };

    // When a user wants to find a match for the first time
    socket.on("user:find_match", (options) => {
      findMatch(options);
    });

    // When a user in a chat wants to find the next match
    socket.on("chat:next", (options) => {
      console.log(`User ${socket.id} is looking for the next chat.`);
      leaveChat();
      findMatch(options);
    });

    // Relay WebRTC signaling messages
    const handleSignaling = (eventName) => {
      socket.on(eventName, (payload) => {
        const partnerSocketId = rooms[socket.id];
        if (partnerSocketId) {
          io.to(partnerSocketId).emit(eventName, payload);
        }
      });
    };

    handleSignaling("webrtc:offer");
    handleSignaling("webrtc:answer");
    handleSignaling("webrtc:ice_candidate");

    // Handle user leaving a chat
    socket.on("chat:leave", () => {
      leaveChat();
    });

    // Handle user canceling search
    socket.on("match:cancel_search", () => {
        const index = queue.findIndex(user => user.socketId === socket.id);
        if (index !== -1) {
            queue.splice(index, 1);
            console.log(`User ${socket.id} cancelled search and was removed from queue.`);
        }
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      
      leaveChat(); // Notify partner if in a chat

      // Remove from queue if waiting
      const queueIndex = queue.findIndex((user) => user.socketId === socket.id);
      if (queueIndex !== -1) {
        queue.splice(queueIndex, 1);
      }

      delete users[socket.id];
    });
  });
};

module.exports = setupSocket;
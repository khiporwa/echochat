import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";

const SOCKET_URL = "http://localhost:3001";

const VideoChat = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState("idle"); // idle, searching, connected
  const [partner, setPartner] = useState<{ username: string; gender: string } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize Socket and Peer Connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server with id:", newSocket.id);
      newSocket.emit("user:online", {
        id: user.id,
        username: user.username,
        gender: user.gender, // Assuming user object has gender
      });
    });

    // --- WebRTC and Socket Event Listeners ---

    newSocket.on("match:searching", () => setStatus("searching"));

    newSocket.on("match:found", async ({ partner }) => {
      console.log("Match found with:", partner.username);
      setStatus("connected");
      setPartner(partner);

      // Start the WebRTC connection process (caller side)
      peerConnectionRef.current = createPeerConnection(newSocket);
      addLocalTracks(peerConnectionRef.current);

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      newSocket.emit("webrtc:offer", { offer });
    });

    newSocket.on("webrtc:offer", async ({ offer }) => {
      console.log("Received WebRTC offer");
      setStatus("connected"); // Should already be set, but just in case

      peerConnectionRef.current = createPeerConnection(newSocket);
      addLocalTracks(peerConnectionRef.current);

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      newSocket.emit("webrtc:answer", { answer });
    });

    newSocket.on("webrtc:answer", async ({ answer }) => {
      console.log("Received WebRTC answer");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    newSocket.on("webrtc:ice_candidate", ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    newSocket.on("chat:partner_left", () => {
      console.log("Partner left the chat.");
      resetChat();
    });

    return () => {
      newSocket.disconnect();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [user]);

  const createPeerConnection = (socketInstance: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit("webrtc:ice_candidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const addLocalTracks = (pc: RTCPeerConnection) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
  };

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing media devices.", error);
      alert("Could not access your camera and microphone. Please check permissions.");
    }
  };

  const findMatch = async () => {
    if (socket && status === "idle") {
      await startLocalStream();
      if (localStreamRef.current) {
        socket.emit("user:find_match", { genderPreference: "any" });
      }
    }
  };

  const handleNext = () => {
    if (socket && status === "connected") {
      socket.emit("chat:next", { genderPreference: "any" });
      resetChat(false); // Don't reset status to idle
      setStatus("searching");
    }
  };

  const resetChat = (resetStatusToIdle = true) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setPartner(null);
    if (resetStatusToIdle) {
      setStatus("idle");
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl">
        <div className="bg-black rounded-lg aspect-video relative">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg" />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
            {partner ? partner.username : "Stranger"}
          </div>
        </div>
        <div className="bg-black rounded-lg aspect-video relative">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg" />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
            {user?.username} (You)
          </div>
        </div>
      </div>
      <div className="mt-4">
        {status === "idle" && <Button onClick={findMatch}>Find a Match</Button>}
        {status === "searching" && <p className="text-lg">Searching for a partner...</p>}
        {status === "connected" && (
          <div className="flex gap-4">
            <Button onClick={handleNext}>Next</Button>
            <Button variant="destructive" onClick={() => socket?.emit("chat:leave")}>
              Leave
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoChat;

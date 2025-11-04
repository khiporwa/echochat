import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

const VideoChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState("idle"); // idle, searching, connected
  const [partner, setPartner] = useState<{ username: string; gender: string } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Helper to send signal messages with senderId for the backend to route
  const sendSignal = (eventName: string, payload: any) => {
    if (socket && user) {
      socket.emit(eventName, {
        senderId: user.id,
        payload: payload,
      });
    }
  };
  
  // FIX 1: Centralized reset logic for cleaner stream and state management
  const resetChat = (resetStatusToIdle = true) => {
    
    // 1. Peer Connection Cleanup (Critical for not hanging connections)
    if (peerConnectionRef.current) {
        // Stop sending tracks (crucial for clean disconnect)
        try {
            peerConnectionRef.current.getSenders().forEach(sender => {
                if (sender.track) {
                    sender.track.stop(); // Stop media on track
                }
            });
        } catch (e) {
            console.error("Error stopping peer tracks:", e);
        }
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }

    // 2. Clear Remote Video (Stop its tracks and clear source)
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      // @ts-ignore
      remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteVideoRef.current.srcObject = null;
    }
    
    // 3. Reset UI State
    setPartner(null);
    if (resetStatusToIdle) {
      setStatus("idle");
      
      // 4. Stop Local Stream (Only when going back to Idle/full reset)
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
      }
      if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
      }
    }
  };


  // Initialize Socket and Peer Connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io("/", {
      query: {
        userId: user.id,
      }
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("user:online", {
        id: user.id,
        username: user.username,
      });
    });
    
    // --- Server-Initiated Match Events ---

    newSocket.on("waiting", () => {
        setStatus("searching");
        toast({
            title: "Searching...",
            description: "Looking for a new connection.",
        });
    });

    newSocket.on("matched", async ({ opponentId, opponentUsername }) => {
      setStatus("connected");
      setPartner({ username: opponentUsername, gender: "unknown" }); 

      toast({
          title: "Connection Established! 🤝",
          description: `You are now connected with ${opponentUsername}.`,
          duration: 3000,
      });
      
      const isCaller = user.id > opponentId;

      peerConnectionRef.current = createPeerConnection(newSocket);
      addLocalTracks(peerConnectionRef.current);
      
      if (isCaller) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        sendSignal("webrtc:offer", { sdp: offer }); 
      }
    });

    // --- WebRTC Signaling Events ---

    newSocket.on("webrtc:offer", async ({ payload }) => {
      setStatus("connected"); 

      if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection(newSocket);
        addLocalTracks(peerConnectionRef.current);
      }
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      sendSignal("webrtc:answer", { sdp: answer }); 
    });

    newSocket.on("webrtc:answer", async ({ payload }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription === null) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    newSocket.on("webrtc:ice_candidate", ({ payload }) => {
      if (peerConnectionRef.current && payload.candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });
    
    // FIX 2: Handle partner disconnect properly by resetting the peer connection state
    const handlePartnerLeft = () => {
        // Use partner state (which is still set) to show who left
        const partnerName = partner?.username || "Your partner";
        
        toast({
            title: "Chat Ended 💔",
            description: `${partnerName} has disconnected or skipped the chat.`,
            variant: "destructive",
            duration: 3000,
        });
        
        // Reset everything, including status to 'idle'
        resetChat();
    }

    newSocket.on("chat:partnerLeft", handlePartnerLeft); 

    return () => {
      newSocket.disconnect();
      // Ensure the local stream is stopped on component unmount
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [user, toast]);
  
  const createPeerConnection = (socketInstance: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("webrtc:ice_candidate", { candidate: event.candidate });
      }
    };

    // FIX 3: Ensure remote video is assigned when tracks arrive
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        // Assign the stream to the remote video element
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const addLocalTracks = (pc: RTCPeerConnection) => {
    if (localStreamRef.current) {
      // Add all tracks from the local stream to the peer connection
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }
  };

  const startLocalStream = async () => {
    // FIX 4: Only attempt to create a new stream if one doesn't exist
    if (localStreamRef.current) {
        return localStreamRef.current;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        // FIX 5: Assign the local stream to the local video element
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      toast({
        title: "Media Access Failed",
        description: "Could not access your camera and microphone. Please check permissions.",
        variant: "destructive",
      });
      return null;
    }
  };

  const findMatch = async () => {
    if (socket && user && status === "idle") {
      const stream = await startLocalStream();
      if (stream) {
        socket.emit("requestMatch", user.id); 
      }
    }
  };

  const handleNext = () => {
    if (socket && user && status === "connected") {
      socket.emit("nextMatch", user.id); 
      
      toast({
        title: "Searching Next Match...",
        description: "Skipping current chat and searching for a new connection.",
      });
      
      // Reset connection, but keep the local media stream open (resetStatusToIdle=false)
      resetChat(false); 
      setStatus("searching");
    }
  };

  const handleLeave = () => {
    if (socket && user && status === "connected") {
      socket.emit("chat:leave", user.id); 
      
      const partnerName = partner?.username || "Your partner";
      toast({
          title: "Chat Ended 🚪",
          description: `You left the chat with ${partnerName}.`,
          variant: "destructive",
          duration: 3000,
      });
      
      // Reset everything, including stopping local media stream (resetStatusToIdle=true)
      resetChat(true); 
    }
  };

  
  const renderMatchButton = () => {
    if (status === "idle") {
      return <Button onClick={findMatch}>Find a Match</Button>;
    }
    if (status === "searching") {
        return <p className="text-lg">Searching for a partner...</p>;
    }
    if (status === "connected") {
      return (
        <div className="flex gap-4">
            <Button onClick={handleNext}>Next</Button>
            <Button variant="destructive" onClick={handleLeave}>
                Leave
            </Button>
        </div>
      );
    }
    return null;
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
        {renderMatchButton()}
      </div>
    </div>
  );
};

export default VideoChat;
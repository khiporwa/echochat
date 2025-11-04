import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { MessageSquare, Send } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const VideoChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState("idle"); // idle, searching, connected
  const [partner, setPartner] = useState<{ username: string; gender: string } | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Auto-scroll to the bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // Helper to send signal messages with senderId for the backend to route
  const sendSignal = useCallback((eventName: string, payload: any) => {
    if (socket && user) {
      socket.emit(eventName, {
        senderId: user.id,
        payload: payload,
      });
    }
  }, [socket, user]);
  
  // FIX: Helper to add local tracks to the PeerConnection
  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    if (!localStreamRef.current || !pc) return; 
    
    localStreamRef.current.getTracks().forEach((track) => {
        const existingSender = pc.getSenders().find(s => s.track === track);

        if (!existingSender) {
             pc.addTrack(track, localStreamRef.current!);
        }
    });
  }, []);

  // FIX: Centralized logic for starting stream, ensuring local video is visible
  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
        if (localVideoRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
        return localStreamRef.current;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream; // Assign stream to video element
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
  }, [toast]);
  
  // FIX: Peer Connection logic with negotiationneeded handler for robustness
  const createPeerConnection = useCallback((socketInstance: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("webrtc:ice_candidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      // Ensure srcObject is set to the remote stream when a track arrives
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // FIX: Mandatory for robust offer/answer flow (initiates the offer when tracks are added)
    pc.onnegotiationneeded = async () => {
        // Check for stable state before creating offer
        if (pc.signalingState === 'stable' && peerConnectionRef.current === pc) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal("webrtc:offer", { sdp: offer });
            } catch (error) {
                console.error("Error during negotiationneeded:", error);
            }
        }
    };

    return pc;
  }, [sendSignal]);

  // FIX: Centralized reset logic with robust cleanup
  const resetChat = useCallback((resetStatusToIdle = true) => {
    
    if (peerConnectionRef.current) {
        try {
            // Remove tracks from peer connection first
            peerConnectionRef.current.getSenders().forEach(sender => {
                if (sender.track) {
                    sender.track.stop(); // Stop tracks on sender
                    peerConnectionRef.current?.removeTrack(sender);
                }
            });
        } catch (e) {
            console.error("Error stopping peer tracks during cleanup:", e);
        }
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }

    // Clear Remote Video element
    if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
    }
    
    // Reset UI State
    setPartner(null);
    setMessages([]); 
    
    if (resetStatusToIdle) {
      setStatus("idle");
      
      // Stop Local Stream and clear local video element
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
      }
      if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
      }
    }
  }, []);
  
  
  // Initialize Socket and Peer Connection
  useEffect(() => {
    if (!user) return;

    // FIX: Explicitly set path and transports for stable connection through proxy
    const newSocket = io("/", {
      path: '/socket.io/', // Ensure trailing slash for some proxies/servers
      transports: ['websocket', 'polling'], // Prioritize websocket
      query: {
        userId: user.id,
      }
    });
    setSocket(newSocket);

    // FIX: Add logging for connection failure/success
    newSocket.on("connect", () => {
      console.log("Socket Connected. ID:", newSocket.id);
      newSocket.emit("user:online", {
        id: user.id,
        username: user.username,
      });
    });
    
    newSocket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
      toast({
        title: "Connection Failed",
        description: "Could not connect to the matchmaking server. Check the backend.",
        variant: "destructive",
      });
    });

    
    // --- Server-Initiated Match Events ---

    newSocket.on("waiting", () => {
        setStatus("searching");
        toast({
            title: "Searching...",
            description: "Looking for a new connection.",
            duration: 2000, 
        });
    });

    newSocket.on("matched", async ({ opponentId, opponentUsername }) => {
      setStatus("connected");
      setPartner({ username: opponentUsername, gender: "unknown" }); 

      toast({
          title: "Connection Established! 🤝",
          description: `You are now connected with ${opponentUsername}.`,
          duration: 2000, 
      });
      
      const isCaller = user.id > opponentId;

      peerConnectionRef.current = createPeerConnection(newSocket);
      addLocalTracks(peerConnectionRef.current);
    });

    // --- WebRTC Signaling Events ---

    newSocket.on("webrtc:offer", async ({ payload }) => {
      setStatus("connected"); 
      
      if (!peerConnectionRef.current) {
        await startLocalStream(); 
        peerConnectionRef.current = createPeerConnection(newSocket);
        addLocalTracks(peerConnectionRef.current);
      }
      
      await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await peerConnectionRef.current!.createAnswer();
      await peerConnectionRef.current!.setLocalDescription(answer);
      sendSignal("webrtc:answer", { sdp: answer }); 
    });

    newSocket.on("webrtc:answer", async ({ payload }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        try {
          if (!peerConnectionRef.current.remoteDescription || peerConnectionRef.current.remoteDescription.type !== payload.sdp.type) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } catch (e) {
          console.error("Error setting remote description from answer:", e);
        }
      }
    });


    newSocket.on("webrtc:ice_candidate", ({ payload }) => {
      if (peerConnectionRef.current && payload.candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });
    
    const handlePartnerLeft = () => {
        const partnerName = partner?.username || "Your partner";
        
        toast({
            title: "Chat Ended 💔",
            description: `${partnerName} has disconnected or skipped the chat.`,
            variant: "destructive",
            duration: 2000, 
        });
        
        resetChat(true); 
    }

    newSocket.on("chat:partnerLeft", handlePartnerLeft); 
    newSocket.on("chat:message", (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    });
    
    return () => {
      newSocket.disconnect();
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
      }
    };
  }, [user, partner, toast, resetChat, createPeerConnection, addLocalTracks, sendSignal, startLocalStream]);

  
  const findMatch = async () => {
    if (socket && user && status === "idle") {
      const stream = await startLocalStream();
      
      if (stream) {
        setStatus("searching"); 
        // FIX: The backend uses requestMatch with just the user ID string
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
        duration: 2000, 
      });
      
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
          duration: 2000, 
      });
      
      resetChat(true); 
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() === "" || status !== "connected" || !user) return;

    const message: ChatMessage = {
      id: Date.now(),
      senderId: user.id,
      senderName: user.username,
      text: currentMessage.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, message]);
    socket?.emit("chat:message", message);
    setCurrentMessage("");
  };

  
  const renderMatchButton = () => {
    if (status === "idle") {
      return <Button onClick={findMatch}>Find a Match</Button>;
    }
    if (status === "searching") {
        return <p className="text-lg font-semibold">Searching for a partner...</p>;
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
        {/* Layout: 2-column (2/3 + 1/3) with videos and chat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-6xl">
            
            {/* Column 1 (2/3 width): Videos (Main + Local) */}
            <div className="md:col-span-2 flex flex-col gap-4">
                
                {/* 1. Large Remote Video (Aspect-ratio is key for proper size) */}
                <div className="bg-black rounded-lg aspect-video relative overflow-hidden">
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover rounded-lg" 
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded">
                        {partner ? partner.username : (status === 'connected' ? 'Connecting...' : 'Stranger')}
                    </div>
                </div>
                
                {/* 2. Small Local Video (Fixed position below main video) */}
                <div className="bg-black rounded-lg h-32 w-48 relative overflow-hidden border-2 border-primary/50 shadow-lg self-start">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover rounded-lg" 
                    />
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                        {user?.username} (You)
                    </div>
                </div>
            </div>

            {/* Column 2 (1/3 width): Chat Box */}
            <div className="flex flex-col h-[500px] md:h-full border rounded-lg bg-card/80 backdrop-blur-sm shadow-card md:col-span-1">
                <div className="p-4 border-b flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Live Chat</h3>
                </div>
                
                {/* Message Display Area */}
                <ScrollArea className="flex-1 p-4 h-full">
                    <div className="space-y-3">
                        {messages.length === 0 && status === 'connected' && (
                            <p className="text-muted-foreground text-sm text-center italic pt-4">
                                Say hello to {partner?.username || 'your partner'}!
                            </p>
                        )}
                        {messages.map((message) => {
                            const isUser = message.senderId === user?.id;
                            return (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex",
                                        isUser ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                                            isUser
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-muted text-foreground rounded-tl-none"
                                        )}
                                    >
                                        <span className="font-semibold block text-xs mb-1">
                                            {isUser ? "You" : message.senderName}
                                        </span>
                                        {message.text}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Message Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            placeholder={status === 'connected' ? "Type a message..." : "Connect first to chat"}
                            value={currentMessage}
                            onChange={(e) => setCurrentMessage(e.target.value)}
                            disabled={status !== "connected"}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={status !== "connected" || currentMessage.trim() === ""}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        *File attachments are not available in this version.
                    </p>
                </form>
            </div>
        </div>
      
        {/* Match Buttons (below videos/chat) */}
        <div className="mt-6">
            {renderMatchButton()}
        </div>
    </div>
  );
};

export default VideoChat;
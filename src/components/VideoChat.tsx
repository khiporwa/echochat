import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Socket } from "socket.io-client"; // FIX: Import the Socket type
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { MessageSquare, Send } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket"; // FIX 1: Import the centralized socket hook

interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// FIX 1: Define the matched event payload interface correctly
interface MatchedPayload {
    opponentId: string;
    opponentUsername: string;
    isCaller: boolean; // Crucial flag from server
}

const VideoChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket(); // FIX 2: Use the state from the hook
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // Attempt to get stream
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream; // Assign stream to video element
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      // Show a non-blocking warning toast instead of a destructive one
      toast({
        title: "Camera/Mic Not Available",
        description: "Permissions denied. You can still chat, but without video.",
      });
      return null; // Return null but don't block the process
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
        // This is primarily for the caller, after addLocalTracks.
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
    // FIX 3: Use the socket instance from the hook. It's already connecting.
    if (!user || !socket) return;

    // Emit user online status once connected
    if (isConnected) {
      socket.emit("user:online", {
        id: user.id,
        username: user.username,
      });
    }

    
    // --- Server-Initiated Match Events ---

    socket.on("waiting", () => {
        setStatus("searching");
        toast({
            title: "Searching...",
            description: "Looking for a new connection.",
            duration: 2000, 
        });
    });

    // FIX 2 & 3: Use the 'isCaller' flag to decide who initiates the offer
    socket.on("matched", async (payload: MatchedPayload) => {
      const { opponentId, opponentUsername, isCaller } = payload;
        
      setStatus("connected");
      setPartner({ username: opponentUsername, gender: "unknown" }); 

      toast({
          title: "Connection Established! 🤝",
          description: `You are now connected with ${opponentUsername}.`,
          duration: 2000, 
      });
      
      // Create Peer Connection
      peerConnectionRef.current = createPeerConnection(socket);
      
      // Only the caller immediately adds tracks to trigger the 'negotiationneeded' event and send the offer
      if (isCaller) {
          console.log("I am the caller. Initiating WebRTC offer.");
          addLocalTracks(peerConnectionRef.current);
      } else {
          console.log("I am the callee. Waiting for WebRTC offer.");
      }
    });

    // --- WebRTC Signaling Events ---

    socket.on("webrtc:offer", async ({ payload }) => {
      setStatus("connected"); 
      
      // Callee receives offer. Must set up RTCPeerConnection, add tracks, and create answer.
      if (!peerConnectionRef.current) {
        await startLocalStream(); 
        peerConnectionRef.current = createPeerConnection(socket);
        addLocalTracks(peerConnectionRef.current); // Callee MUST add tracks here to send stream back
      }
      
      await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await peerConnectionRef.current!.createAnswer();
      await peerConnectionRef.current!.setLocalDescription(answer);
      sendSignal("webrtc:answer", { sdp: answer }); 
    });

    socket.on("webrtc:answer", async ({ payload }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
        try {
          // FIX 4: Caller receives answer. Add tracks if they haven't been added yet (for robustness)
          if (peerConnectionRef.current.getSenders().length === 0) {
              addLocalTracks(peerConnectionRef.current);
          }
          
          if (!peerConnectionRef.current.remoteDescription || peerConnectionRef.current.remoteDescription.type !== payload.sdp.type) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
        } catch (e) {
          console.error("Error setting remote description from answer:", e);
        }
      }
    });


    socket.on("webrtc:ice_candidate", ({ payload }) => {
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

    socket.on("chat:partnerLeft", handlePartnerLeft); 
    socket.on("chat:message", (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
    });
    
    return () => {
      // The useSocket hook handles disconnection. We just need to clean up listeners.
      socket.off("waiting");
      socket.off("matched");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice_candidate");
      socket.off("chat:partnerLeft");
      socket.off("chat:message");
    };
  }, [user, socket, isConnected, partner, toast, resetChat, createPeerConnection, addLocalTracks, sendSignal, startLocalStream]);

  
  const findMatch = async () => {
    if (socket && user && status === "idle") {
      // Attempt to start the local stream, but don't block if it fails.
      await startLocalStream();
      
      // Proceed to find a match as long as the socket is connected.
      if (socket.connected) {
        setStatus("searching"); 
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
      // FIX: Disable button if socket is not connected (to prevent searching forever)
      return <Button onClick={findMatch} disabled={!isConnected}>Find a Match</Button>;
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
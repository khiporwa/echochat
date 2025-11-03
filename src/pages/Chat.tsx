import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  Flag,
  MessageSquare,
  X,
  Send,
  Loader2,
  User, 
  Settings,
  LogOut
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumUpgradeDialog } from "@/components/PremiumUpgradeDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Crown } from "lucide-react";
import { io, Socket } from "socket.io-client";

type GenderFilter = "male" | "female" | "other" | null;

interface Opponent {
  id: string;
  username: string;
}

const SOCKET_URL = "http://localhost:3001";

const Chat = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [localStreamVisible, setLocalStreamVisible] = useState<MediaStream | null>(null); 
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  // MATCHING STATE
  const [isSearching, setIsSearching] = useState(true);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  
  // VIDEO REFS
  const localVideoRef = useRef<HTMLVideoElement>(null); 
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // CONNECTION REFS
  const activeStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null); 
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  // --- UTILITY FUNCTIONS (STABILIZED WITH useCallback) ---

  const stopMediaStream = () => {
    const stream = activeStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      activeStreamRef.current = null;
      setLocalStreamVisible(null);
    }
  };

  const resetChat = useCallback((searchNext = false) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setOpponent(null);
    setShowChat(false);
    setIsSearching(searchNext); 
    if (!searchNext) {
        setIsSearching(false);
    }
  }, []); 

  const createPeerConnection = useCallback((socketInstance: Socket) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit("webrtc:ice_candidate", { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      // When partner's track arrives, attach it to the remote video element
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(e => console.error("Auto-play blocked:", e)); 
      }
    };
    
    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
            console.log('Peer connection state change:', pc.iceConnectionState);
        }
    }

    return pc;
  }, []);

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    if (activeStreamRef.current) {
      console.log("Adding local tracks to PeerConnection.");
      activeStreamRef.current.getTracks().forEach((track) => {
        if (track.enabled) { 
             pc.addTrack(track, activeStreamRef.current!);
        } else {
             console.warn(`Attempted to add disabled track: ${track.kind}`);
        }
      });
    } else {
      console.error("Cannot add local tracks: activeStreamRef is null.");
    }
  }, []);

  const startMatching = useCallback((isNext = false) => {
    if (!user?.id) return;

    setIsSearching(true);
    setOpponent(null);
    resetChat(true); 

    if (socketRef.current?.connected) {
      if (isNext) {
        socketRef.current.emit('nextMatch', user.id);
      } else {
        socketRef.current.emit('requestMatch', user.id);
      }
      
      toast({
        title: isNext ? "Looking for a new connection" : "Starting video chat...",
        description: "Finding someone available now.",
      });
    }
  }, [user?.id, toast, resetChat]); 

  // --- MEDIA STREAM INITIALIZATION ---
  useEffect(() => {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        activeStreamRef.current = stream;
        setLocalStreamVisible(stream); // Update state to trigger rendering

      } catch (error) {
        console.error("Error accessing camera:", error);
        toast({
          title: "Camera access denied",
          description: "Please enable camera and microphone permissions to use video chat.",
          variant: "destructive",
        });
      }
    };

    requestCamera();

    // Cleanup function runs on component unmount
    return () => {
      stopMediaStream();
      socketRef.current?.disconnect();
      resetChat(false);
    };
  }, [toast, resetChat]);

  // Dedicated useEffect to link MediaStream to the local video element
  useEffect(() => {
    if (localVideoRef.current && localStreamVisible) {
      localVideoRef.current.srcObject = localStreamVisible;
      localVideoRef.current.play().catch(e => console.log("Local video autoplay failed:", e));
    }
  }, [localStreamVisible]);


  // Handle video/audio track toggles (stable dependencies)
  useEffect(() => {
    const videoTrack = activeStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoOff;

      // 👇 FIX: If re-enabling video, manually try to restart playback
      if (!isVideoOff && localVideoRef.current) {
        localVideoRef.current.play().catch(e => console.log("Local video re-enable play failed:", e));
      }
    }
    const audioTrack = activeStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
    }
  }, [isVideoOff, isMuted]);

  // --- SOCKET AND WEBRTC SIGNALING LOGIC ---

  useEffect(() => {
    if (!user?.id) return;
    
    const socket = io(SOCKET_URL, {
        query: { userId: user.id }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
      startMatching();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      resetChat(false);
    });

    // 1. MATCH FOUND (CALLER)
    socket.on('matched', async (matchData: { opponentId: string; opponentUsername: string }) => {
      console.log("Match found - Initiating WebRTC call (Caller)");
      setOpponent({
        id: matchData.opponentId,
        username: matchData.opponentUsername,
      });
      setIsSearching(false);

      const pc = createPeerConnection(socket);
      peerConnectionRef.current = pc;
      
      // CRITICAL: Add tracks before creating the Offer
      addLocalTracks(pc); 
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { offer });

      toast({
        title: "Match Found!",
        description: `You are now connected with ${matchData.opponentUsername}.`,
      });
    });
    
    // 2. RECEIVE OFFER (RECEIVER)
    socket.on("webrtc:offer", async ({ offer }) => {
      console.log("Received WebRTC offer (Receiver)");
      
      const pc = createPeerConnection(socket);
      peerConnectionRef.current = pc;
      
      // CRITICAL: Add tracks immediately after creating PeerConnection
      addLocalTracks(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { answer });
    });

    // 3. RECEIVE ANSWER (CALLER)
    socket.on("webrtc:answer", async ({ answer }) => {
      console.log("Received WebRTC answer (Caller)");
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // 4. ICE CANDIDATES
    socket.on("webrtc:ice_candidate", ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        if (peerConnectionRef.current.remoteDescription) {
             peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
             console.warn("ICE candidate received before remote description is set. Ignoring.");
        }
      }
    });
    
    // 5. PARTNER LEFT 
    socket.on('chat:partnerLeft', () => {
        console.log('Partner left the chat');
        resetChat(false);
        
        toast({
          title: "Partner disconnected",
          description: "Your partner left the chat. Click 'Next' to find a new one.",
          variant: "destructive",
        });
    });

    // 6. WAITING/BUSY
    socket.on('waiting', () => {
      setOpponent(null);
      setIsSearching(true);
    });
    
    socket.on('busy', () => {
        setIsSearching(false);
        toast({
            title: "Already Connected",
            description: "You are already marked as being in an active session.",
        });
    });

    // Cleanup function runs on dependency change or unmount
    return () => {
      if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
      }
      socket.disconnect();
    };
    
  }, [user?.id, startMatching, resetChat, createPeerConnection, addLocalTracks, toast]); 

  // Handler for 'Next' button
  const handleNext = () => {
    resetChat(true); 
    startMatching(true);
  };

  // Handler for 'X' button / Exit
  const handleExitChat = () => {
    if (socketRef.current && user?.id) {
        socketRef.current.emit("chat:leave", user.id);
    }
    
    stopMediaStream();
    socketRef.current?.disconnect();
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };
  
  // Other handlers...
  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe.",
    });
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatMessage("");
    }
  };

  const handleFilterChange = (value: string) => {
    if (!user?.isPremium) {
      setShowUpgradeDialog(true);
      return;
    }
    setGenderFilter(value === "all" ? null : (value as GenderFilter));
    toast({
      title: "Filter updated",
      description: `Now matching with ${value === "all" ? "everyone" : value} users`,
    });
  };

  const showConnectingLoader = isSearching && !opponent;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-primary" />
          <span className="font-semibold">EchoChat</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-2 border-primary/30 font-semibold">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
            {isSearching ? "Searching..." : "Online"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          {/* Added settings and logout buttons to header for convenience */}
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
          <Button variant="ghost" onClick={handleExitChat}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-muted">
        {/* Partner Video (Main) */}
        <div className="absolute inset-0 bg-gradient-hero flex items-center justify-center">
          
          {opponent ? (
            // Remote Video
            <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover bg-black z-10" 
            />
          ) : showConnectingLoader ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-xl font-semibold text-foreground">Connecting...</p>
              <p className="text-muted-foreground">Finding someone for you to chat with</p>
            </div>
          ) : (
             <div className="text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-semibold text-foreground">Waiting for connection...</p>
                <p className="text-muted-foreground">Click Next to start searching</p>
            </div>
          )}
        </div>
        
        {/* Opponent Info Overlay */}
        {opponent && (
             <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg z-20">
                <p className="text-xl font-bold">{opponent.username}</p>
             </div>
        )}

        {/* Own Video (Picture-in-Picture) */}
        <Card className="absolute top-4 right-4 w-64 h-48 border-border/50 overflow-hidden shadow-card z-30">
          <div className="w-full h-full bg-black flex items-center justify-center relative">
            {isVideoOff || !localStreamVisible ? (
              <div className="text-center">
                <VideoOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Camera off</p>
              </div>
            ) : (
              // Show LOCAL Video
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-1 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded z-40">
                {user?.username} (You)
            </div>
          </div>
        </Card>

        {/* Connection Quality Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg z-20">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">Excellent connection</span>
        </div>

        {/* Gender Filter (Premium Feature) */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border ${user?.isPremium ? "border-border/50" : "border-border/30 opacity-70"} transition-opacity z-20`}>
          <Filter className={`w-4 h-4 ${user?.isPremium ? "text-muted-foreground" : "text-muted-foreground/50"}`} />
          <Select 
            value={genderFilter || "all"} 
            onValueChange={handleFilterChange}
            disabled={!user?.isPremium}
          >
            <SelectTrigger className={`w-[140px] h-8 bg-background border-border/50 ${!user?.isPremium && "opacity-60"}`}>
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {user?.isPremium ? (
            <Crown className="w-4 h-4 text-accent" aria-label="Premium Feature" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowUpgradeDialog(true)}
            >
              <Crown className="w-3 h-3 mr-1 text-muted-foreground" />
              Premium
            </Button>
          )}
        </div>

        {/* Text Chat Panel */}
        {showChat && (
          <Card className="absolute bottom-20 right-4 w-80 h-96 border-border/50 shadow-card flex flex-col z-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Chat</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="bg-primary/10 rounded-lg p-3 max-w-[80%]">
                <p className="text-sm text-foreground">Hey! Nice to meet you!</p>
                <span className="text-xs text-muted-foreground">Sam • Just now</span>
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button size="icon" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-card border-t border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          </div>

          <Button
            size="lg"
            className="bg-gradient-primary hover:opacity-90 hover:scale-105 transition-all px-10 py-6 font-bold shadow-glow"
            onClick={handleNext}
            disabled={isSearching}
          >
            <SkipForward className="w-5 h-5 mr-2" />
            {isSearching ? "Searching..." : "Next"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full text-destructive"
              onClick={handleReport}
            >
              <Flag className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Premium Upgrade Dialog */}
      <PremiumUpgradeDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
    </div>
  );
};

export default Chat;
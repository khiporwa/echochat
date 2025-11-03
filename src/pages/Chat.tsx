import { useState, useEffect, useRef } from "react";
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
import SimplePeer from 'simple-peer'; // Requires npm install simple-peer

type GenderFilter = "male" | "female" | "other" | null;

interface Opponent {
  id: string;
  username: string;
}

// NOTE: Ensure this URL uses HTTPS if that's your current setup!
// This URL must match the IP and port of your backend server (3001).
const SOCKET_URL = "https://192.168.29.173:3001"; 

const Chat = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [localStreamVisible, setLocalStreamVisible] = useState<MediaStream | null>(null); 
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  const [isSearching, setIsSearching] = useState(true);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const activeStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  // --- MEDIA STREAM LOGIC ---

  const stopMediaStream = () => {
    // Stop local stream
    const stream = activeStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
      setLocalStreamVisible(null);
    }
    // Destroy peer connection
    if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }
    // Clear remote stream state
    setRemoteStream(null);
  };

  // Function to start the WebRTC connection
  const initiatePeerConnection = (initiator: boolean, stream: MediaStream, opponentId: string) => {
    // 1. Destroy any existing peer first
    if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }

    // 2. Create the new peer instance
    const peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: stream,
    });

    peerRef.current = peer;

    // 3. Signaling: When the peer generates connection data (SDP offer/answer)
    peer.on('signal', data => {
        // Send this signal data to the opponent via the Socket.io server
        socketRef.current?.emit('signal', {
            to: opponentId,
            signal: data
        });
    });

    // 4. Remote Stream: When the opponent sends their stream, get it here
    peer.on('stream', remoteStream => {
        setRemoteStream(remoteStream); // Store stream to render
    });
    
    // 5. Cleanup on peer close/error
    peer.on('close', () => {
        console.log('Peer connection closed.');
        handleNext(); // Automatically search for a new match
    });
    
    // 6. Handle peer errors
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        handleNext(); // Automatically search for a new match on error
    });
  };

  // Function to handle signal data received from the opponent
  const handleSignalFromOpponent = (signal: SimplePeer.SignalData) => {
    if (peerRef.current) {
        peerRef.current.signal(signal);
    }
  };

  // EFFECT: Handle Camera Access and Component Cleanup
  useEffect(() => {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        activeStreamRef.current = stream;
        setLocalStreamVisible(stream);

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

    // CRITICAL: Cleanup function that ALWAYS runs on unmount
    return () => {
      stopMediaStream();
      socketRef.current?.disconnect();
    };
  }, [toast]);

  // Handle video element update for local stream
  useEffect(() => {
    if (localStreamVisible && videoRef.current) {
      videoRef.current.srcObject = localStreamVisible;
    }
  }, [localStreamVisible]);

  // Handle video element update for remote stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);


  // Handle video/audio track toggles
  useEffect(() => {
    const videoTrack = activeStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isVideoOff;
    }
    const audioTrack = activeStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
    }
  }, [isVideoOff, isMuted]);

  // Simulate connection loading screen duration
  useEffect(() => {
    // This timeout is largely obsolete now, as the searching is driven by the socket.
    // Kept here for potential initial UI purposes if needed.
    // setTimeout(() => setIsConnecting(false), 2000); 
  }, []);

  // --- SOCKET MATCHING LOGIC ---

  const startMatching = (isNext = false) => {
    if (!user?.id || !activeStreamRef.current) return;
    
    setOpponent(null);
    setRemoteStream(null);
    if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
    }

    setIsSearching(true);

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
  };

  // EFFECT: Handle Socket Connection and Events
  useEffect(() => {
    if (!user?.id) return;
    
    // Connect to the specific IP and port
    const socket = io(SOCKET_URL, {
        query: { userId: user.id },
        withCredentials: true,
        reconnectionAttempts: 5, // Attempt reconnection if connection is lost
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
      startMatching(); // Start matching automatically on connect
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setOpponent(null);
      setRemoteStream(null);
      setIsSearching(false);
      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }
    });

    // Event 1: Match found from backend
    socket.on('matched', (matchData: { opponentId: string; opponentUsername: string }) => {
      setOpponent({
        id: matchData.opponentId,
        username: matchData.opponentUsername,
      });
      setIsSearching(false);
      
      toast({
        title: "Match Found!",
        description: `You are now connected with ${matchData.opponentUsername}. Starting video...`,
      });

      // **WebRTC Connection Setup**
      const initiator = user.id > matchData.opponentId; 
      const stream = activeStreamRef.current;
      
      if (stream) {
          initiatePeerConnection(initiator, stream, matchData.opponentId);
      }
    });
    
    // Event 2: Receive signaling data from opponent
    socket.on('signal', (data: { from: string, signal: SimplePeer.SignalData }) => {
        // Only process signal if it's from the current opponent
        if (opponent?.id && data.from === opponent.id) {
            handleSignalFromOpponent(data.signal);
        } else if (data.from === user.id) {
            // Self-signaling logic can be added here if necessary
        }
    });


    // Event 3: No match found immediately, user is placed in queue
    socket.on('waiting', () => {
      setOpponent(null);
      setRemoteStream(null);
      setIsSearching(true);
    });
    
    // Cleanup socket connection on unmount
    return () => {
      socket.disconnect();
    };
  }, [user?.id, toast, opponent]);

  // Handler for 'Next' button
  const handleNext = () => {
    if (peerRef.current) {
        peerRef.current.destroy(); 
        peerRef.current = null;
    }
    startMatching(true);
    
    setOpponent(null);
    setRemoteStream(null);
    setShowChat(false);
  };

  // Handler for 'X' button
  const handleExitChat = () => {
    stopMediaStream();
    socketRef.current?.disconnect();
    navigate("/dashboard");
  };

  // FIX: Restore missing handler
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
  
  const showConnectingLoader = isSearching && !remoteStream;

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
          <Button variant="ghost" onClick={handleExitChat}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-muted">
        {/* Partner Video (MAIN WINDOW) */}
        <div className="absolute inset-0 bg-gradient-hero flex items-center justify-center">
            
            {remoteStream ? (
                // Display Opponent's Video (Large Scale)
                <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover" 
                />
            ) : showConnectingLoader ? (
                // Connecting Loader
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-xl font-semibold text-foreground">Connecting...</p>
                    <p className="text-muted-foreground">Finding someone for you to chat with</p>
                </div>
            ) : opponent ? (
                 // Fallback: Match found, but video stream hasn't arrived
                 <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl font-bold text-white">
                            {opponent.username.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <p className="text-2xl font-bold mb-1 tracking-tight text-foreground">{opponent.username}</p>
                    <p className="text-muted-foreground">Waiting for opponent's video...</p>
                 </div>
            ) : (
                // Waiting State (Before match is found)
                <div className="text-center">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-xl font-semibold text-foreground">Waiting for connection...</p>
                    <p className="text-muted-foreground">Click Next if stuck</p>
                </div>
            )}
        </div>

        {/* Own Video (Picture-in-Picture) */}
        <Card className="absolute top-4 right-4 w-64 h-48 border-border/50 overflow-hidden shadow-card">
          <div className="w-full h-full bg-muted flex items-center justify-center relative">
            {isVideoOff || !localStreamVisible ? (
              <div className="text-center">
                <VideoOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Camera off</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]" // Added mirror effect
              />
            )}
          </div>
        </Card>

        {/* Connection Quality Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">Excellent connection</span>
        </div>

        {/* Gender Filter (Premium Feature) */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border ${user?.isPremium ? "border-border/50" : "border-border/30 opacity-70"} transition-opacity`}>
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
          <Card className="absolute bottom-20 right-4 w-80 h-96 border-border/50 shadow-card flex flex-col">
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
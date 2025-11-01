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

type GenderFilter = "male" | "female" | "other" | null;

const Chat = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Request camera access when component mounts
  useEffect(() => {
    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
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

    // Cleanup function to stop the stream when component unmounts
    return () => {
      setLocalStream((currentStream) => {
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        return null;
      });
    };
  }, [toast]);

  // Update video element when stream is available
  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle video toggle - stop/start video track
  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;
      }
    }
  }, [isVideoOff, localStream]);

  // Handle audio toggle - mute/unmute audio track
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted, localStream]);

  // Simulate connection
  useEffect(() => {
    setTimeout(() => setIsConnecting(false), 2000);
  }, []);

  const handleNext = () => {
    setIsConnecting(true);
    setTimeout(() => setIsConnecting(false), 2000);
    toast({
      title: "Finding new match",
      description: "Connecting you with someone new...",
    });
  };


  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe.",
    });
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // Handle message sending
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="w-6 h-6 text-primary" />
          <span className="font-semibold">EchoChat</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-2 border-primary/30 font-semibold">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
            2,847 online
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-muted">
        {/* Partner Video (Main) */}
        <div className="absolute inset-0 bg-gradient-hero flex items-center justify-center">
          {isConnecting ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-xl font-semibold text-foreground">Connecting...</p>
              <p className="text-muted-foreground">Finding someone for you to chat with</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-bold text-white">SC</span>
              </div>
              <p className="text-2xl font-bold mb-1 tracking-tight text-foreground">Sam Cooper</p>
              <div className="flex gap-2 justify-center">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-2 border-primary/30 font-semibold">
                  🎨 Art
                </Badge>
                <Badge variant="secondary" className="bg-accent/10 text-accent border-2 border-accent/30 font-semibold">
                  🎮 Gaming
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Own Video (Picture-in-Picture) */}
        <Card className="absolute top-4 right-4 w-64 h-48 border-border/50 overflow-hidden shadow-card">
          <div className="w-full h-full bg-muted flex items-center justify-center relative">
            {isVideoOff || !localStream ? (
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
                className="w-full h-full object-cover"
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
            <Crown className="w-4 h-4 text-accent" title="Premium Feature" />
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
            disabled={isConnecting}
          >
            <SkipForward className="w-5 h-5 mr-2" />
            Next
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

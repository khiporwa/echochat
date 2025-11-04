import VideoChat from "@/components/VideoChat";
import { ArrowLeft, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeSelector } from "@/components/ThemeSelector";

const Chat = () => {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navbar for navigation back to dashboard */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <Video className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoChat
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSelector />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-20 pb-20">
        <h1 className="text-3xl font-black mb-6">Live Video Chat</h1>
        {/* Render the core video chat functionality */}
        <VideoChat />
      </div>
    </div>
  );
};

export default Chat;
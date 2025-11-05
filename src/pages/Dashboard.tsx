import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Settings, LogOut, Sparkles, Users, Clock } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleStartChat = () => {
    navigate("/chat");
  };

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  // FIX: The getInitials function was missing, causing a ReferenceError.
  // This function is now defined here to resolve the error.
  const getInitials = (username: string | undefined): string => {
    if (!username) return "U";

    const parts = username.trim().split(/\s+/);
    
    const firstInitial = parts[0].charAt(0).toUpperCase();

    if (parts.length > 1) {
      const secondInitial = parts[parts.length - 1].charAt(0).toUpperCase();
      return `${firstInitial}${secondInitial}`;
    }

    return firstInitial;
  };

  const userInitials = getInitials(user?.username);


  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Video className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoChat
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* User Profile Card - Responsive */}
          <Card className="bg-card/80 backdrop-blur-sm border-2 border-border shadow-elevated">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary/20 shadow-glow">
                  <AvatarImage src="" />
                  {/* **MODIFIED CODE: Dynamic Initials** */}
                  <AvatarFallback className="bg-gradient-primary text-white text-2xl sm:text-3xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                  {/* **END MODIFIED CODE** */}
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl sm:text-3xl font-black mb-1 tracking-tight">Welcome back, {user?.username || "User"}!</h2>
                  <p className="text-muted-foreground font-medium text-lg">Ready to meet someone new?</p>
                  {user?.isPremium && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent border-2 border-accent/30 font-semibold mt-2">
                      ⭐ Premium Member
                    </Badge>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-2 border-primary/30 font-semibold px-3 py-1">
                      🎨 Art
                    </Badge>
                    <Badge variant="secondary" className="bg-accent/10 text-accent border-2 border-accent/30 font-semibold px-3 py-1">
                      🎮 Gaming
                    </Badge>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-2 border-primary/30 font-semibold px-3 py-1">
                      🎵 Music
                    </Badge>
                  </div>
                </div>
                <Link to="/profile" className="mt-4 sm:mt-0">
                  <Button variant="outline" className="border-2 font-semibold hover:border-primary/50 hover:bg-primary/5">Edit Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Main CTA - Responsive */}
          <div className="relative rounded-3xl bg-gradient-primary p-16 text-center overflow-hidden shadow-elevated">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
            <div className="relative z-10">
              <Sparkles className="w-14 h-14 text-white mx-auto mb-6 animate-pulse" />
              <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                Start Your Next Connection
              </h3>
              <p className="text-white/95 text-lg mb-10 max-w-xl mx-auto font-medium">
                Click below to be matched with someone new. You never know who you'll meet!
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-white/95 hover:scale-105 transition-all text-lg sm:text-xl px-10 sm:px-14 py-6 sm:py-8 font-bold shadow-elevated"
                onClick={handleStartChat}
              >
                <Video className="w-6 h-6 mr-3" />
                Start Chatting
              </Button>
            </div>
          </div>

          {/* Stats Cards - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/40 transition-all shadow-card hover:shadow-elevated">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">Total Connections</p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight">127</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-2 border-border hover:border-accent/40 transition-all shadow-card hover:shadow-elevated">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent/30">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">Time Chatting</p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight">24h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/40 transition-all shadow-card hover:shadow-elevated">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold">Active Now</p>
                    <p className="text-2xl sm:text-3xl font-black tracking-tight">2,847</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Tips */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Quick Tips</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>Be respectful and friendly to make meaningful connections</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>Use the "Next" button if you want to skip to a new match</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>Report any inappropriate behavior to help keep our community safe</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>Update your interests to get matched with like-minded people</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
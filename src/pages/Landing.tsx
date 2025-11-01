import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Video, Shield, Globe, Zap, ChevronRight } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/mainLogo.png";
// import heroImage from "@/assets/hero-redesign.jpg";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartChat = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EchoChat
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <Link to="/auth">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                  🎉 Now Live Globally
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight">
                Connect Instantly,
                <span className="block bg-gradient-primary bg-clip-text text-transparent">
                  Share Moments
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl">
                Experience random video chats with people around the world. Safe, anonymous, and instant connections at your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 transition-all text-lg px-10 py-7 shadow-glow group font-semibold"
                  onClick={handleStartChat}
                >
                  Start Chat Now
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all font-semibold">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
              <img
                src={heroImage}
                alt="EchoChat Platform"
                className="relative rounded-3xl shadow-card border border-border/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-surface/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight">Why Choose EchoChat?</h2>
            <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto font-medium">
              The most advanced random video chat platform with cutting-edge features
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/50 transition-all hover:shadow-elevated group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-glow">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Instant Connection</h3>
              <p className="text-muted-foreground text-base leading-relaxed font-medium">
                Connect with new people in seconds. Our advanced matching algorithm ensures quick and relevant connections.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/50 transition-all hover:shadow-elevated group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-lg shadow-accent/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Safe & Anonymous</h3>
              <p className="text-muted-foreground text-base leading-relaxed font-medium">
                Your privacy matters. Chat anonymously with built-in moderation and reporting tools for a safe experience.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-card/80 backdrop-blur-sm border-2 border-border hover:border-primary/50 transition-all hover:shadow-elevated group">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-glow">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Global Community</h3>
              <p className="text-muted-foreground text-base leading-relaxed font-medium">
                Join millions of users worldwide. Meet people from different cultures and make international friends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="relative rounded-3xl bg-gradient-primary p-12 lg:p-20 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">
                Ready to Start Connecting?
              </h2>
              <p className="text-xl text-white/95 mb-8 font-medium">
                Join thousands of users already making meaningful connections on EchoChat
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                className="bg-white text-primary hover:bg-white/95 hover:scale-105 transition-all text-lg px-10 py-7 font-bold shadow-elevated"
                onClick={handleStartChat}
              >
                Get Started Free
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4 bg-surface/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">EchoChat</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Connect with people worldwide through instant video chats.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 text-center text-muted-foreground text-sm">
            <p>© 2025 EchoChat. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

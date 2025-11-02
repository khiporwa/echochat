import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Mail, Lock, User, Chrome, Facebook } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await auth.login(loginEmail, loginPassword);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupPassword !== signupConfirm) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await auth.signup(signupUsername, signupEmail, signupPassword);
      toast({
        title: "Account created!",
        description: "Welcome to EchoChat!",
      });
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMessage = error.message;

      // START NEW ERROR LOGIC
      if (errorMessage?.includes("User already exists with this email")) {
        toast({
          title: "Account Exists",
          description: `The email "${signupEmail}" is already registered. Please switch to the Log In tab.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup failed",
          description: errorMessage || "Could not create account. Please try again.",
          variant: "destructive",
        });
      }
      // END NEW ERROR LOGIC

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Video className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            EchoChat
          </span>
        </Link>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-card">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <a href="#" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>

                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <Button variant="outline" type="button" className="border-border/50">
                      <Chrome className="w-4 h-4 mr-2" />
                      Google
                    </Button>
                    <Button variant="outline" type="button" className="border-border/50">
                      <Facebook className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <CardTitle>Create account</CardTitle>
                  <CardDescription>Join thousands of users connecting worldwide</CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="johndoe"
                        className="pl-10"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </CardContent>

                <CardFooter className="flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>

                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full">
                    <Button variant="outline" type="button" className="border-border/50">
                      <Chrome className="w-4 h-4 mr-2" />
                      Google
                    </Button>
                    <Button variant="outline" type="button" className="border-border/50">
                      <Facebook className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? <a href="#" className="text-primary hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Video, Upload, X, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeSelector } from "@/components/ThemeSelector";

const ProfileSettings = () => {
  const { toast } = useToast();
  const [interests, setInterests] = useState(["Art", "Gaming", "Music"]);
  const [newInterest, setNewInterest] = useState("");

  const handleSave = () => {
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const addInterest = () => {
    if (newInterest.trim() && interests.length < 10) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navbar */}
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

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          {/* Profile Picture */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-card">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture to personalize your account</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-2 border-primary">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-primary text-white text-3xl">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button variant="outline" className="border-border/50">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-card">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="johndoe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" />
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-card">
            <CardHeader>
              <CardTitle>Interests & Tags</CardTitle>
              <CardDescription>Add interests to get matched with like-minded people</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20 pl-3 pr-1 py-2"
                  >
                    {interest}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-2"
                      onClick={() => removeInterest(interest)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addInterest()}
                />
                <Button onClick={addInterest} disabled={!newInterest.trim() || interests.length >= 10}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can add up to 10 interests ({interests.length}/10)
              </p>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-card">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-card/50 backdrop-blur-sm border-destructive/50 shadow-card">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link to="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

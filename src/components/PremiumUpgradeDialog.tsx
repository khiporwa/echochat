import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PremiumUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  savings?: number;
  features: string[];
}

export const PremiumUpgradeDialog = ({ open, onOpenChange }: PremiumUpgradeDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: "monthly",
      name: "Monthly Premium",
      price: 9.99,
      currency: "USD",
      features: [
        "Filter matches by gender",
        "Skip unlimited times",
        "Priority matching",
        "Ad-free experience",
      ],
    },
    {
      id: "yearly",
      name: "Yearly Premium",
      price: 79.99,
      currency: "USD",
      savings: 20,
      features: [
        "Filter matches by gender",
        "Skip unlimited times",
        "Priority matching",
        "Ad-free experience",
        "Save 20% vs monthly",
      ],
    },
  ]);
  const { upgradeToPremium, refreshUser } = useAuth();
  const { toast } = useToast();

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      await upgradeToPremium(selectedPlan);
      await refreshUser();
      toast({
        title: "Upgrade successful!",
        description: "You now have access to premium features.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Upgrade failed",
        description: error.message || "Could not upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black">Upgrade to Premium</DialogTitle>
              <DialogDescription className="text-base">
                Unlock exclusive features to enhance your chat experience
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? "border-primary border-2 shadow-elevated"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan(plan.id as "monthly" | "yearly")}
            >
              {plan.savings && (
                <Badge className="absolute -top-3 right-4 bg-accent text-white">
                  Save {plan.savings}%
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.id === "monthly" ? "mo" : "yr"}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${
                    selectedPlan === plan.id
                      ? "bg-gradient-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id as "monthly" | "yearly");
                  }}
                >
                  {selectedPlan === plan.id ? "Selected" : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-gradient-primary hover:opacity-90"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              "Processing..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


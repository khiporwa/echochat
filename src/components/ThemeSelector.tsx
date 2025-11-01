import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "@/contexts/ThemeContext";

type ThemeOption = {
  id: string;
  name: string;
  colors: string[];
};

const lightThemes: ThemeOption[] = [
  { id: "monochrome", name: "Monochrome", colors: ["#000000", "#666666", "#FFFFFF"] },
  { id: "ocean", name: "Ocean", colors: ["#00A8FF", "#4FC3F7", "#E3F2FD"] },
  { id: "forest", name: "Forest", colors: ["#2E7D32", "#66BB6A", "#E8F5E9"] },
  { id: "sunset", name: "Sunset", colors: ["#FF6B35", "#FFA726", "#FFF3E0"] },
  { id: "purple", name: "Purple", colors: ["#7B2CBF", "#BA68C8", "#F3E5F5"] },
  { id: "emerald", name: "Emerald", colors: ["#10B981", "#34D399", "#D1FAE5"] },
  { id: "rose", name: "Rose", colors: ["#E91E63", "#F06292", "#FCE4EC"] },
];

const darkThemes: ThemeOption[] = [
  { id: "monochrome-dark", name: "Monochrome Dark", colors: ["#FFFFFF", "#888888", "#000000"] },
  { id: "ocean-dark", name: "Ocean Dark", colors: ["#00D9FF", "#4FC3F7", "#0A1929"] },
  { id: "forest-dark", name: "Forest Dark", colors: ["#4CAF50", "#81C784", "#1B5E20"] },
  { id: "sunset-dark", name: "Sunset Dark", colors: ["#FF8A65", "#FFB74D", "#E65100"] },
  { id: "purple-dark", name: "Purple Dark", colors: ["#9C27B0", "#CE93D8", "#4A148C"] },
  { id: "emerald-dark", name: "Emerald Dark", colors: ["#10B981", "#6EE7B7", "#064E3B"] },
  { id: "rose-dark", name: "Rose Dark", colors: ["#EC4899", "#F472B6", "#831843"] },
];

export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Select theme"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 max-h-[600px] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Light Themes</h3>
            <div className="grid grid-cols-2 gap-2">
              {lightThemes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id as any)}
                  className={`group relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    theme === themeOption.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex gap-1 justify-center">
                    {themeOption.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs font-medium text-center">
                      {themeOption.name}
                    </span>
                    {theme === themeOption.id && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">Dark Themes</h3>
            <div className="grid grid-cols-2 gap-2">
              {darkThemes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id as any)}
                  className={`group relative flex flex-col gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    theme === themeOption.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex gap-1 justify-center">
                    {themeOption.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs font-medium text-center">
                      {themeOption.name}
                    </span>
                    {theme === themeOption.id && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};


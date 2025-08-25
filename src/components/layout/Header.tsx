
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/forms/button";
import { AvatarWithInitials } from "@/components/ui/UI_Elements/avatar-with-initials";
import { Badge } from "@/components/ui/data_display/badge";
import { LogOut, Package } from "lucide-react";
import { useGeneration } from "@/contexts/GenerationContext";
import { RealtimeStatusIndicator } from "@/components/common/RealtimeStatusIndicator";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { globalGenerationResults, setShowFirstModal } = useGeneration();
  const { theme } = useTheme();

  const handleSignOut = () => {
    signOut();
    navigate('/auth/signin');
  };

  return (
    <header className={`border-b sticky top-0 z-50 transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/8dc1a962-435d-405e-aefb-b40351570fa1.png" 
            alt="Feed Genesis Logo" 
            className="h-14 w-auto"
          />
        </div>
        
        {/* User Info and Logout */}
        {user && (
          <div className="flex items-center space-x-4">
            {/* Real-time Status Indicator */}
            <RealtimeStatusIndicator />
            
            {/* Generation Results Notification - Button to open first modal */}
            {globalGenerationResults.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFirstModal(true)}
                className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">View Results</span>
                <Badge variant="secondary" className="ml-1 bg-green-600 text-white">
                  {globalGenerationResults.length}
                </Badge>
              </Button>
            ) : (
              <div className={`text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>No results</div>
            )}
            
            <div className="flex items-center space-x-3">
              <AvatarWithInitials 
                initials={user.initials} 
                size="sm"
              />
              <div className="hidden md:block">
                <p className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{user.displayName}</p>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>{user.email}</p>
              </div>
            </div>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

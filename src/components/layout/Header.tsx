
import { Button } from "@/components/ui/button";
import { useView } from "@/contexts/ViewContext";
import { Settings, User } from "lucide-react";

export function Header() {
  const { viewMode, setViewMode, isAdmin } = useView();

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-primary">FeedGenerator</h1>
          {isAdmin && (
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              Admin Mode
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setViewMode('user')}
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>View as User</span>
            </Button>
          )}
          
          <Button
            variant={isAdmin ? "secondary" : "outline"}
            onClick={() => setViewMode(isAdmin ? 'user' : 'admin')}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>{isAdmin ? 'Exit Admin' : 'Admin Panel'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}


import { useView } from "@/contexts/ViewContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, User } from "lucide-react";

export function Header() {
  const { isAdmin, toggleView } = useView();

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">FeedGenerator</h1>
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? "Admin" : "User"} Mode
          </Badge>
        </div>
        
        <Button 
          onClick={toggleView} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-2"
        >
          {isAdmin ? <User className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          <span>Switch to {isAdmin ? "User" : "Admin"}</span>
        </Button>
      </div>
    </header>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function AuthButton() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>{user.email}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        className="flex items-center space-x-1"
      >
        <LogOut className="h-3 w-3" />
        <span>Sign Out</span>
      </Button>
    </div>
  );
}
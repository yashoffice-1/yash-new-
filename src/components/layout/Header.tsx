
import { AuthButton } from "@/components/AuthButton";

export function Header() {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/89de7e4b-f2ba-4d6e-b0dd-47971ec53def.png" 
            alt="FeedGenesis Logo" 
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-bold">FeedGenesis</h1>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}

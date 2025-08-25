import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
        ${theme === 'dark' 
          ? 'bg-gray-700 shadow-inner' 
          : 'bg-gray-200 shadow-inner'
        }
        hover:scale-105 active:scale-95
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Toggle Circle */}
      <div
        className={`
          absolute left-0.5 h-7 w-7 rounded-full transition-all duration-300 ease-in-out
          flex items-center justify-center shadow-md
          ${theme === 'dark' 
            ? 'translate-x-8 bg-gray-800 border border-gray-600' 
            : 'translate-x-0 bg-white border border-gray-300'
          }
        `}
      >
        {theme === 'light' ? (
          <Sun className="h-3.5 w-3.5 text-amber-500 transition-all duration-300" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-blue-400 transition-all duration-300" />
        )}
      </div>

      {/* Background Icons (subtle) */}
      <div className="flex w-full justify-between px-1.5">
        <Sun className={`h-3 w-3 transition-all duration-300 ${
          theme === 'light' 
            ? 'text-amber-500 opacity-100' 
            : 'text-gray-400 opacity-40'
        }`} />
        <Moon className={`h-3 w-3 transition-all duration-300 ${
          theme === 'dark' 
            ? 'text-blue-400 opacity-100' 
            : 'text-gray-400 opacity-40'
        }`} />
      </div>

      {/* Ripple Effect */}
      <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition-opacity duration-200 hover:opacity-100" />
    </button>
  );
}

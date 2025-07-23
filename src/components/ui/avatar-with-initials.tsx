import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarWithInitialsProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarWithInitials({ 
  initials, 
  size = 'md', 
  className 
}: AvatarWithInitialsProps) {
  // Handle undefined or null initials
  const safeInitials = initials || 'U';
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl'
  };

  // Generate a consistent color based on initials
  const getColorFromInitials = (initials: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];
    
    // Handle undefined or empty initials
    if (!initials || initials.length === 0) {
      return colors[0]; // Default to first color
    }
    
    // Safe way to get char codes
    const charCode1 = initials.charCodeAt(0) || 0;
    const charCode2 = initials.length > 1 ? initials.charCodeAt(1) || 0 : 0;
    const index = charCode1 + charCode2;
    return colors[index % colors.length];
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-semibold',
        sizeClasses[size],
        getColorFromInitials(safeInitials),
        className
      )}
    >
      {safeInitials}
    </div>
  );
} 
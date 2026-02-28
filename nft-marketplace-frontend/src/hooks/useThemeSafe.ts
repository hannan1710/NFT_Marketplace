'use client';

import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';

export function useThemeSafe() {
  const context = useContext(ThemeContext);
  
  // Return safe defaults if context is not available
  if (context === undefined) {
    return {
      theme: 'light' as const,
      toggleTheme: () => {},
    };
  }
  
  return context;
}

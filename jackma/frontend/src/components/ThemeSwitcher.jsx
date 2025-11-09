import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useTheme, themes } from '../contexts/ThemeContext';

export const ThemeSwitcher = () => {
  const { currentTheme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeColors = {
    cyber: {
      preview: 'linear-gradient(135deg, #00D5D5, #1A9B8E, #00E673)',
      icon: '🌊',
    },
    purple: {
      preview: 'linear-gradient(135deg, #9D4EDD, #B24BF3, #E879F9)',
      icon: '🔮',
    },
    dark: {
      preview: 'linear-gradient(135deg, #FF3333, #D91414, #FF5C33)',
      icon: '🔥',
    },
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative overflow-hidden border-primary/30 hover:border-primary/50 transition-all"
      >
        <Palette className="w-5 h-5 text-primary" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Theme Menu */}
          <Card className="absolute right-0 top-12 z-50 p-4 space-y-3 min-w-[280px] border-primary/20 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Choose Theme</h3>
            </div>
            
            {Object.keys(themes).map((themeKey) => {
              const theme = themes[themeKey];
              const colors = themeColors[themeKey];
              const isActive = currentTheme === themeKey;
              
              return (
                <button
                  key={themeKey}
                  onClick={() => {
                    changeTheme(themeKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 scale-[1.02]'
                      : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {/* Color Preview */}
                  <div 
                    className="w-12 h-12 rounded-lg shadow-lg"
                    style={{ background: colors.preview }}
                  ></div>
                  
                  {/* Theme Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{colors.icon}</span>
                      <span className="font-medium text-sm">{theme.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {themeKey === 'cyber' && 'Fresh & Tech'}
                      {themeKey === 'purple' && 'Mysterious & Elegant'}
                      {themeKey === 'dark' && 'Hacker & Bold'}
                    </p>
                  </div>
                  
                  {/* Check Icon */}
                  {isActive && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
};

export default ThemeSwitcher;

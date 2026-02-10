'use client';

import * as React from 'react';
import { MessageSquare, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  activeTab: 'chat' | 'canvas';
  onTabChange: (tab: 'chat' | 'canvas') => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="flex items-center border-t bg-background">
      <button
        onClick={() => onTabChange('chat')}
        className={cn(
          'flex flex-1 flex-col items-center gap-1 py-2 transition-colors',
          activeTab === 'chat'
            ? 'border-t-2 border-primary text-foreground font-medium'
            : 'text-muted-foreground'
        )}
      >
        <MessageSquare className="h-5 w-5" />
        <span className="text-xs">Chat</span>
      </button>
      <button
        onClick={() => onTabChange('canvas')}
        className={cn(
          'flex flex-1 flex-col items-center gap-1 py-2 transition-colors',
          activeTab === 'canvas'
            ? 'border-t-2 border-primary text-foreground font-medium'
            : 'text-muted-foreground'
        )}
      >
        <Layout className="h-5 w-5" />
        <span className="text-xs">Canvas</span>
      </button>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import {
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Settings,
  Zap,
  Menu,
  PhoneOff,
  Hand
} from 'lucide-react';

interface MobileOptimizerProps {
  children: React.ReactNode;
  sessionId: string;
  participantCount: number;
  isHost: boolean;
  isMuted: boolean;
  handRaised: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
}

export const SanctuaryMobileOptimizer: React.FC<MobileOptimizerProps> = ({
  children,
  sessionId,
  participantCount,
  isHost,
  isMuted,
  handRaised,
  onToggleMute,
  onRaiseHand,
  onLeave
}) => {
  const { toast } = useToast();
  const [isLandscape, setIsLandscape] = useState(false);
  const [activePanel, setActivePanel] = useState<'audio' | 'chat' | 'participants' | 'settings'>('audio');

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerHeight < window.innerWidth);
    };

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Keep screen awake during audio sessions
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock request failed:', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {participantCount}
          </Badge>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">LIVE</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <Button
            size="sm"
            variant={isMuted ? "destructive" : "default"}
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {!isHost && (
            <Button
              size="sm"
              variant={handRaised ? "default" : "outline"}
              onClick={onRaiseHand}
            >
              <Hand className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="destructive"
            onClick={onLeave}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="border-t bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          {[
            { id: 'audio', label: 'Audio', icon: Mic },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'participants', label: 'People', icon: Users },
            { id: 'settings', label: 'Voice', icon: Zap }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activePanel === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel(tab.id as any)}
              className="flex flex-col h-auto py-2"
            >
              <tab.icon className="h-4 w-4 mb-1" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Haptic feedback for mobile interactions */}
      <style>{`
        @media (hover: none) {
          .touch-feedback:active {
            transform: scale(0.95);
            transition: transform 0.1s;
          }
        }
      `}</style>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LiveAudioSpace } from './LiveAudioSpace';
import { VoiceModulationPanel } from './VoiceModulationPanel';
import { SanctuaryChat } from './SanctuaryChat';
import { useSanctuarySocket } from '@/hooks/useSanctuarySocket';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';
import {
  Users,
  Clock,
  Shield,
  Zap,
  MessageSquare,
  Settings,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import axios from 'axios';

interface SessionDetails {
  id: string;
  title: string;
  description: string;
  hostAlias: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'live' | 'ended';
  isHost: boolean;
  isModerator: boolean;
  participantAlias: string;
  voiceModulationEnabled: boolean;
}

export const EnhancedLiveAudioSpace: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audio' | 'chat' | 'settings'>('audio');
  const [voiceModulationEnabled, setVoiceModulationEnabled] = useState(false);
  
  useEffect(() => {
    if (sessionId) {
      loadSessionDetails();
    }
  }, [sessionId]);

  const loadSessionDetails = async () => {
    try {
      const response = await axios.get(`/api/live-sanctuary/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        const sessionData = response.data.data.session;
        setSession({
          id: sessionData.id,
          title: sessionData.title,
          description: sessionData.description,
          hostAlias: sessionData.hostAlias,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          maxParticipants: sessionData.maxParticipants,
          currentParticipants: sessionData.participants.length,
          status: sessionData.status,
          isHost: sessionData.hostId === user?.id,
          isModerator: sessionData.moderators?.includes(user?.id),
          participantAlias: sessionData.participants.find((p: any) => p.userId === user?.id)?.alias || 'Anonymous',
          voiceModulationEnabled: false
        });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast({
        title: 'Session Load Failed',
        description: 'Could not load session details',
        variant: 'destructive'
      });
      navigate('/my-sanctuaries');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    try {
      await axios.post(`/api/live-sanctuary/sessions/${sessionId}/leave`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      toast({
        title: 'Left Session',
        description: 'You have left the audio sanctuary',
      });

      navigate('/my-sanctuaries');
    } catch (error) {
      console.error('Failed to leave session:', error);
      navigate('/my-sanctuaries');
    }
  };

  if (loading) {
    return (
      <Layout hideSidebar={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sanctuary session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout hideSidebar={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">This sanctuary session could not be found.</p>
            <Button onClick={() => navigate('/my-sanctuaries')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to My Sanctuaries
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideSidebar={true}>
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
        {/* Header */}
        <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/my-sanctuaries')}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                <div>
                  <h1 className="text-xl font-bold">{session.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {session.currentParticipants}/{session.maxParticipants}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(session.startTime).toLocaleTimeString()}
                    </div>
                    <Badge 
                      variant={session.status === 'live' ? 'default' : 'secondary'}
                      className={session.status === 'live' ? 'bg-green-500' : ''}
                    >
                      {session.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {session.isHost && (
                  <Badge variant="outline">
                    <Shield className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                )}
                {session.isModerator && (
                  <Badge variant="outline">
                    Moderator
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden border-b bg-background">
          <div className="container mx-auto px-4">
            <div className="flex space-x-1">
              {[
                { id: 'audio', label: 'Audio', icon: Users },
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'settings', label: 'Voice', icon: Zap }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1"
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-4 gap-6">
              {/* Main Audio Space */}
              <div className="col-span-3">
                <LiveAudioSpace
                  session={{
                    id: session.id,
                    participants: []
                  } as any}
                  currentUser={{
                    id: user?.id || '',
                    alias: session.participantAlias,
                    isHost: session.isHost,
                    isModerator: session.isModerator
                  }}
                  onLeave={handleLeaveSession}
                />
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Voice Modulation */}
                <VoiceModulationPanel
                  sessionId={session.id}
                  isEnabled={voiceModulationEnabled}
                  onToggle={setVoiceModulationEnabled}
                />

                {/* Chat */}
                <SanctuaryChat
                  sessionId={session.id}
                  socket={{
                    onEvent: () => {},
                    emit: () => {}
                  }}
                  className="h-96"
                />
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden">
            {activeTab === 'audio' && (
              <LiveAudioSpace
                session={{
                  id: session.id,
                  participants: []
                } as any}
                currentUser={{
                  id: user?.id || '',
                  alias: session.participantAlias,
                  isHost: session.isHost,
                  isModerator: session.isModerator
                }}
                onLeave={handleLeaveSession}
              />
            )}

            {activeTab === 'chat' && (
              <SanctuaryChat
                sessionId={session.id}
                socket={{
                  onEvent: () => {},
                  emit: () => {}
                }}
                className="h-96"
              />
            )}

            {activeTab === 'settings' && (
              <VoiceModulationPanel
                sessionId={session.id}
                isEnabled={voiceModulationEnabled}
                onToggle={setVoiceModulationEnabled}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
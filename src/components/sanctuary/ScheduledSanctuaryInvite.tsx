import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  Shield, 
  Mic, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Play
} from 'lucide-react';
import axios from 'axios';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';

interface ScheduledSanctuary {
  id: string;
  topic: string;
  description?: string;
  emoji?: string;
  hostAlias: string;
  scheduledDateTime: string;
  estimatedDuration: number;
  maxParticipants: number;
  registeredCount: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  liveSanctuarySessionId?: string;
  settings: {
    allowAnonymous: boolean;
    voiceModulationEnabled: boolean;
    moderationEnabled: boolean;
    emergencyContactEnabled: boolean;
    recordingEnabled: boolean;
    requireAcknowledgment: boolean;
  };
  joinStatus: {
    canJoin: boolean;
    reason: string;
    countdown?: number;
    waitingRoom?: boolean;
  };
}

export const ScheduledSanctuaryInvite: React.FC = () => {
  const { invitationCode } = useParams<{ invitationCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const [sanctuary, setSanctuary] = useState<ScheduledSanctuary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (invitationCode) {
      fetchSanctuary();
    }
  }, [invitationCode]);

  useEffect(() => {
    // Set up countdown timer if needed
    if (sanctuary?.joinStatus.countdown && sanctuary.joinStatus.countdown > 0) {
      setCountdown(sanctuary.joinStatus.countdown);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // Refresh sanctuary data when countdown reaches 0
            fetchSanctuary();
            return null;
          }
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sanctuary?.joinStatus.countdown]);

  // Check if user is host
  useEffect(() => {
    const role = searchParams.get('role');
    setIsHost(role === 'host');
  }, [searchParams]);

  const fetchSanctuary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/scheduled-sanctuary/${invitationCode}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        } : {}
      });

      if (response.data.success) {
        setSanctuary(response.data.data.sanctuary);
      }
    } catch (err: any) {
      console.error('Failed to fetch sanctuary:', err);
      setError(err.response?.data?.error || 'Failed to load sanctuary');
      toast({
        title: 'Loading Failed',
        description: 'Could not load sanctuary information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (acknowledged = false) => {
    if (!sanctuary || !isAuthenticated) return;

    try {
      setIsJoining(true);
      
      const response = await axios.post(
        `/api/scheduled-sanctuary/${invitationCode}/join`,
        { acknowledged },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.data.success) {
        const result = response.data.data;

        if (result.requiresAcknowledgment) {
          setShowAcknowledgment(true);
          return;
        }

        if (result.redirect === 'live' && result.liveSanctuarySessionId) {
          navigate(`/sanctuary/live/${result.liveSanctuarySessionId}?role=${isHost ? 'host' : 'participant'}`);
          return;
        }

        if (result.status === 'waiting') {
          toast({
            title: 'Registered Successfully',
            description: result.message,
          });
          
          // Refresh to update registered count
          fetchSanctuary();
          return;
        }

        if (result.status === 'ready') {
          toast({
            title: 'Ready to Join',
            description: result.message,
          });
          // Host can now start the session
          fetchSanctuary();
          return;
        }
      }
    } catch (err: any) {
      console.error('Failed to join sanctuary:', err);
      toast({
        title: 'Join Failed',
        description: err.response?.data?.error || 'Could not join sanctuary',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartSession = async () => {
    if (!sanctuary || !isHost) return;

    try {
      setIsJoining(true);
      
      const response = await axios.post(
        `/api/scheduled-sanctuary/${invitationCode}/start`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.data.success) {
        const { liveSession } = response.data.data;
        navigate(`/sanctuary/live/${liveSession.id}?role=host`);
      }
    } catch (err: any) {
      console.error('Failed to start session:', err);
      toast({
        title: 'Start Failed',
        description: err.response?.data?.error || 'Could not start session',
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading sanctuary invitation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !sanctuary) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Invitation Not Found</CardTitle>
              <CardDescription>
                {error || 'The sanctuary invitation could not be loaded.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/sanctuary')} variant="outline">
                Return to Sanctuary
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (showAcknowledgment) {
    return (
      <Layout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="text-4xl mb-4">{sanctuary.emoji || '🎙️'}</div>
              <CardTitle>Join "{sanctuary.topic}"?</CardTitle>
              <CardDescription>
                Please review the session details and acknowledge to proceed
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-2">Session Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(sanctuary.scheduledDateTime).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration: {sanctuary.estimatedDuration} minutes
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Host: {sanctuary.hostAlias}
                  </div>
                </div>
                
                {sanctuary.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {sanctuary.description}
                  </p>
                )}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                  What to Expect:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• This is a live audio session with voice interaction</li>
                  <li>• {sanctuary.settings.allowAnonymous ? 'Anonymous participation allowed' : 'Account required'}</li>
                  {sanctuary.settings.voiceModulationEnabled && (
                    <li>• Voice masking available for privacy</li>
                  )}
                  {sanctuary.settings.moderationEnabled && (
                    <li>• AI moderation ensures safe environment</li>
                  )}
                  {sanctuary.settings.recordingEnabled && (
                    <li>• Session may be recorded with consent</li>
                  )}
                </ul>
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAcknowledgment(false)}
                >
                  Back
                </Button>
                <Button 
                  onClick={() => handleJoin(true)}
                  disabled={isJoining}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isJoining ? 'Joining...' : 'I Acknowledge & Join'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="text-4xl mb-4">{sanctuary.emoji || '🎙️'}</div>
            <CardTitle className="text-2xl">{sanctuary.topic}</CardTitle>
            <CardDescription className="text-base">
              {sanctuary.description || 'A live audio sanctuary session'}
            </CardDescription>
            
            <div className="flex justify-center gap-2 mt-4">
              <Badge 
                variant={sanctuary.status === 'live' ? 'default' : 'secondary'}
                className={sanctuary.status === 'live' ? 'bg-green-500' : ''}
              >
                {sanctuary.status === 'live' && <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />}
                {sanctuary.status.charAt(0).toUpperCase() + sanctuary.status.slice(1)}
              </Badge>
              
              {isHost && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Host
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Session Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Scheduled Time</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sanctuary.scheduledDateTime).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(sanctuary.scheduledDateTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Clock className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {sanctuary.estimatedDuration} minutes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium">Participants</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {sanctuary.registeredCount} / {sanctuary.maxParticipants}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Shield className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium">Host</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {sanctuary.hostAlias}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="font-medium mb-3">Session Features</h3>
              <div className="flex flex-wrap gap-2">
                {sanctuary.settings.voiceModulationEnabled && (
                  <Badge variant="outline" className="text-purple-600">
                    <Mic className="w-3 h-3 mr-1" />
                    Voice Masking
                  </Badge>
                )}
                {sanctuary.settings.moderationEnabled && (
                  <Badge variant="outline" className="text-blue-600">
                    <Shield className="w-3 h-3 mr-1" />
                    AI Moderated
                  </Badge>
                )}
                {sanctuary.settings.allowAnonymous && (
                  <Badge variant="outline" className="text-green-600">
                    Anonymous Safe
                  </Badge>
                )}
                {sanctuary.settings.emergencyContactEnabled && (
                  <Badge variant="outline" className="text-red-600">
                    Emergency Support
                  </Badge>
                )}
                {sanctuary.settings.recordingEnabled && (
                  <Badge variant="outline" className="text-gray-600">
                    May Record
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Status & Actions */}
            <div className="text-center space-y-4">
              {sanctuary.status === 'live' && sanctuary.liveSanctuarySessionId && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300">
                      Session is Live!
                    </span>
                  </div>
                  <Button 
                    onClick={() => navigate(`/sanctuary/live/${sanctuary.liveSanctuarySessionId}?role=${isHost ? 'host' : 'participant'}`)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Join Live Session
                  </Button>
                </div>
              )}

              {sanctuary.status === 'scheduled' && !sanctuary.joinStatus.canJoin && countdown && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">
                      Session starts in:
                    </span>
                  </div>
                  <div className="text-2xl font-mono text-blue-600 dark:text-blue-400 mb-3">
                    {formatCountdown(countdown)}
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    You'll be able to join when the session begins
                  </p>
                </div>
              )}

              {sanctuary.status === 'scheduled' && sanctuary.joinStatus.canJoin && (
                <div className="space-y-3">
                  {sanctuary.joinStatus.waitingRoom && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Early join enabled - You'll be in the waiting room until the session starts
                      </p>
                    </div>
                  )}

                  {isHost ? (
                    <Button 
                      onClick={handleStartSession}
                      disabled={isJoining}
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isJoining ? 'Starting...' : 'Start Session Now'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleJoin()}
                      disabled={isJoining || !isAuthenticated}
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isJoining ? 'Joining...' : 'Join Session'}
                    </Button>
                  )}
                </div>
              )}

              {sanctuary.status === 'ended' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      This session has ended
                    </span>
                  </div>
                </div>
              )}

              {sanctuary.status === 'cancelled' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-300">
                      This session has been cancelled
                    </span>
                  </div>
                </div>
              )}

              {!isAuthenticated && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                    You need to be signed in to join this sanctuary
                  </p>
                  <Button 
                    onClick={() => navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname))}
                    variant="outline"
                  >
                    Sign In to Join
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
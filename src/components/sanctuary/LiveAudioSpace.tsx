import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSanctuarySocket } from '@/hooks/useSanctuarySocket';
import { LiveAudioApi } from '@/services/liveAudioApi';
import { VoiceModulationPanel } from './VoiceModulationPanel';
import { SanctuaryChat } from './SanctuaryChat';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Hand, 
  Users, 
  PhoneOff,
  Settings,
  AlertTriangle,
  Shield,
  MessageSquare,
  Zap
} from 'lucide-react';
import type { LiveSanctuarySession, LiveParticipant } from '@/types/sanctuary';

interface LiveAudioSpaceProps {
  session: LiveSanctuarySession;
  currentUser: {
    id: string;
    alias: string;
    isHost?: boolean;
    isModerator?: boolean;
  };
  onLeave: () => void;
}

export const LiveAudioSpace = ({ session, currentUser, onLeave }: LiveAudioSpaceProps) => {
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [participants, setParticipants] = useState<LiveParticipant[]>(session.participants || []);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [voiceModulationEnabled, setVoiceModulationEnabled] = useState(false);
  
  // Socket connection for real-time events
  const {
    onEvent,
    sendEmojiReaction,
    toggleHand,
    promoteToSpeaker,
    muteParticipant,
    kickParticipant,
    sendEmergencyAlert
  } = useSanctuarySocket({
    sessionId: session.id,
    participant: {
      id: currentUser.id,
      alias: currentUser.alias,
      isHost: currentUser.isHost,
      isModerator: currentUser.isModerator
    }
  });

  // Audio context and stream management
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    // Listen for participant events
    const cleanupEvents = [
      onEvent('audio_participant_joined', (data) => {
        setParticipants(prev => [...prev, data.participant]);
        toast({
          title: "Participant Joined",
          description: `${data.participant.alias} joined the audio space`,
        });
      }),

      onEvent('audio_participant_left', (data) => {
        setParticipants(prev => prev.filter(p => p.id !== data.participantId));
        toast({
          title: "Participant Left", 
          description: `${data.participantAlias} left the audio space`,
        });
      }),

      onEvent('hand_raised', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.participantId 
            ? { ...p, handRaised: data.isRaised }
            : p
        ));
        
        if (data.isRaised) {
          toast({
            title: "Hand Raised",
            description: `${data.participantAlias} raised their hand`,
          });
        }
      }),

      onEvent('participant_muted', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.participantId 
            ? { ...p, isMuted: true }
            : p
        ));
        
        if (data.participantId === currentUser.id) {
          setIsMuted(true);
        }
      }),

      onEvent('emoji_reaction', (data) => {
        toast({
          title: `${data.emoji} Reaction`,
          description: `From ${data.participantAlias}`,
        });
      }),

      onEvent('emergency_alert', (data) => {
        toast({
          title: "🚨 Emergency Alert",
          description: data.message,
          variant: "destructive"
        });
      })
    ];

    return () => {
      cleanupEvents.forEach(cleanup => cleanup?.());
    };
  }, [onEvent, currentUser.id, toast]);

  // Initialize audio when component mounts
  useEffect(() => {
    initializeAudio();
    return () => {
      cleanup();
    };
  }, []);

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Initialize audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      micAnalyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(micAnalyserRef.current);
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      toast({
        title: "Audio Initialized",
        description: "Microphone access granted",
      });
    } catch (error) {
      console.error('Audio initialization failed:', error);
      toast({
        title: "Audio Access Denied",
        description: "Please allow microphone access to participate in audio",
        variant: "destructive"
      });
    }
  };

  const monitorAudioLevel = () => {
    if (!micAnalyserRef.current) return;

    const dataArray = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
    
    const checkLevel = () => {
      if (micAnalyserRef.current) {
        micAnalyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.floor((average / 255) * 100));
      }
      requestAnimationFrame(checkLevel);
    };
    
    checkLevel();
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const handleToggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        toast({
          title: isMuted ? "Microphone Unmuted" : "Microphone Muted",
          description: isMuted ? "You can now speak" : "Your microphone is muted",
        });
      }
    }
  };

  const handleToggleDeafen = () => {
    setIsDeafened(!isDeafened);
    toast({
      title: isDeafened ? "Audio Enabled" : "Audio Deafened", 
      description: isDeafened ? "You can now hear others" : "Audio output disabled",
    });
  };

  const handleRaiseHand = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    toggleHand(newState);
    
    toast({
      title: newState ? "Hand Raised" : "Hand Lowered",
      description: newState ? "Waiting for host permission to speak" : "Hand lowered",
    });
  };

  const handlePromoteToSpeaker = (participantId: string) => {
    promoteToSpeaker(participantId);
    toast({
      title: "Participant Promoted",
      description: "User has been given speaker permissions",
    });
  };

  const handleMuteParticipant = (participantId: string) => {
    muteParticipant(participantId);
    toast({
      title: "Participant Muted",
      description: "User has been muted by moderator",
    });
  };

  const handleKickParticipant = (participantId: string) => {
    kickParticipant(participantId);
    toast({
      title: "Participant Removed",
      description: "User has been removed from the session",
    });
  };

  const handleEmergencyAlert = () => {
    sendEmergencyAlert('help_needed', 'Emergency assistance requested in audio session');
    toast({
      title: "Emergency Alert Sent",
      description: "Help has been requested",
      variant: "destructive"
    });
  };

  const handleEmojiReaction = (emoji: string) => {
    sendEmojiReaction(emoji);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Audio Controls */}
      <div className="lg:col-span-2 space-y-6">
        {/* Audio Controls */}
        <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center space-x-4 mb-6">
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              onClick={handleToggleMute}
              className="px-6"
            >
              {isMuted ? (
                <MicOff className="h-5 w-5 mr-2" />
              ) : (
                <Mic className="h-5 w-5 mr-2" />
              )}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            
            <Button
              size="lg" 
              variant={isDeafened ? "destructive" : "outline"}
              onClick={handleToggleDeafen}
            >
              {isDeafened ? (
                <VolumeX className="h-5 w-5 mr-2" />
              ) : (
                <Volume2 className="h-5 w-5 mr-2" />
              )}
              {isDeafened ? 'Undeafen' : 'Deafen'}
            </Button>

            {!currentUser.isHost && (
              <Button
                size="lg"
                variant={handRaised ? "default" : "outline"}
                onClick={handleRaiseHand}
                className={handRaised ? "bg-yellow-500 hover:bg-yellow-600" : ""}
              >
                <Hand className="h-5 w-5 mr-2" />
                {handRaised ? 'Lower Hand' : 'Raise Hand'}
              </Button>
            )}

            <Button
              size="lg"
              variant={showVoiceSettings ? "default" : "outline"}
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            >
              <Zap className="h-5 w-5 mr-2" />
              Voice
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={onLeave}
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Leave
            </Button>
          </div>

          {/* Audio Level Indicator */}
          {!isMuted && (
            <div className="flex items-center justify-center space-x-2">
              <Mic className="h-4 w-4" />
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{audioLevel}%</span>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Voice Modulation Panel */}
        {showVoiceSettings && (
          <VoiceModulationPanel
            sessionId={session.id}
            isEnabled={voiceModulationEnabled}
            onToggle={setVoiceModulationEnabled}
          />
        )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`/avatars/avatar-${participant.avatarIndex || 1}.svg`} />
                    <AvatarFallback>
                      {participant.alias.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{participant.alias}</p>
                      {participant.isHost && (
                        <Badge variant="secondary" className="text-xs">Host</Badge>
                      )}
                      {participant.isModerator && (
                        <Badge variant="outline" className="text-xs">Mod</Badge>
                      )}
                      {participant.handRaised && (
                        <Hand className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${participant.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {participant.connectionStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {participant.isMuted ? (
                    <MicOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4 text-green-500" />
                  )}
                  
                  {/* Audio level indicator for active speakers */}
                  {!participant.isMuted && participant.audioLevel && participant.audioLevel > 0 && (
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-3 rounded-full ${
                            (participant.audioLevel || 0) > (i + 1) * 33
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Host/Moderator Controls */}
                  {(currentUser.isHost || currentUser.isModerator) && participant.id !== currentUser.id && (
                    <div className="flex space-x-1">
                      {participant.handRaised && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePromoteToSpeaker(participant.id)}
                        >
                          Allow
                        </Button>
                      )}
                      <Button
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMuteParticipant(participant.id)}
                      >
                        Mute
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleKickParticipant(participant.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emoji Reactions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center space-x-2">
            {['👍', '👏', '❤️', '😂', '🤔', '👎'].map((emoji) => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                onClick={() => handleEmojiReaction(emoji)}
                className="text-2xl"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <Button
              variant="destructive"
              onClick={handleEmergencyAlert}
              className="flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Emergency Help
            </Button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Use only in case of genuine emergencies
          </p>
        </CardContent>
      </Card>
      </div>

      {/* Right Sidebar - Chat */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Live Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          
          {showChat && (
            <SanctuaryChat
              sessionId={session.id}
              socket={{
                onEvent: onEvent,
                emit: (event: string, data: any) => {
                  // Socket integration handled by context
                }
              }}
              className="h-96"
            />
          )}
        </div>
      </div>
    </div>
  );
};
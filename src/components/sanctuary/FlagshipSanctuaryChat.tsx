import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSanctuarySocket } from '@/hooks/useSanctuarySocket';
import { SanctuaryMessage } from '@/types';
import { Send, Flag, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlagshipSanctuaryChatProps {
  sessionId: string;
  participant: {
    id: string;
    alias: string;
    isHost?: boolean;
    isModerator?: boolean;
  };
  className?: string;
}

// Generate consistent avatar color based on alias
const getAvatarColor = (alias: string): string => {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-secondary/20 text-secondary',
    'bg-green-100 text-green-600',
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-orange-100 text-orange-600',
    'bg-teal-100 text-teal-600'
  ];
  const charSum = alias.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

// Get initials from alias
const getInitials = (alias: string): string => {
  return alias
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const FlagshipSanctuaryChat: React.FC<FlagshipSanctuaryChatProps> = ({
  sessionId,
  participant,
  className
}) => {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<SanctuaryMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineParticipants, setOnlineParticipants] = useState<Set<string>>(new Set());

  // Initialize socket connection
  const {
    isConnected,
    onEvent,
    sendMessage,
    sendEmergencyAlert
  } = useSanctuarySocket({
    sessionId,
    participant
  });

  // Set up socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Listen for new messages
    const unsubscribeMessage = onEvent('sanctuary_message', (data) => {
      const message: SanctuaryMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        participantId: data.participantId,
        participantAlias: data.participantAlias,
        content: data.content,
        timestamp: data.timestamp,
        type: (data.type as "text" | "system" | "emoji-reaction" | "emergency") || 'text'
      };
      setMessages(prev => [...prev, message]);
    });

    // Listen for participant events
    const unsubscribeJoined = onEvent('audio_participant_joined', (data) => {
      const systemMessage: SanctuaryMessage = {
        id: `system-${Date.now()}`,
        participantId: 'system',
        participantAlias: 'System',
        content: `${data.participant.alias} joined the sanctuary`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      setOnlineParticipants(prev => new Set(prev).add(data.participant.id));
    });

    const unsubscribeLeft = onEvent('audio_participant_left', (data) => {
      const systemMessage: SanctuaryMessage = {
        id: `system-${Date.now()}`,
        participantId: 'system',
        participantAlias: 'System',
        content: `${data.participantAlias} left the sanctuary`,
        timestamp: data.timestamp,
        type: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      setOnlineParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.participantId);
        return newSet;
      });
    });

    // Listen for emergency alerts
    const unsubscribeEmergency = onEvent('emergency_alert', (data) => {
      const emergencyMessage: SanctuaryMessage = {
        id: `emergency-${Date.now()}`,
        participantId: 'system',
        participantAlias: 'Emergency System',
        content: `🚨 Emergency Alert: ${data.message}`,
        timestamp: data.timestamp,
        type: 'emergency'
      };
      setMessages(prev => [...prev, emergencyMessage]);
    });

    // Cleanup listeners
    return () => {
      unsubscribeMessage?.();
      unsubscribeJoined?.();
      unsubscribeLeft?.();
      unsubscribeEmergency?.();
    };
  }, [isConnected, onEvent]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeMessage: SanctuaryMessage = {
      id: 'welcome-1',
      participantId: 'system',
      participantAlias: 'Sanctuary System',
      content: `Welcome to this safe space, ${participant.alias}. This is a judgment-free zone for support and healing. Remember that all conversations are anonymous and confidential.`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    setMessages([welcomeMessage]);
  }, [participant.alias]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    const content = newMessage.trim();
    
    // Send via socket
    sendMessage(content, 'text');
    
    // Add to local state immediately for better UX
    const message: SanctuaryMessage = {
      id: `msg-${Date.now()}-local`,
      participantId: participant.id,
      participantAlias: participant.alias,
      content,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmergencyAlert = () => {
    sendEmergencyAlert('crisis_support', 'Someone in this sanctuary needs immediate support');
    toast({
      title: "Emergency alert sent",
      description: "Crisis support has been notified and will respond shortly",
      variant: "destructive"
    });
  };

  const renderMessage = (message: SanctuaryMessage) => {
    const isOwnMessage = message.participantId === participant.id;
    const isSystemMessage = message.type === 'system' || message.participantId === 'system';
    const isEmergencyMessage = message.type === 'emergency';

    if (isSystemMessage || isEmergencyMessage) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className={`px-4 py-2 rounded-full text-sm ${
            isEmergencyMessage 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-gray-50 text-gray-600 border border-gray-200'
          }`}>
            {isEmergencyMessage && <AlertTriangle className="inline w-4 h-4 mr-1" />}
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className={getAvatarColor(message.participantAlias)}>
            {getInitials(message.participantAlias)}
          </AvatarFallback>
        </Avatar>
        
        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              {message.participantAlias}
              {isOwnMessage && <span className="text-gray-500">(You)</span>}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {onlineParticipants.has(message.participantId) && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
            )}
          </div>
          
          <div className={`px-3 py-2 rounded-lg ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Anonymous Chat
          <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
        <Separator />
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Emergency Alert Button - Always visible for safety */}
        <div className="flex justify-center">
          <Button
            onClick={handleEmergencyAlert}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergency Support
          </Button>
        </div>
        
        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected 
                ? "Share your thoughts anonymously..." 
                : "Connecting to chat..."
            }
            disabled={!isConnected}
            className="flex-1"
            maxLength={500}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || !isConnected}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Character count */}
        {newMessage.length > 400 && (
          <div className="text-xs text-gray-500 text-right">
            {newMessage.length}/500 characters
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FlagshipSanctuaryChat;
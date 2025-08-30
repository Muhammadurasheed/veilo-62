import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Send,
  Smile,
  Heart,
  ThumbsUp,
  Laugh,
  Frown,
  Shield,
  Clock,
  Reply
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';

interface ChatMessage {
  id: string;
  senderAlias: string;
  senderAvatarIndex: number;
  content: string;
  type: 'text' | 'emoji-reaction' | 'system' | 'emergency';
  timestamp: string;
  replyTo?: string;
  reactions: Array<{
    emoji: string;
    senderAlias: string;
    timestamp: string;
  }>;
  isEdited: boolean;
}

interface SanctuaryChatProps {
  sessionId: string;
  socket: any;
  className?: string;
}

const quickReactions = [
  { emoji: '❤️', name: 'heart' },
  { emoji: '👍', name: 'thumbs-up' },
  { emoji: '😊', name: 'smile' },
  { emoji: '😢', name: 'frown' },
  { emoji: '🙏', name: 'pray' },
  { emoji: '💪', name: 'strength' }
];

export const SanctuaryChat: React.FC<SanctuaryChatProps> = ({
  sessionId,
  socket,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    setupSocketListeners();
    
    return () => {
      cleanupSocketListeners();
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/sanctuary-chat/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages.reverse()); // Reverse to show newest at bottom
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.onEvent('new_message', handleNewMessage);
    socket.onEvent('message_reaction', handleMessageReaction);
    socket.onEvent('message_deleted', handleMessageDeleted);
  };

  const cleanupSocketListeners = () => {
    if (!socket) return;
    
    // Socket cleanup is handled by the hook
  };

  const handleNewMessage = (messageData: any) => {
    const message: ChatMessage = {
      id: messageData.id,
      senderAlias: messageData.senderAlias,
      senderAvatarIndex: messageData.senderAvatarIndex,
      content: messageData.content,
      type: messageData.type,
      timestamp: messageData.timestamp,
      replyTo: messageData.replyTo,
      reactions: messageData.reactions || [],
      isEdited: false
    };
    
    setMessages(prev => [...prev, message]);
  };

  const handleMessageReaction = (reactionData: any) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === reactionData.messageId) {
        return { ...msg, reactions: reactionData.reactions };
      }
      return msg;
    }));
  };

  const handleMessageDeleted = (deleteData: any) => {
    setMessages(prev => prev.filter(msg => msg.id !== deleteData.messageId));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/sanctuary-chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'text',
          replyTo
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        setReplyTo(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const sendQuickReaction = async (emoji: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/sanctuary-chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: emoji,
          type: 'emoji-reaction'
        })
      });
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/sanctuary-chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji })
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Sanctuary Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages Area */}
        <div className="h-64 overflow-y-auto px-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading messages...
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.type === 'system' && 'justify-center',
                  message.type === 'emoji-reaction' && 'justify-center'
                )}
              >
                {message.type === 'text' && (
                  <>
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarImage src={`/avatars/avatar-${message.senderAvatarIndex}.svg`} />
                      <AvatarFallback className="text-xs">
                        {message.senderAlias.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.senderAlias}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.isEdited && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            edited
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm break-words">{message.content}</p>
                      
                      {/* Message Reactions */}
                      {message.reactions.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {Object.entries(
                            message.reactions.reduce((acc, reaction) => {
                              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-xs"
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Quick reaction buttons */}
                      <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                        {quickReactions.slice(0, 3).map((reaction) => (
                          <button
                            key={reaction.name}
                            onClick={() => addReaction(message.id, reaction.emoji)}
                            className="text-xs hover:bg-muted rounded p-1"
                          >
                            {reaction.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {message.type === 'emoji-reaction' && (
                  <div className="text-center">
                    <span className="text-2xl">{message.content}</span>
                    <div className="text-xs text-muted-foreground">
                      {message.senderAlias}
                    </div>
                  </div>
                )}
                
                {message.type === 'system' && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {message.content}
                    </Badge>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reactions */}
        <div className="px-4 py-2 border-t">
          <div className="flex gap-2 justify-center">
            {quickReactions.map((reaction) => (
              <Button
                key={reaction.name}
                variant="ghost"
                size="sm"
                onClick={() => sendQuickReaction(reaction.emoji)}
                className="h-8 w-8 p-0 text-lg hover:scale-110 transition-transform"
              >
                {reaction.emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded text-sm">
              <Reply className="h-3 w-3" />
              <span>Replying to message</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="h-5 w-5 p-0 ml-auto"
              >
                ×
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a supportive message..."
              maxLength={1000}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">
              {newMessage.length}/1000
            </span>
            <span className="text-xs text-muted-foreground">
              Press Enter to send
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
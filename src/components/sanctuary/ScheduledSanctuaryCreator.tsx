import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, Shield, Mic, Share2, Link, MessageCircle, Twitter } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

const formSchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters').max(100),
  description: z.string().max(500).optional(),
  emoji: z.string().max(2).optional(),
  scheduledDateTime: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Scheduled time must be in the future'
  }),
  estimatedDuration: z.number().min(15).max(480).default(60),
  maxParticipants: z.number().min(2).max(200).default(50),
  allowEarlyJoin: z.boolean().default(false),
  earlyJoinMinutes: z.number().min(5).max(60).default(15),
  settings: z.object({
    allowAnonymous: z.boolean().default(true),
    moderationEnabled: z.boolean().default(true),
    emergencyContactEnabled: z.boolean().default(true),
    recordingEnabled: z.boolean().default(false),
    voiceModulationEnabled: z.boolean().default(true),
    requireAcknowledgment: z.boolean().default(true)
  }).default({})
});

type ScheduledSanctuaryFormValues = z.infer<typeof formSchema>;

const emojiOptions = ["🎙️", "💭", "❤️", "🫂", "🌟", "🌈", "🤝", "💬", "🧘", "☮️"];

export const ScheduledSanctuaryCreator: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSanctuary, setCreatedSanctuary] = useState<any>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const form = useForm<ScheduledSanctuaryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      description: '',
      emoji: '🎙️',
      scheduledDateTime: '',
      estimatedDuration: 60,
      maxParticipants: 50,
      allowEarlyJoin: false,
      earlyJoinMinutes: 15,
      settings: {
        allowAnonymous: true,
        moderationEnabled: true,
        emergencyContactEnabled: true,
        recordingEnabled: false,
        voiceModulationEnabled: true,
        requireAcknowledgment: true
      }
    }
  });

  const watchAllowEarlyJoin = form.watch('allowEarlyJoin');

  const onSubmit = async (values: ScheduledSanctuaryFormValues) => {
    try {
      setIsSubmitting(true);

      const response = await axios.post('/api/scheduled-sanctuary', values, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        setCreatedSanctuary(response.data.data.sanctuary);
        setShowShareOptions(true);
        
        toast({
          title: 'Scheduled Sanctuary Created!',
          description: 'Your live audio session has been scheduled successfully',
        });
      }
    } catch (error: any) {
      console.error('Failed to create scheduled sanctuary:', error);
      toast({
        title: 'Creation Failed',
        description: error.response?.data?.error || 'Failed to create scheduled sanctuary',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  const shareOnTwitter = () => {
    const url = `${window.location.origin}/sanctuary/scheduled/${createdSanctuary.invitationCode}`;
    const text = `Join me for a live audio sanctuary session: "${createdSanctuary.topic}" scheduled for ${new Date(createdSanctuary.scheduledDateTime).toLocaleString()}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnWhatsApp = () => {
    const url = `${window.location.origin}/sanctuary/scheduled/${createdSanctuary.invitationCode}`;
    const text = `Join me for a live audio sanctuary session: "${createdSanctuary.topic}"\n\nScheduled: ${new Date(createdSanctuary.scheduledDateTime).toLocaleString()}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/sanctuary/scheduled/${createdSanctuary.invitationCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied!',
      description: 'Invitation link has been copied to your clipboard',
    });
  };

  if (showShareOptions && createdSanctuary) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Calendar className="h-5 w-5 text-purple-500" />
            Scheduled Sanctuary Created!
          </CardTitle>
          <CardDescription className="text-center">
            Your live audio session has been scheduled. Share the invitation with participants.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{createdSanctuary.emoji}</span>
              <h3 className="font-medium">{createdSanctuary.topic}</h3>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {new Date(createdSanctuary.scheduledDateTime).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Up to {createdSanctuary.maxParticipants} participants
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration: {createdSanctuary.estimatedDuration} minutes
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {createdSanctuary.settings.voiceModulationEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  Voice Masking
                </Badge>
              )}
              {createdSanctuary.settings.moderationEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  AI Moderated
                </Badge>
              )}
              {createdSanctuary.settings.allowAnonymous && (
                <Badge variant="secondary" className="text-xs">
                  Anonymous
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-center">Share Invitation:</h4>
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                onClick={shareOnWhatsApp} 
                className="flex flex-col gap-1 h-16"
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={shareOnTwitter} 
                className="flex flex-col gap-1 h-16"
              >
                <Twitter className="h-5 w-5 text-blue-500" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={copyToClipboard} 
                className="flex flex-col gap-1 h-16"
              >
                <Link className="h-5 w-5" />
                <span className="text-xs">Copy Link</span>
              </Button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              💡 Participants will see a preview and need to acknowledge before joining. 
              You can start the session up to 15 minutes early.
            </p>
          </div>
        </CardContent>

        <div className="flex justify-between p-6 pt-0">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowShareOptions(false);
              setCreatedSanctuary(null);
              form.reset();
            }}
          >
            Create Another
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/my-sanctuaries')}
            >
              My Sanctuaries
            </Button>
            <Button 
              onClick={() => navigate(`/sanctuary/scheduled/${createdSanctuary.invitationCode}?role=host`)}
            >
              Manage Session
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Schedule Live Audio Sanctuary
        </CardTitle>
        <CardDescription>
          Create a scheduled live audio session with voice masking and AI moderation
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Session Details</h3>
              
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="What will you discuss?" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a supportive topic that brings people together
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide more context about the session..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mood Emoji</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {emojiOptions.map((emoji) => (
                        <Button
                          key={emoji}
                          type="button"
                          variant={field.value === emoji ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => field.onChange(emoji)}
                          className="text-lg"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <h3 className="font-medium">Scheduling</h3>
              
              <FormField
                control={form.control}
                name="scheduledDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={getMinDateTime()}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      When should the live session begin?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration: {field.value} minutes</FormLabel>
                    <FormControl>
                      <Slider
                        min={15}
                        max={480}
                        step={15}
                        value={[field.value]}
                        onValueChange={([value]) => field.onChange(value)}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      How long do you expect the session to last?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowEarlyJoin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Allow Early Join</FormLabel>
                      <FormDescription>
                        Let participants join before the start time
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchAllowEarlyJoin && (
                <FormField
                  control={form.control}
                  name="earlyJoinMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Early Join Window: {field.value} minutes</FormLabel>
                      <FormControl>
                        <Slider
                          min={5}
                          max={60}
                          step={5}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Capacity */}
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Participants: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={2}
                      max={200}
                      step={5}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    How many people can join this session?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="font-medium">Privacy & Safety Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="settings.allowAnonymous"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Anonymous Join</FormLabel>
                        <FormDescription className="text-xs">
                          Allow users without accounts
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.voiceModulationEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Voice Masking</FormLabel>
                        <FormDescription className="text-xs">
                          AI-powered voice changing
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.moderationEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>AI Moderation</FormLabel>
                        <FormDescription className="text-xs">
                          Automatic content monitoring
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.emergencyContactEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Emergency Protocols</FormLabel>
                        <FormDescription className="text-xs">
                          Crisis detection & response
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.recordingEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Recording</FormLabel>
                        <FormDescription className="text-xs">
                          Save session for playback
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.requireAcknowledgment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel>Require Acknowledgment</FormLabel>
                        <FormDescription className="text-xs">
                          Show preview before joining
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/sanctuary')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Creating...' : 'Schedule Sanctuary'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
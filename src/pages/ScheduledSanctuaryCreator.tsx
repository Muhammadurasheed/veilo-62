import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { CalendarIcon, Clock, ChevronLeft, Calendar as CalendarLucide, Users, Shield, AlertTriangle, Share2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SEOHead } from '@/components/seo/SEOHead';

const scheduledSanctuarySchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters').max(100, 'Topic too long'),
  description: z.string().max(500, 'Description too long').optional(),
  emoji: z.string().default('🎙️'),
  scheduledDateTime: z.date().min(new Date(), 'Date must be in the future'),
  estimatedDuration: z.number().min(15).max(480).default(60),
  maxParticipants: z.number().min(2).max(200).default(25),
  allowEarlyJoin: z.boolean().default(false),
  earlyJoinMinutes: z.number().min(5).max(60).default(15),
  moderationEnabled: z.boolean().default(true),
  emergencyContactEnabled: z.boolean().default(true)
});

type ScheduledSanctuaryFormData = z.infer<typeof scheduledSanctuarySchema>;

const emojiOptions = [
  '🎙️', '💬', '🤝', '💙', '🌟', '✨', '🔥', '🚀', 
  '💜', '🌈', '🎯', '💡', '🎨', '🎵', '📢', '🌸'
];

export const ScheduledSanctuaryCreator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ScheduledSanctuaryFormData>({
    resolver: zodResolver(scheduledSanctuarySchema),
    defaultValues: {
      topic: '',
      description: '',
      emoji: '🎙️',
      scheduledDateTime: addDays(new Date(), 1),
      estimatedDuration: 60,
      maxParticipants: 25,
      allowEarlyJoin: false,
      earlyJoinMinutes: 15,
      moderationEnabled: true,
      emergencyContactEnabled: true
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data: ScheduledSanctuaryFormData) => {
    try {
      setIsCreating(true);
      
      console.log('📅 Creating scheduled sanctuary:', data);
      
      // Mock API call - replace with actual implementation
      const response = await fetch('/api/scheduled-sanctuary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          topic: data.topic,
          description: data.description,
          emoji: data.emoji,
          scheduledDateTime: data.scheduledDateTime.toISOString(),
          estimatedDuration: data.estimatedDuration,
          maxParticipants: data.maxParticipants,
          allowEarlyJoin: data.allowEarlyJoin,
          earlyJoinMinutes: data.earlyJoinMinutes,
          settings: {
            moderationEnabled: data.moderationEnabled,
            emergencyContactEnabled: data.emergencyContactEnabled
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const session = result.data.session || result.data;
        
        // Generate invite link
        const link = `${window.location.origin}/sanctuary/join/${session.invitationCode}`;
        setInviteLink(link);
        
        toast({
          title: 'Sanctuary Scheduled! 🎉',
          description: 'Your session has been scheduled successfully.',
        });
      } else {
        throw new Error(result.error || 'Failed to create scheduled sanctuary');
      }
    } catch (error: any) {
      console.error('❌ Create scheduled sanctuary error:', error);
      toast({
        title: 'Scheduling Failed',
        description: error.message || 'Unable to schedule sanctuary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link Copied!',
        description: 'Invitation link copied to clipboard'
      });
    }
  };

  const setTimeQuickly = (hours: number, minutes: number = 0) => {
    const newDate = setMinutes(setHours(watchedValues.scheduledDateTime, hours), minutes);
    setValue('scheduledDateTime', newDate);
  };

  if (inviteLink) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-background via-blue-500/5 to-purple-500/5">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <CalendarLucide className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Sanctuary Scheduled!</h1>
                <p className="text-xl text-muted-foreground">Your session is ready. Share the invitation link below.</p>
              </div>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{watchedValues.emoji}</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{watchedValues.topic}</h3>
                      <p className="text-muted-foreground">
                        {format(watchedValues.scheduledDateTime, 'MMMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg mb-4">
                    <Label className="text-sm font-medium">Invitation Link</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInviteLink}
                        className="flex-shrink-0"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => navigate('/my-sanctuaries')}
                    >
                      View My Sanctuaries
                    </Button>
                    <Button 
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                      onClick={() => window.location.reload()}
                    >
                      Schedule Another
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground">
                <p>Participants will see a "Do you want to join this session?" screen when they click the link.</p>
                <p>Early access will be available {watchedValues.earlyJoinMinutes} minutes before the start time.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead 
        title="Schedule Live Audio Sanctuary"
        description="Plan a future anonymous audio support session with invitation links and countdown timers."
        keywords="schedule sanctuary, planned audio session, anonymous support"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-blue-500/5 to-purple-500/5">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/sanctuary')}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Sanctuaries
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-full">
                <CalendarLucide className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Schedule Sanctuary</h1>
                <p className="text-muted-foreground">Plan ahead with invitation links and countdown</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarLucide className="h-5 w-5 text-blue-500" />
                    Sanctuary Details
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Topic */}
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic *</Label>
                      <Input
                        id="topic"
                        placeholder="What's your sanctuary about? (e.g., Breaking addiction habits)"
                        {...register('topic')}
                        className={errors.topic ? 'border-destructive' : ''}
                      />
                      {errors.topic && (
                        <p className="text-sm text-destructive">{errors.topic.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="Provide more context about your sanctuary session..."
                        {...register('description')}
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Emoji Selection */}
                    <div className="space-y-3">
                      <Label>Choose Emoji</Label>
                      <div className="grid grid-cols-8 gap-2">
                        {emojiOptions.map((emoji) => (
                          <Button
                            key={emoji}
                            type="button"
                            variant={watchedValues.emoji === emoji ? 'default' : 'outline'}
                            size="sm"
                            className="aspect-square p-0"
                            onClick={() => setValue('emoji', emoji)}
                          >
                            <span className="text-lg">{emoji}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Date & Time Scheduling */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !watchedValues.scheduledDateTime && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {watchedValues.scheduledDateTime ? (
                                format(watchedValues.scheduledDateTime, 'MMMM d, yyyy')
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={watchedValues.scheduledDateTime}
                              onSelect={(date) => {
                                if (date) {
                                  setValue('scheduledDateTime', date);
                                  setCalendarOpen(false);
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Time</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={watchedValues.scheduledDateTime.getHours().toString()}
                            onValueChange={(value) => setTimeQuickly(parseInt(value), watchedValues.scheduledDateTime.getMinutes())}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={watchedValues.scheduledDateTime.getMinutes().toString()}
                            onValueChange={(value) => setTimeQuickly(watchedValues.scheduledDateTime.getHours(), parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 15, 30, 45].map((minute) => (
                                <SelectItem key={minute} value={minute.toString()}>
                                  {minute.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Estimated Duration</Label>
                        <Badge variant="outline">{watchedValues.estimatedDuration} minutes</Badge>
                      </div>
                      <Slider
                        value={[watchedValues.estimatedDuration]}
                        onValueChange={(value) => setValue('estimatedDuration', value[0])}
                        min={15}
                        max={480}
                        step={15}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>15 min</span>
                        <span>8 hours</span>
                      </div>
                    </div>

                    {/* Max Participants */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Max Participants</Label>
                        <Badge variant="outline">{watchedValues.maxParticipants} people</Badge>
                      </div>
                      <Slider
                        value={[watchedValues.maxParticipants]}
                        onValueChange={(value) => setValue('maxParticipants', value[0])}
                        min={2}
                        max={200}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Early Join Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Allow Early Join</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Let participants join before start time</p>
                        </div>
                        <Switch
                          checked={watchedValues.allowEarlyJoin}
                          onCheckedChange={(checked) => setValue('allowEarlyJoin', checked)}
                        />
                      </div>

                      {watchedValues.allowEarlyJoin && (
                        <div className="space-y-3 ml-4">
                          <div className="flex items-center justify-between">
                            <Label>Early Join Window</Label>
                            <Badge variant="outline">{watchedValues.earlyJoinMinutes} minutes before</Badge>
                          </div>
                          <Slider
                            value={[watchedValues.earlyJoinMinutes]}
                            onValueChange={(value) => setValue('earlyJoinMinutes', value[0])}
                            min={5}
                            max={60}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>

                    {/* Safety Settings */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Safety Settings</Label>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" />
                            <span className="font-medium">AI Moderation</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Filter harmful content automatically</p>
                        </div>
                        <Switch
                          checked={watchedValues.moderationEnabled}
                          onCheckedChange={(checked) => setValue('moderationEnabled', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">Emergency Protocols</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Enable crisis detection and response</p>
                        </div>
                        <Switch
                          checked={watchedValues.emergencyContactEnabled}
                          onCheckedChange={(checked) => setValue('emergencyContactEnabled', checked)}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      size="lg"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Scheduling Sanctuary...
                        </div>
                      ) : (
                        <>
                          <CalendarLucide className="h-4 w-4 mr-2" />
                          Schedule Sanctuary
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Preview Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{watchedValues.emoji}</span>
                    <div>
                      <h3 className="font-semibold">{watchedValues.topic || 'Your Topic Here'}</h3>
                      <p className="text-sm text-muted-foreground">Scheduled Session</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Date & Time</span>
                      <Badge variant="secondary">
                        {format(watchedValues.scheduledDateTime, 'MMM d, h:mm a')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <Badge variant="secondary">{watchedValues.estimatedDuration}m</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max Participants</span>
                      <Badge variant="secondary">{watchedValues.maxParticipants}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Early Join</span>
                      <Badge variant={watchedValues.allowEarlyJoin ? 'default' : 'secondary'}>
                        {watchedValues.allowEarlyJoin ? `${watchedValues.earlyJoinMinutes}m` : 'Off'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What Happens Next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Invitation Created</p>
                      <p className="text-xs text-muted-foreground">Get a shareable link for participants</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Countdown Begins</p>
                      <p className="text-xs text-muted-foreground">Participants see waiting screen before start</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Session Goes Live</p>
                      <p className="text-xs text-muted-foreground">Automatic transition to live audio space</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
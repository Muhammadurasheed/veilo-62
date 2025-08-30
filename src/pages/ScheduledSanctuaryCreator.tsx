
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
import { CalendarIcon, Clock, ChevronLeft, Calendar as CalendarLucide, Users, Shield, AlertTriangle, Copy, Check } from 'lucide-react';
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
        const sanctuary = result.data.sanctuary || result.data;
        
        const link = `${window.location.origin}/sanctuary/join/${sanctuary.invitationCode}`;
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

  if (inviteLink) {
    return (
      <Layout>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-8">
                <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <CalendarLucide className="h-12 w-12 text-primary-foreground" />
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
                      className="flex-1"
                      onClick={() => window.location.reload()}
                    >
                      Schedule Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
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

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
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
              <div className="bg-primary p-3 rounded-full">
                <CalendarLucide className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Schedule Sanctuary</h1>
                <p className="text-muted-foreground">Plan ahead with invitation links and countdown</p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarLucide className="h-5 w-5 text-primary" />
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
                      placeholder="What's your sanctuary about?"
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

                  {/* Date & Time - Fixed Implementation */}
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
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Time</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={watchedValues.scheduledDateTime.getHours().toString()}
                          onValueChange={(value) => {
                            const newDate = setHours(watchedValues.scheduledDateTime, parseInt(value));
                            setValue('scheduledDateTime', newDate);
                          }}
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
                          onValueChange={(value) => {
                            const newDate = setMinutes(watchedValues.scheduledDateTime, parseInt(value));
                            setValue('scheduledDateTime', newDate);
                          }}
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
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
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
        </div>
      </div>
    </Layout>
  );
};

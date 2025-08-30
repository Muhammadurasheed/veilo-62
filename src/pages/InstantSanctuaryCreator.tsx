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
import { useToast } from '@/hooks/use-toast';
import { LiveSanctuaryApi } from '@/services/api';
import { 
  ChevronLeft, 
  Zap, 
  Users, 
  Shield, 
  MessageSquare,
  Volume2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';

const instantSanctuarySchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters').max(100, 'Topic too long'),
  description: z.string().max(500, 'Description too long').optional(),
  emoji: z.string().default('🎙️'),
  maxParticipants: z.number().min(2).max(50).default(25),
  expireHours: z.number().min(1).max(24).default(4),
  moderationEnabled: z.boolean().default(true),
  emergencyContactEnabled: z.boolean().default(true),
  allowAnonymous: z.boolean().default(true)
});

type InstantSanctuaryFormData = z.infer<typeof instantSanctuarySchema>;

const emojiOptions = [
  '🎙️', '💬', '🤝', '💙', '🌟', '✨', '🔥', '🚀', 
  '💜', '🌈', '🎯', '💡', '🎨', '🎵', '📢', '🌸'
];

export const InstantSanctuaryCreator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<InstantSanctuaryFormData>({
    resolver: zodResolver(instantSanctuarySchema),
    defaultValues: {
      topic: '',
      description: '',
      emoji: '🎙️',
      maxParticipants: 25,
      expireHours: 4,
      moderationEnabled: true,
      emergencyContactEnabled: true,
      allowAnonymous: true
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data: InstantSanctuaryFormData) => {
    try {
      setIsCreating(true);
      
      console.log('🎙️ Creating instant sanctuary:', data);
      
      const response = await LiveSanctuaryApi.createSession({
        topic: data.topic,
        description: data.description || '',
        emoji: data.emoji,
        maxParticipants: data.maxParticipants,
        expireHours: data.expireHours,
        audioOnly: true,
        allowAnonymous: data.allowAnonymous,
        moderationEnabled: data.moderationEnabled,
        emergencyContactEnabled: data.emergencyContactEnabled
      });

      if (response.success && response.data) {
        const session = response.data.session || response.data;
        
        toast({
          title: 'Sanctuary Created! 🎉',
          description: 'Your live audio sanctuary is ready. Redirecting...',
        });

        // Navigate to the live session
        setTimeout(() => {
          navigate(`/sanctuary/live/${session.id}`);
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to create sanctuary');
      }
    } catch (error: any) {
      console.error('❌ Create sanctuary error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Unable to create sanctuary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <SEOHead 
        title="Create Instant Live Audio Sanctuary"
        description="Start an immediate anonymous audio support session with voice masking and AI moderation."
        keywords="create sanctuary, instant audio session, anonymous support"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-orange-500/5 to-red-500/5">
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
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-full">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Create Instant Sanctuary</h1>
                <p className="text-muted-foreground">Start immediately with live audio support</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-orange-500" />
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
                      {errors.description && (
                        <p className="text-sm text-destructive">{errors.description.message}</p>
                      )}
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
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>2 people</span>
                        <span>50 people</span>
                      </div>
                    </div>

                    {/* Session Duration */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Session Duration</Label>
                        <Badge variant="outline">{watchedValues.expireHours} hours</Badge>
                      </div>
                      <Slider
                        value={[watchedValues.expireHours]}
                        onValueChange={(value) => setValue('expireHours', value[0])}
                        min={1}
                        max={24}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 hour</span>
                        <span>24 hours</span>
                      </div>
                    </div>

                    {/* Settings */}
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

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Anonymous Access</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Allow guests without accounts to join</p>
                        </div>
                        <Switch
                          checked={watchedValues.allowAnonymous}
                          onCheckedChange={(checked) => setValue('allowAnonymous', checked)}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      size="lg"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating Sanctuary...
                        </div>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Create Instant Sanctuary
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
                      <p className="text-sm text-muted-foreground">Instant Session</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max Participants</span>
                      <Badge variant="secondary">{watchedValues.maxParticipants}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <Badge variant="secondary">{watchedValues.expireHours}h</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">AI Moderation</span>
                      <Badge variant={watchedValues.moderationEnabled ? 'default' : 'secondary'}>
                        {watchedValues.moderationEnabled ? 'On' : 'Off'}
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
                      <p className="text-sm font-medium">Session Goes Live</p>
                      <p className="text-xs text-muted-foreground">Your sanctuary starts immediately</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Choose Your Voice</p>
                      <p className="text-xs text-muted-foreground">Select from 8 AI voice options</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Invite Participants</p>
                      <p className="text-xs text-muted-foreground">Share your session link with others</p>
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
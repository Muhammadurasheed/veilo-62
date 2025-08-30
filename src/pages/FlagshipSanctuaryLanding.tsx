import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Calendar, 
  Users, 
  Shield, 
  Zap,
  Clock,
  HeadphonesIcon,
  MessageSquare,
  Lock,
  Share2,
  ChevronRight,
  Sparkles,
  Volume2
} from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';

export const FlagshipSanctuaryLanding: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'instant' | 'scheduled' | null>(null);

  const handleCreateInstant = () => {
    navigate('/sanctuary/create/instant');
  };

  const handleCreateScheduled = () => {
    navigate('/sanctuary/create/scheduled');
  };

  const features = [
    {
      icon: Volume2,
      title: "Voice Masking",
      description: "8 professional AI voices to protect your identity",
      color: "text-purple-500"
    },
    {
      icon: Shield,
      title: "AI Moderation",
      description: "Real-time content filtering and emergency protocols",
      color: "text-blue-500"
    },
    {
      icon: Users,
      title: "50+ Participants",
      description: "Host large group sessions with seamless audio",
      color: "text-green-500"
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Synchronized messaging with audio sessions",
      color: "text-orange-500"
    }
  ];

  return (
    <Layout>
      <SEOHead 
        title="Anonymous Live Audio Sanctuary - Safe Support Sessions"
        description="Join anonymous live audio sessions with voice masking, AI moderation, and real-time chat. Create instant or scheduled support sanctuaries."
        keywords="anonymous audio, voice masking, support groups, live sessions, mental health"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <div className="relative bg-primary/10 p-6 rounded-full">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Anonymous Live Audio Sanctuary
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Create safe spaces for authentic conversations. Advanced voice masking, AI moderation, 
              and real-time chat make every session secure and supportive.
            </p>

            <div className="flex items-center justify-center gap-2 mb-8">
              <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                <Sparkles className="h-3 w-3 mr-1" />
                Flagship Feature
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">
                FAANG-Level Engineering
              </Badge>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {features.map((feature, index) => (
                <Card key={index} className="border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <feature.icon className={`h-8 w-8 mx-auto mb-3 ${feature.color}`} />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Instant Sanctuary */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                selectedType === 'instant' 
                  ? 'border-primary shadow-lg shadow-primary/25' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedType('instant')}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-full">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">Instant Sanctuary</CardTitle>
                <p className="text-muted-foreground">Start immediately with anonymous audio support</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <HeadphonesIcon className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Voice Modulation</span>
                  </div>
                  <Badge variant="secondary">8 AI Voices</Badge>
                </div>
                
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Up to 50 participants</span>
                  </div>
                  <Badge variant="secondary">Live</Badge>
                </div>
                
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Anonymous Access</span>
                  </div>
                  <Badge variant="secondary">Secure</Badge>
                </div>

                <Button 
                  onClick={handleCreateInstant}
                  className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  size="lg"
                >
                  Start Instant Session
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Scheduled Sanctuary */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                selectedType === 'scheduled' 
                  ? 'border-primary shadow-lg shadow-primary/25' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedType('scheduled')}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-full">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">Scheduled Sanctuary</CardTitle>
                <p className="text-muted-foreground">Plan ahead with invitation links and countdown</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Future Scheduling</span>
                  </div>
                  <Badge variant="secondary">Date & Time</Badge>
                </div>
                
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Share2 className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Invitation Links</span>
                  </div>
                  <Badge variant="secondary">Shareable</Badge>
                </div>
                
                <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Pre-session Approval</span>
                  </div>
                  <Badge variant="secondary">Controlled</Badge>
                </div>

                <Button 
                  onClick={handleCreateScheduled}
                  className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  size="lg"
                >
                  Schedule Session
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* How it Works */}
          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold">Create Your Session</h3>
                <p className="text-muted-foreground">Choose instant or scheduled, set your topic and preferences</p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold">Invite Participants</h3>
                <p className="text-muted-foreground">Share invitation links or let people join directly</p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold">Connect Safely</h3>
                <p className="text-muted-foreground">Use voice masking and AI moderation for secure conversations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
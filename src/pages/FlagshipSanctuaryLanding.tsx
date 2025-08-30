
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Calendar, Users, Shield, Mic, Clock, ArrowRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';

export const FlagshipSanctuaryLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <SEOHead 
        title="Anonymous Audio Sanctuary"
        description="Create safe spaces for anonymous support conversations with voice masking and real-time moderation."
        keywords="anonymous support, voice chat, mental health, safe space"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Anonymous Audio Sanctuary
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create safe spaces for authentic conversations with complete anonymity, voice masking, and AI-powered moderation.
            </p>
          </div>

          {/* Creation Options */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Instant Sanctuary */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                  <Zap className="h-3 w-3 mr-1" />
                  Instant
                </Badge>
              </div>
              
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <Users className="h-6 w-6 text-primary mr-3" />
                  Start Now
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Create an immediate sanctuary for urgent support or spontaneous conversations. Perfect when you need to talk right now.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 text-green-600 mr-2" />
                    <span>AI-powered safety monitoring</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mic className="h-4 w-4 text-blue-600 mr-2" />
                    <span>Voice masking with 8 AI voices</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 text-purple-600 mr-2" />
                    <span>Up to 50 participants</span>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => navigate('/sanctuary/create/instant')}
                >
                  Create Instant Sanctuary
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Scheduled Sanctuary */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Calendar className="h-3 w-3 mr-1" />
                  Planned
                </Badge>
              </div>
              
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <Calendar className="h-6 w-6 text-primary mr-3" />
                  Schedule Session
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Plan ahead with scheduled sessions. Send invitations and build anticipation for your support community.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 text-orange-600 mr-2" />
                    <span>Countdown & reminder system</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 text-green-600 mr-2" />
                    <span>Pre-session acknowledgment</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 text-purple-600 mr-2" />
                    <span>Invitation links & early join</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => navigate('/sanctuary/create/scheduled')}
                >
                  Schedule Sanctuary
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-8 text-foreground">Built for Safety & Privacy</h2>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">AI Moderation</h3>
                <p className="text-sm text-muted-foreground">Real-time content filtering with emergency response protocols</p>
              </div>
              
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <Mic className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Voice Masking</h3>
                <p className="text-sm text-muted-foreground">Complete anonymity with ElevenLabs AI voice transformation</p>
              </div>
              
              <div className="text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-3">Safe Community</h3>
                <p className="text-sm text-muted-foreground">Supportive environment with trained moderators and crisis support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

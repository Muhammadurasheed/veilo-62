
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import CreateSanctuary from '@/components/sanctuary/CreateSanctuary';
import SanctuarySpace from '@/components/sanctuary/SanctuarySpace';
import { ScheduledSanctuaryCreator } from '@/components/sanctuary/ScheduledSanctuaryCreator';
import { Calendar, Users, Zap } from 'lucide-react';

const Sanctuary = () => {
  const { id, role } = useParams<{ id?: string; role?: string }>();
  
  // If no ID, show creation options
  if (!id) {
    return (
      <Layout>
        <div className="container px-4 pt-6 mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Create Your Sanctuary</h1>
            <p className="text-muted-foreground">Choose how you want to host your anonymous support session</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Instant Sanctuary */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Users className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Instant Sanctuary</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Start an immediate anonymous audio session. Perfect for urgent support needs or spontaneous group conversations.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <div>✓ Immediate start</div>
                  <div>✓ Voice modulation available</div>
                  <div>✓ Up to 50 participants</div>
                  <div>✓ Real-time chat</div>
                </div>
                <CreateSanctuary />
              </CardContent>
            </Card>

            {/* Scheduled Sanctuary */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Calendar className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-xl font-semibold">Scheduled Sanctuary</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Plan ahead with scheduled sessions. Send invitations and build anticipation for your support community.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <div>✓ Schedule for future dates</div>
                  <div>✓ Invitation system</div>
                  <div>✓ Pre-session acknowledgment</div>
                  <div>✓ All instant features included</div>
                </div>
                <ScheduledSanctuaryCreator />
              </CardContent>
            </Card>
          </div>

          {/* Features Banner */}
          <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary mr-3" />
                <h3 className="text-xl font-semibold">Flagship Features</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <h4 className="font-medium mb-2">Voice Modulation</h4>
                  <p className="text-sm text-muted-foreground">8 AI voices with ElevenLabs integration for complete anonymity</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Emergency Protocols</h4>
                  <p className="text-sm text-muted-foreground">Built-in crisis detection and emergency response systems</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Safe & Secure</h4>
                  <p className="text-sm text-muted-foreground">End-to-end encryption with AI-powered content moderation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  // If ID exists, show the sanctuary space
  return (
    <Layout hideSidebar={true}>
      <div className="container px-4 pt-6 mx-auto">
        <SanctuarySpace isHost={role === 'host'} />
      </div>
    </Layout>
  );
};

export default Sanctuary;

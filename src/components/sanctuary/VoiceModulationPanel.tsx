import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';

interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  description: string;
}

interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

interface VoiceModulationPanelProps {
  sessionId: string;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VoiceModulationPanel: React.FC<VoiceModulationPanelProps> = ({
  sessionId,
  isEnabled,
  onToggle
}) => {
  const { toast } = useToast();
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarityBoost: 0.5,
    style: 0,
    useSpeakerBoost: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'healthy' | 'disabled' | 'error'>('disabled');
  const [currentModulation, setCurrentModulation] = useState<any>(null);

  // Load available voices and current modulation on mount
  useEffect(() => {
    loadVoicesAndStatus();
    loadCurrentModulation();
  }, [sessionId]);

  const loadVoicesAndStatus = async () => {
    try {
      const response = await axios.get('/api/voice-modulation/voices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success) {
        setAvailableVoices(response.data.data.voices);
        setServiceStatus(response.data.data.serviceStatus.status === 'healthy' ? 'healthy' : 
                        response.data.data.isEnabled ? 'error' : 'disabled');
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setServiceStatus('error');
      toast({
        title: 'Voice Loading Failed',
        description: 'Could not load available voices',
        variant: 'destructive'
      });
    }
  };

  const loadCurrentModulation = async () => {
    try {
      const response = await axios.get(`/api/voice-modulation/sessions/${sessionId}/modulation`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.data.success && response.data.data.modulation) {
        const modulation = response.data.data.modulation;
        setCurrentModulation(modulation);
        
        // Find and select the voice
        const voice = availableVoices.find(v => v.id === modulation.voiceId);
        if (voice) {
          setSelectedVoice(voice);
        }
        
        // Update settings
        setVoiceSettings(modulation.settings);
        onToggle(modulation.isActive);
      }
    } catch (error) {
      console.error('Failed to load current modulation:', error);
    }
  };

  const handleVoiceSelect = async (voice: VoiceOption) => {
    if (!isEnabled) {
      setSelectedVoice(voice);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `/api/voice-modulation/sessions/${sessionId}/modulation`,
        {
          voiceId: voice.id,
          settings: voiceSettings
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      );

      if (response.data.success) {
        setSelectedVoice(voice);
        setCurrentModulation(response.data.data.modulation);
        
        toast({
          title: 'Voice Applied',
          description: `Now using ${voice.name} - ${voice.description}`,
        });
      }
    } catch (error: any) {
      console.error('Failed to apply voice:', error);
      toast({
        title: 'Voice Setup Failed',
        description: error.response?.data?.error || 'Could not apply voice modulation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsChange = async (newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...voiceSettings, ...newSettings };
    setVoiceSettings(updatedSettings);

    if (isEnabled && selectedVoice) {
      try {
        await axios.post(
          `/api/voice-modulation/sessions/${sessionId}/modulation`,
          {
            voiceId: selectedVoice.id,
            settings: updatedSettings
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          }
        );
      } catch (error) {
        console.error('Failed to update voice settings:', error);
      }
    }
  };

  const handleToggleModulation = async () => {
    if (!isEnabled && !selectedVoice) {
      toast({
        title: 'Select a Voice',
        description: 'Please select a voice before enabling modulation',
        variant: 'destructive'
      });
      return;
    }

    if (isEnabled) {
      // Disable modulation
      try {
        await axios.delete(`/api/voice-modulation/sessions/${sessionId}/modulation`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        onToggle(false);
        toast({
          title: 'Voice Modulation Disabled',
          description: 'Using your natural voice',
        });
      } catch (error) {
        console.error('Failed to disable modulation:', error);
        toast({
          title: 'Error',
          description: 'Could not disable voice modulation',
          variant: 'destructive'
        });
      }
    } else {
      // Enable modulation
      if (selectedVoice) {
        await handleVoiceSelect(selectedVoice);
        onToggle(true);
      }
    }
  };

  if (serviceStatus === 'disabled') {
    return (
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            Voice Modulation Unavailable
          </CardTitle>
          <CardDescription>
            Voice modulation service is not configured. Contact support for setup.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (serviceStatus === 'error') {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Voice Service Error
          </CardTitle>
          <CardDescription>
            Voice modulation service is experiencing issues. Trying fallback...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={loadVoicesAndStatus}
            className="w-full"
          >
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Voice Modulation
            </CardTitle>
            <CardDescription>
              Mask your identity with AI-powered voice changing
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleModulation}
              disabled={isLoading}
            />
            {isEnabled && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div>
          <h4 className="font-medium mb-3">Select Voice Character</h4>
          <div className="grid grid-cols-2 gap-2">
            {availableVoices.map((voice) => (
              <Button
                key={voice.id}
                variant={selectedVoice?.id === voice.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVoiceSelect(voice)}
                disabled={isLoading}
                className="flex flex-col h-auto p-3 text-left"
              >
                <div className="font-medium">{voice.name}</div>
                <div className="text-xs opacity-70">{voice.description}</div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {voice.gender}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Voice Settings */}
        {selectedVoice && (
          <div className="space-y-4">
            <h4 className="font-medium">Voice Settings</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Stability: {voiceSettings.stability.toFixed(2)}</label>
                <p className="text-xs text-gray-500 mb-2">Lower = more expressive, Higher = more stable</p>
                <Slider
                  value={[voiceSettings.stability]}
                  onValueChange={([value]) => handleSettingsChange({ stability: value })}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Similarity Boost: {voiceSettings.similarityBoost.toFixed(2)}</label>
                <p className="text-xs text-gray-500 mb-2">How closely to match the selected voice</p>
                <Slider
                  value={[voiceSettings.similarityBoost]}
                  onValueChange={([value]) => handleSettingsChange({ similarityBoost: value })}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Style: {voiceSettings.style.toFixed(2)}</label>
                <p className="text-xs text-gray-500 mb-2">Speaking style variation</p>
                <Slider
                  value={[voiceSettings.style]}
                  onValueChange={([value]) => handleSettingsChange({ style: value })}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Speaker Boost</label>
                  <p className="text-xs text-gray-500">Enhance voice clarity</p>
                </div>
                <Switch
                  checked={voiceSettings.useSpeakerBoost}
                  onCheckedChange={(checked) => handleSettingsChange({ useSpeakerBoost: checked })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        {currentModulation && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Active: {currentModulation.voiceName}
              </span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Your voice is being modulated in real-time
            </p>
          </div>
        )}

        {/* Warning */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            ⚠️ Voice modulation uses AI processing which may add slight delay. 
            If experiencing issues, disable modulation to use your natural voice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
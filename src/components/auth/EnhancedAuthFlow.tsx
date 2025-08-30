import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  UserCheck, 
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';
import { cn } from '@/lib/utils';

interface EnhancedAuthFlowProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess?: () => void;
}

export const EnhancedAuthFlow: React.FC<EnhancedAuthFlowProps> = ({
  mode,
  onModeChange,
  onSuccess
}) => {
  const { login, register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    realName: '',
    preferredAlias: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'input' | 'privacy' | 'success'>('input');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Registration specific validation
    if (mode === 'register') {
      if (!formData.realName) {
        newErrors.realName = 'Your real name is required';
      } else if (formData.realName.length < 2) {
        newErrors.realName = 'Name must be at least 2 characters';
      }

      // Platform alias is completely optional - only validate if provided
      if (formData.preferredAlias && formData.preferredAlias.trim() && formData.preferredAlias.length < 2) {
        newErrors.preferredAlias = 'Alias must be at least 2 characters if provided';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let success = false;
      
      if (mode === 'login') {
        success = await login({
          email: formData.email,
          password: formData.password
        });
      } else {
        success = await register({
          email: formData.email,
          password: formData.password,
          alias: formData.preferredAlias
        });
      }

      if (success) {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
        }, 1500); // Reduced delay for better UX
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (step === 'success') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome to Veilo! 🕊️</h2>
          <p className="text-muted-foreground mb-4">
            {mode === 'register' 
              ? 'Your secure account has been created. You now have a persistent identity with complete platform anonymity.'
              : 'Successfully logged in! Welcome back to your sanctuary.'
            }
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Shield className="h-4 w-4" />
              <span>Shadow identity active</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <UserCheck className="h-4 w-4" />
              <span>Platform anonymity maintained</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'privacy' && mode === 'register') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Shadow Identity System
          </CardTitle>
          <CardDescription>
            Understand how Veilo protects your privacy while giving you a persistent identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex gap-4 p-4 border rounded-lg">
              <Lock className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold">Your Real Identity</h3>
                <p className="text-sm text-muted-foreground">
                  Stored securely and encrypted. Only you know your real identity. 
                  Used for account recovery and security.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 border rounded-lg">
              <User className="h-6 w-6 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold">Your Shadow Identity</h3>
                <p className="text-sm text-muted-foreground">
                  Your anonymous platform presence. All activities, posts, and 
                  interactions use this identity to protect your privacy.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 p-4 border rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-500 mt-1" />
              <div>
                <h3 className="font-semibold">Persistent Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track all your activities, sessions, and connections while 
                  maintaining complete anonymity on the platform.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Benefits:</strong> You can always recover your account and access 
              your activity history, while other users only see your anonymous shadow identity. 
              Your real information is never shared publicly.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('input')}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('input')}
              className="flex-1"
            >
              I Understand, Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === 'login' 
            ? 'Sign in to access your sanctuary dashboard'
            : 'Join Veilo with complete privacy protection'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@example.com"
              className={cn(errors.email && 'border-destructive')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Real Name (Register only) */}
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="realName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Real Name
                <Badge variant="secondary" className="text-xs">Private</Badge>
              </Label>
              <Input
                id="realName"
                type="text"
                value={formData.realName}
                onChange={(e) => handleInputChange('realName', e.target.value)}
                placeholder="John Doe"
                className={cn(errors.realName && 'border-destructive')}
              />
              {errors.realName && (
                <p className="text-sm text-destructive">{errors.realName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Only stored securely for account recovery. Never shared publicly.
              </p>
            </div>
          )}

          {/* Preferred Alias (Register only) */}
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="preferredAlias" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Platform Alias
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </Label>
              <Input
                id="preferredAlias"
                type="text"
                value={formData.preferredAlias}
                onChange={(e) => handleInputChange('preferredAlias', e.target.value)}
                placeholder="Leave empty for random alias"
                className={cn(errors.preferredAlias && 'border-destructive')}
              />
              {errors.preferredAlias && (
                <p className="text-sm text-destructive">{errors.preferredAlias}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your anonymous identity on the platform. Can be changed anytime.
              </p>
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                className={cn(errors.password && 'border-destructive')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>


          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <Separator className="my-6" />

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            className="text-sm"
          >
            {mode === 'login' 
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"
            }
          </Button>
        </div>

        {mode === 'register' && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong>Privacy First:</strong> Your real identity remains completely private. 
                All platform interactions use your anonymous shadow identity.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
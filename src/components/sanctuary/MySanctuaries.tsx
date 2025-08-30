import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  MessageCircle, 
  Clock, 
  ExternalLink, 
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Copy,
  Calendar,
  Users,
  Archive,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SanctuaryApi, LiveSanctuaryApi } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface StoredSanctuary {
  id: string;
  topic: string;
  description?: string;
  emoji?: string;
  mode: 'anon-inbox' | 'live-audio';
  createdAt: string;
  expiresAt: string;
  hostToken: string;
  isActive: boolean;
  lastAccessed?: string;
  submissionCount?: number;
}

const MySanctuaries = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sanctuaries, setSanctuaries] = useState<StoredSanctuary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Load sanctuaries from localStorage and validate with backend
  const loadSanctuaries = async () => {
    try {
      setIsLoading(true);
      const storedSanctuaries: StoredSanctuary[] = [];
      const now = new Date();
      
      // Iterate all keys once and handle both anon-inbox and live-audio
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const isAnonKey = key.startsWith('sanctuary-host-') && !key.endsWith('-expires');
        const isLiveKey = key.startsWith('live-sanctuary-host-') && !key.endsWith('-expires');
        if (!isAnonKey && !isLiveKey) continue;
        
        const sanctuaryId = key.replace(isLiveKey ? 'live-sanctuary-host-' : 'sanctuary-host-', '');
        const hostToken = localStorage.getItem(key) as string | null;
        const expiryKey = `${key}-expires`;
        const expiryTime = localStorage.getItem(expiryKey);
        
        if (!hostToken || !expiryTime) continue;
        const expiryDate = new Date(expiryTime);
        
        // Clean up expired tokens
        if (now > expiryDate) {
          localStorage.removeItem(key);
          localStorage.removeItem(expiryKey);
          continue;
        }
        
        try {
          if (isAnonKey) {
            // Validate anonymous inbox sanctuary
            const response = await SanctuaryApi.getSession(sanctuaryId);
            if (response.success && response.data) {
              storedSanctuaries.push({
                id: sanctuaryId,
                topic: response.data.session.topic || 'Untitled Sanctuary',
                description: response.data.session.description,
                emoji: response.data.session.emoji,
                mode: response.data.session.mode || 'anon-inbox',
                createdAt: response.data.session.createdAt,
                expiresAt: response.data.session.expiresAt,
                hostToken,
                isActive: new Date(response.data.session.expiresAt) > now,
                submissionCount: response.data.submissions?.length || 0,
                lastAccessed: localStorage.getItem(`sanctuary-last-accessed-${sanctuaryId}`) || undefined,
              });
            }
          } else if (isLiveKey) {
            // Validate live audio sanctuary
            const response = await LiveSanctuaryApi.getSession(sanctuaryId);
            if (response.success && response.data) {
              const s = response.data.session || response.data;
              storedSanctuaries.push({
                id: sanctuaryId,
                topic: s.topic || 'Live Sanctuary',
                description: s.description,
                emoji: s.emoji,
                mode: 'live-audio',
                createdAt: s.createdAt || s.expiresAt, // fallback
                expiresAt: s.expiresAt,
                hostToken,
                isActive: new Date(s.expiresAt) > now,
                submissionCount: s.currentParticipants || 0,
                lastAccessed: localStorage.getItem(`sanctuary-last-accessed-${sanctuaryId}`) || undefined,
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to validate sanctuary ${sanctuaryId}:`, error);
        }
      }
      
      // Sort by creation date (newest first)
      storedSanctuaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSanctuaries(storedSanctuaries);
      
    } catch (error) {
      console.error('Failed to load sanctuaries:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Load Sanctuaries',
        description: 'Could not load your sanctuary list. Please refresh the page.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSanctuaries();
  }, []);

  const handleViewInbox = (sanctuary: StoredSanctuary) => {
    // Update last accessed time
    localStorage.setItem(`sanctuary-last-accessed-${sanctuary.id}`, new Date().toISOString());
    navigate(`/sanctuary/inbox/${sanctuary.id}`);
  };

  const handleCopyShareLink = (sanctuaryId: string) => {
    const shareUrl = `${window.location.origin}/sanctuary/submit/${sanctuaryId}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Share Link Copied!",
      description: "The sanctuary submission link has been copied to your clipboard.",
    });
  };

  const handleRemoveSanctuary = (sanctuaryId: string) => {
    // Remove from localStorage
    localStorage.removeItem(`sanctuary-host-${sanctuaryId}`);
    localStorage.removeItem(`sanctuary-host-${sanctuaryId}-expires`);
    localStorage.removeItem(`sanctuary-last-accessed-${sanctuaryId}`);
    
    // Update state
    setSanctuaries(prev => prev.filter(s => s.id !== sanctuaryId));
    
    toast({
      title: "Sanctuary Removed",
      description: "The sanctuary has been removed from your list.",
    });
  };

  const filteredSanctuaries = sanctuaries.filter(sanctuary => {
    const now = new Date();
    const expiryDate = new Date(sanctuary.expiresAt);
    
    switch (activeFilter) {
      case 'active':
        return expiryDate > now;
      case 'expired':
        return expiryDate <= now;
      default:
        return true;
    }
  });

  const activeSanctuaries = sanctuaries.filter(s => new Date(s.expiresAt) > new Date());
  const expiredSanctuaries = sanctuaries.filter(s => new Date(s.expiresAt) <= new Date());

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>My Sanctuaries</CardTitle>
                <CardDescription>
                  Manage and access all your created sanctuary spaces
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadSanctuaries}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              
              <Button asChild size="sm">
                <Link to="/sanctuary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active Sanctuaries</p>
                <p className="text-2xl font-bold">{activeSanctuaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Messages</p>
                <p className="text-2xl font-bold">
                  {sanctuaries.reduce((sum, s) => sum + (s.submissionCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Expired</p>
                <p className="text-2xl font-bold">{expiredSanctuaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All ({sanctuaries.length})
            </Button>
            <Button
              variant={activeFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('active')}
            >
              Active ({activeSanctuaries.length})
            </Button>
            <Button
              variant={activeFilter === 'expired' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('expired')}
            >
              Expired ({expiredSanctuaries.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sanctuaries List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeFilter === 'all' ? 'All Sanctuaries' : 
             activeFilter === 'active' ? 'Active Sanctuaries' : 'Expired Sanctuaries'}
            {` (${filteredSanctuaries.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSanctuaries.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {filteredSanctuaries.map((sanctuary) => {
                  const isExpired = new Date(sanctuary.expiresAt) <= new Date();
                  const isActive = !isExpired;
                  
                  return (
                    <div 
                      key={sanctuary.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        isActive ? "bg-card hover:bg-muted/50" : "bg-muted/30 border-muted"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {sanctuary.emoji && (
                            <span className="text-2xl">{sanctuary.emoji}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-sm truncate">
                                {sanctuary.topic}
                              </h3>
                              <Badge 
                                variant={sanctuary.mode === 'live-audio' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {sanctuary.mode === 'live-audio' ? 'Live Audio' : 'Anonymous Inbox'}
                              </Badge>
                              {isExpired && (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            
                            {sanctuary.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {sanctuary.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created {formatDistanceToNow(new Date(sanctuary.createdAt), { addSuffix: true })}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isExpired 
                                  ? `Expired ${formatDistanceToNow(new Date(sanctuary.expiresAt), { addSuffix: true })}`
                                  : `Expires ${formatDistanceToNow(new Date(sanctuary.expiresAt), { addSuffix: true })}`
                                }
                              </div>
                              
                              {sanctuary.submissionCount !== undefined && (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  {sanctuary.submissionCount} messages
                                </div>
                              )}
                            </div>
                            
                            {sanctuary.lastAccessed && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last accessed {formatDistanceToNow(new Date(sanctuary.lastAccessed), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isActive && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewInbox(sanctuary)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View Inbox
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyShareLink(sanctuary.id)}
                                className="flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                Share
                              </Button>
                            </>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Sanctuary</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this sanctuary from your list? 
                                  This won't delete the sanctuary itself, just removes it from your dashboard.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRemoveSanctuary(sanctuary.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-10">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">
                {activeFilter === 'active' ? 'No active sanctuaries' : 
                 activeFilter === 'expired' ? 'No expired sanctuaries' : 'No sanctuaries yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {activeFilter === 'active' 
                  ? 'All your sanctuaries have expired or there are none to display.'
                  : activeFilter === 'expired'
                  ? 'You have no expired sanctuaries.'
                  : 'Create your first sanctuary to start collecting anonymous feedback.'
                }
              </p>
              {activeFilter !== 'expired' && (
                <Button asChild>
                  <Link to="/sanctuary">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Sanctuary
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MySanctuaries;
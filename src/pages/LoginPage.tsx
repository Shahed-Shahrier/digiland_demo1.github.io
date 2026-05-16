import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoadingScreen } from '@/components/PageLoadingScreen';
import { ProjectLogo } from '@/components/ProjectLogo';
import { getDashboardPath, getFeaturePath, isFeatureKey } from '@/lib/featureRoutes';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const destinationAfterLogin = (role: NonNullable<Awaited<ReturnType<typeof login>>['user']>['role']) => {
    const feature = searchParams.get('feature');
    if (isFeatureKey(feature)) return getFeaturePath(feature, role);

    const next = searchParams.get('next');
    if (next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')) return next;

    return getDashboardPath(role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(destinationAfterLogin(result.user?.role || 'citizen'));
      } else {
        toast({ title: 'Login Failed', description: result.error, variant: 'destructive' });
        setIsSigningIn(false);
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error instanceof Error ? error.message : 'Could not sign in.',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  };

  return (
    <div className="app-surface flex min-h-screen items-center justify-center p-4">
      {isSigningIn && <PageLoadingScreen message="Signing in..." overlay />}
      <Card className="w-full max-w-md animate-rise-in">
        <CardHeader className="text-center">
          <ProjectLogo className="animate-soft-pulse mx-auto mb-2 h-10 w-10 shadow-primary/25" />
          <CardTitle className="text-2xl">Sign in to Digi-Land</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

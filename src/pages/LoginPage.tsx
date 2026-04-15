import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password);
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('digiland_current_user')!);
      const paths = { citizen: '/citizen', land_officer: '/officer', survey_officer: '/survey', admin: '/admin' };
      navigate(paths[user.role as keyof typeof paths]);
    } else {
      toast({ title: 'Login Failed', description: result.error, variant: 'destructive' });
    }
  };

  const quickLogin = (email: string) => {
    const result = login(email, 'demo1234');
    if (result.success) {
      const user = JSON.parse(localStorage.getItem('digiland_current_user')!);
      const paths = { citizen: '/citizen', land_officer: '/officer', survey_officer: '/survey', admin: '/admin' };
      navigate(paths[user.role as keyof typeof paths]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Sign in to Digi-Land</CardTitle>
          <CardDescription>Enter your credentials or use a demo account</CardDescription>
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
            <Button type="submit" className="w-full">Sign In</Button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-center text-muted-foreground mb-3">Quick demo login</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Citizen', email: 'citizen@demo.com' },
                { label: 'Officer', email: 'officer@demo.com' },
                { label: 'Survey', email: 'survey@demo.com' },
                { label: 'Admin', email: 'admin@demo.com' },
              ].map(d => (
                <Button key={d.label} variant="outline" size="sm" onClick={() => quickLogin(d.email)}>{d.label}</Button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

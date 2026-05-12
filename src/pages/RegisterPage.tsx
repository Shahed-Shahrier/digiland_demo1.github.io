import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [nid, setNid] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = phone.trim();
    const normalizedNid = nid.trim();

    if (!normalizedPhone || normalizedPhone.length < 7) {
      toast({ title: 'Registration Failed', description: 'Enter a unique phone number with at least 7 digits.', variant: 'destructive' });
      return;
    }

    if (!normalizedNid) {
      toast({ title: 'Registration Failed', description: 'Enter a unique NID number.', variant: 'destructive' });
      return;
    }

    const result = await register(name.trim(), email.trim(), password, 'citizen', normalizedPhone, normalizedNid);
    if (result.success) {
      if (result.needsEmailConfirmation || !result.user) {
        toast({
          title: 'Check your email',
          description: result.error || 'Confirm your email address, then sign in to Digi-Land.',
        });
        navigate('/login');
        return;
      }

      navigate('/citizen');
    } else {
      toast({ title: 'Registration Failed', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register for Digi-Land</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" minLength={7} required />
            </div>
            <div className="space-y-2">
              <Label>NID Number</Label>
              <Input value={nid} onChange={e => setNid(e.target.value)} placeholder="Enter registered NID" autoComplete="off" required />
            </div>
            <Button type="submit" className="w-full">Register</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

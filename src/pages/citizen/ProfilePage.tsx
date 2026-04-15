import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const fields = [
    { icon: User, label: 'Name', value: user.name },
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || 'N/A' },
    { icon: CreditCard, label: 'NID', value: user.nid || 'N/A' },
    { icon: MapPin, label: 'Address', value: user.address || 'N/A' },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
      </div>
      <Card className="max-w-lg">
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {fields.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <f.icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-medium">{f.value}</p>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-medium capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Member Since</p>
            <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

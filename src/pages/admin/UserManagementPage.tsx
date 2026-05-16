import { useState } from 'react';
import { getUsers, deleteUser, updateUserRole } from '@/services/storageService';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

type RoleFilter = 'all' | UserRole;

export default function UserManagementPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [, setRefresh] = useState(0);
  const { toast } = useToast();
  const matchingUsers = getUsers().filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()));
  const users = roleFilter === 'all' ? matchingUsers : matchingUsers.filter(user => user.role === roleFilter);

  const roleTabs: Array<{ value: RoleFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'citizen', label: 'Citizens' },
    { value: 'land_officer', label: 'Land Officers' },
    { value: 'survey_officer', label: 'Survey Officers' },
    { value: 'admin', label: 'Admins' },
  ];

  const roleCount = (role: RoleFilter) =>
    role === 'all' ? matchingUsers.length : matchingUsers.filter(user => user.role === role).length;

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteUser(id);
      toast({ title: 'User Deleted', description: `${name} has been removed.` });
      setRefresh(r => r + 1);
    } catch (error) {
      toast({ title: 'Delete Failed', description: error instanceof Error ? error.message : 'Could not delete user', variant: 'destructive' });
    }
  };

  const handleRoleSave = async (id: string, name: string) => {
    const user = users.find(item => item.id === id);
    const nextRole = roleDrafts[id] || user?.role;

    if (!user || !nextRole || nextRole === user.role) return;

    try {
      await updateUserRole(id, nextRole);
      toast({ title: 'Role Updated', description: `${name} is now ${nextRole.replace('_', ' ')}.` });
      setRefresh(r => r + 1);
    } catch (error) {
      toast({ title: 'Role Update Failed', description: error instanceof Error ? error.message : 'Could not update role', variant: 'destructive' });
    }
  };

  const roleColors: Record<string, string> = {
    citizen: 'bg-primary/10 text-primary',
    land_officer: 'bg-info/10 text-info',
    survey_officer: 'bg-warning/10 text-accent-foreground',
    admin: 'bg-destructive/10 text-destructive',
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-description">{users.length} user(s) shown</p>
      </div>

      <div className="relative mb-4 w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search users..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <Tabs value={roleFilter} onValueChange={value => setRoleFilter(value as RoleFilter)} className="mb-6">
        <TabsList className="h-auto flex-wrap justify-start">
          {roleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {roleCount(tab.value)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No users found for this filter.
            </CardContent>
          </Card>
        ) : users.map(u => (
          <Card key={u.id}>
            <CardContent className="responsive-list-row py-3">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{u.name.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="responsive-list-actions">
                <Badge className={roleColors[u.role]}>{u.role.replace('_', ' ')}</Badge>
                <Select value={roleDrafts[u.id] || u.role} onValueChange={value => setRoleDrafts(prev => ({ ...prev, [u.id]: value as UserRole }))}>
                  <SelectTrigger className="w-full min-[420px]:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">Citizen</SelectItem>
                    <SelectItem value="land_officer">Land Officer</SelectItem>
                    <SelectItem value="survey_officer">Survey Officer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => void handleRoleSave(u.id, u.name)} disabled={(roleDrafts[u.id] || u.role) === u.role}>
                  Save
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

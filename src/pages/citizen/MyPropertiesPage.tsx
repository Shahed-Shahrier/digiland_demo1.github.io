import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getLandRecordsByCurrentOwnerNid } from '@/services/storageService';
import { LandRecord } from '@/types';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProperties() {
      if (!user?.nid) {
        setProperties([]);
        setLoading(false);
        return;
      }

      try {
        const records = await getLandRecordsByCurrentOwnerNid(user.nid);
        if (mounted) setProperties(records);
      } catch (error) {
        if (!mounted) return;
        toast({
          title: 'Could not load properties',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProperties();

    return () => {
      mounted = false;
    };
  }, [toast, user?.nid]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">My Properties</h1>
        <p className="page-description">Properties currently listed with your NID: {user?.nid || 'N/A'}</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading properties...
          </CardContent>
        </Card>
      ) : !user?.nid ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Your profile does not have a NID number yet.
          </CardContent>
        </Card>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No properties are currently listed with this NID.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {properties.map(property => (
            <Card key={property.id} className="hover:shadow-md transition-shadow">
              <CardContent className="space-y-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">Plot {property.plotNumber}</p>
                    <p className="text-sm text-muted-foreground">Holding {property.holdingNumber || 'N/A'}</p>
                  </div>
                  <Badge variant={property.ownershipStatus === 'Active' ? 'default' : 'secondary'}>
                    {property.ownershipStatus}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Owner NID</p>
                    <p className="font-medium">{user.nid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Land Size</p>
                    <p className="font-medium">{property.landSize || 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{property.mouza}, {property.upazila}, {property.district}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Current owner: {property.ownerName}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

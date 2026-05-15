import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  to?: string;
}

export function StatCard({ title, value, icon: Icon, description, className, to }: StatCardProps) {
  const card = (
    <Card className={cn('stat-card', to && 'cursor-pointer hover:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );

  if (!to) return card;

  return (
    <Link to={to} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      {card}
    </Link>
  );
}

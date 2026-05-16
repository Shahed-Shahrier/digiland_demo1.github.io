import { Loader2 } from 'lucide-react';
import { ProjectLogo } from '@/components/ProjectLogo';

type PageLoadingScreenProps = {
  message?: string;
  overlay?: boolean;
};

export function PageLoadingScreen({ message = 'Loading...', overlay = false }: PageLoadingScreenProps) {
  const wrapperClass = overlay
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm'
    : 'min-h-screen bg-background flex items-center justify-center p-4';

  return (
    <div className={wrapperClass} role="status" aria-live="polite" aria-label={message}>
      <div className="flex min-w-56 flex-col items-center gap-4 rounded-lg border bg-card px-8 py-7 text-card-foreground shadow-lg">
        <div className="relative">
          <ProjectLogo className="h-14 w-14" />
          <Loader2 className="absolute -right-2 -top-2 h-5 w-5 animate-spin rounded-full bg-card p-0.5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

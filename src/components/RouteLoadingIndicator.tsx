import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoadingScreen } from '@/components/PageLoadingScreen';

export function RouteLoadingIndicator() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsLoading(true);
    const timeout = window.setTimeout(() => setIsLoading(false), 450);

    return () => window.clearTimeout(timeout);
  }, [location.key, location.pathname, location.search]);

  if (!isLoading) return null;

  return <PageLoadingScreen message="Loading page..." overlay />;
}

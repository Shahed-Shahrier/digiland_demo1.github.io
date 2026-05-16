import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectLogo } from '@/components/ProjectLogo';
import { FeatureKey, getDashboardPath, getFeaturePath } from '@/lib/featureRoutes';
import { FileText, Search, Shield, ArrowRight, CheckCircle2, Globe } from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();

  const features: Array<{ icon: typeof Search; key: FeatureKey; title: string; desc: string }> = [
    { icon: Search, key: 'land-search', title: 'Land Search', desc: 'Search records by plot or holding number instantly.' },
    { icon: FileText, key: 'digital-applications', title: 'Digital Applications', desc: 'Submit mutation applications with document uploads.' },
    { icon: Shield, key: 'officer-verification', title: 'Officer Verification', desc: 'Multi-step review by land and survey officers.' },
    { icon: CheckCircle2, key: 'status-tracking', title: 'Status Tracking', desc: 'Real-time updates on your application progress.' },
  ];

  const featureHref = (feature: FeatureKey) => {
    if (isAuthenticated && user) return getFeaturePath(feature, user.role);
    return `/login?feature=${feature}`;
  };
  const dashboardHref = user ? getDashboardPath(user.role) : '/login';

  return (
    <div className="app-surface min-h-screen">
      {/* Hero */}
      <header className="border-b border-white/10 bg-primary shadow-lg shadow-primary/20 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ProjectLogo className="animate-soft-pulse h-8 w-8 shadow-accent/25" />
            <span className="text-xl font-bold text-white">Digi-Land</span>
          </div>
          <div className="flex gap-2">
            {isAuthenticated && user ? (
              <Button className="bg-white text-primary shadow-white/20 hover:bg-white/90" asChild>
                <Link to={dashboardHref}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild><Link to="/login">Login</Link></Button>
                <Button className="bg-white text-primary shadow-white/20 hover:bg-white/90" asChild><Link to="/register">Register</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 py-24">
        <div className="container max-w-4xl animate-rise-in text-center">
          <div className="mb-6 inline-flex items-center rounded-full border bg-card/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Globe className="h-3.5 w-3.5 mr-2" />
            Academic Prototype — Digital Land Records for Bangladesh
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Digital Land Record &<br />
            <span className="text-primary">Mutation Management</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A transparent, trackable platform for land ownership transfers. Search records, submit applications, and track progress — all online.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {isAuthenticated && user ? (
              <Button size="lg" asChild>
                <Link to={dashboardHref}>Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/register">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Login</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-background/55 py-20 backdrop-blur">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Platform Features</h2>
          <div className="stagger-children mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <Link key={f.title} to={featureHref(f.key)} className="glass-panel interactive-card rounded-lg p-6 text-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Digi-Land — Academic Prototype © 2024. Not affiliated with any government entity.</p>
      </footer>
    </div>
  );
}

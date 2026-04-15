import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, FileText, Search, Shield, ArrowRight, CheckCircle2, Users, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Digi-Land</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
            <Button asChild><Link to="/register">Register</Link></Button>
          </div>
        </div>
      </header>

      <section className="py-24 px-6">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground mb-6">
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
            <Button size="lg" asChild>
              <Link to="/register">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Demo Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50 border-t">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-12">Platform Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Search, title: 'Land Search', desc: 'Search records by plot or holding number instantly.' },
              { icon: FileText, title: 'Digital Applications', desc: 'Submit mutation applications with document uploads.' },
              { icon: Shield, title: 'Officer Verification', desc: 'Multi-step review by land and survey officers.' },
              { icon: CheckCircle2, title: 'Status Tracking', desc: 'Real-time updates on your application progress.' },
            ].map(f => (
              <div key={f.title} className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Accounts */}
      <section className="py-20 border-t">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Demo Accounts</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { role: 'Citizen', email: 'citizen@demo.com', pw: 'demo1234' },
              { role: 'Land Officer', email: 'officer@demo.com', pw: 'demo1234' },
              { role: 'Survey Officer', email: 'survey@demo.com', pw: 'demo1234' },
              { role: 'Administrator', email: 'admin@demo.com', pw: 'demo1234' },
            ].map(d => (
              <div key={d.role} className="rounded-lg border bg-card p-4">
                <p className="font-semibold text-sm">{d.role}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.email} / {d.pw}</p>
              </div>
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

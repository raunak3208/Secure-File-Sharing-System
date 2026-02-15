'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, FileText, Share2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.push('/dashboard');
        } else {
          setIsChecking(false);
        }
      } catch {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">SecureShare</h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/auth/login')}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-card"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push('/auth/sign-up')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Account
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold text-foreground text-balance">
            Share Files Securely
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Control access with time-limited links and granular permissions. Your files stay
            encrypted and secure.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              onClick={() => router.push('/auth/sign-up')}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
            </Button>
            <Button
              onClick={() => router.push('/auth/login')}
              size="lg"
              variant="outline"
              className="border-border hover:bg-card text-foreground"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card/50 border-t border-border py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-foreground text-center mb-12">Features</h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-border rounded-lg hover:bg-card/50 transition-colors">
              <FileText className="w-8 h-8 text-primary mb-4" />
              <h4 className="font-semibold text-foreground mb-2">Upload Files</h4>
              <p className="text-sm text-muted-foreground">
                Upload any file type and store it securely. Files are encrypted at rest.
              </p>
            </div>

            <div className="p-6 border border-border rounded-lg hover:bg-card/50 transition-colors">
              <Share2 className="w-8 h-8 text-primary mb-4" />
              <h4 className="font-semibold text-foreground mb-2">Time-Limited Links</h4>
              <p className="text-sm text-muted-foreground">
                Share files with expiring links. Control exactly who can access and when.
              </p>
            </div>

            <div className="p-6 border border-border rounded-lg hover:bg-card/50 transition-colors">
              <Shield className="w-8 h-8 text-primary mb-4" />
              <h4 className="font-semibold text-foreground mb-2">Granular Control</h4>
              <p className="text-sm text-muted-foreground">
                Set permissions per file. Control downloads, expiration, and access levels.
              </p>
            </div>
          </div>
        </div>
      </section>

     
    </div>
  );
}

import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left: header + form */}
      <div className="flex-1 flex flex-col bg-background">
        <header className="px-6 py-5 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <LayoutGrid className="w-5 h-5 text-primary" />
            <span className="text-h3 font-semibold tracking-tight">FlowBoard</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          {children}
        </main>
      </div>

      {/* Right: decorative illustration panel — hidden below lg, no room for it on smaller viewports */}
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-6 relative overflow-hidden px-12 bg-[radial-gradient(circle_at_50%_40%,_var(--primary)_0%,_var(--background)_75%)]">        
        <DotLottieReact
      src="https://lottie.host/91d0b945-2016-4130-91a8-7dec9576ef03/dY93NV6IRa.lottie"
      loop
      autoplay
       style={{ width: '100%' }}
    />
        <p className="text-body text-primary-foreground/80 text-center max-w-xs">
          Plan, track, and ship — together.
        </p>
      </div>
    </div>
  );
}
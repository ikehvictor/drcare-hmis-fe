import Image from "next/image";
import Link from "next/link";

// Sign-in screen placeholder. No authentication yet: the button goes straight to the admin.
export default function SignInPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={48} height={39} />
          <span className="font-display text-xl font-semibold">Dr. Care</span>
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-4xl leading-tight font-semibold">
            One platform. Every hospital, run its own way.
          </h2>
          <p className="mt-4 text-white/70">
            Set up your branches, service points, staff and patient journey without waiting on anyone.
          </p>
        </div>
        <p className="text-sm text-white/40">© 2026 Dr. Care</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-teal/30 blur-3xl" />
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/brand/logo.png" alt="" width={40} height={32} />
            <span className="font-display text-xl font-semibold">Dr. Care</span>
          </div>
          <h1 className="font-display text-2xl font-semibold">Sign in to your hospital</h1>
          <p className="mt-1 text-sm text-muted">Use the work account your hospital admin gave you.</p>

          <form className="mt-8 space-y-4" action="/admin">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Work email
              </label>
              <input
                id="email"
                type="email"
                defaultValue="ada.okafor@lakeside.example"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Not needed in the demo"
                className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
            </div>
            <Link
              href="/admin"
              className="flex h-10 w-full items-center justify-center rounded-lg bg-teal text-sm font-medium text-white hover:bg-teal-dark"
            >
              Continue as Hospital Super Admin
            </Link>
          </form>
          <p className="mt-6 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            Front-end preview: sign-in is not connected yet, so any details work.
          </p>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
        <span className="text-accent">{">"}</span> devdash
      </Link>
      {children}
    </main>
  );
}

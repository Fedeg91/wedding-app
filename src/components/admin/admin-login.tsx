"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/features/admin/api";

export function AdminLogin({ eventSlug }: { eventSlug: string }) {
  const router = useRouter(); const [password, setPassword] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(null); try { await adminLogin(eventSlug, password); router.refresh(); } catch { setError("Password non corretta. Riprova."); } finally { setPending(false); } }
  return <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#fff1f2,transparent_48%)] px-6"><section className="w-full max-w-sm text-center"><div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-500"><LockKeyhole className="size-7" /></div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Area riservata</p><h1 className="mt-2 font-serif text-3xl">Gestione matrimonio</h1><p className="mt-3 text-sm text-stone-500">Inserisci la password degli sposi per continuare.</p><form onSubmit={submit} className="mt-8 space-y-3 text-left"><label htmlFor="admin-password" className="ml-1 text-sm font-semibold">Password</label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoFocus />{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}<Button className="w-full" disabled={pending || !password}>{pending ? "Accesso…" : "Accedi"}<Heart className="size-4" /></Button></form></section></main>;
}

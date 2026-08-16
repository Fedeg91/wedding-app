import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { hasAdminSession } from "@/features/admin/auth/server";

export default async function AdminPage({ params }: { params: Promise<{ eventSlug: string }> }) { const { eventSlug } = await params; const authenticated = await hasAdminSession(eventSlug); return authenticated ? <AdminDashboard eventSlug={eventSlug} /> : <AdminLogin eventSlug={eventSlug} />; }

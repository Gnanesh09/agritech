import { cookies } from "next/headers";
import { ArrowUpRight, Users, CreditCard, Activity } from "lucide-react";

export default async function DashboardPage() {
  let userData = null;

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (refreshToken) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      const refreshRes = await fetch(`${apiUrl}/api/auth/refresh-token`, {
        headers: { Cookie: `refreshToken=${refreshToken}` },
        cache: "no-store",
      });

      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();

        const userRes = await fetch(`${apiUrl}/api/auth/get-me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });

        if (userRes.ok) {
          const data = await userRes.json();
          userData = data.user;
        }
      }
    } catch (error) {
      console.error("Server-side fetch failed:", error);
    }
  }

  const metrics = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      trend: "+20.1%",
      icon: CreditCard,
    },
    {
      title: "Active Sessions",
      value: "2,350",
      trend: "+15.2%",
      icon: Activity,
    },
    { title: "New Users", value: "842", trend: "+4.5%", icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">
          Good afternoon, {userData?.username || "Gaurav"}
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Here is what's happening with your projects today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div
              key={i}
              className="bg-surface p-6 rounded-2xl border border-brand-border shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 bg-brand-light rounded-xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-dark" />
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-accent-emerald bg-emerald-50 px-2 py-1 rounded-md">
                  {metric.trend}
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
              <h3 className="text-brand-muted text-sm font-medium">
                {metric.title}
              </h3>
              <p className="text-2xl font-semibold text-brand-dark mt-1">
                {metric.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Chart/Table Card */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-brand-border shadow-card p-6 min-h-[400px]">
          <h3 className="font-semibold text-brand-dark mb-6">
            Decision Intelligence Performance
          </h3>
          <div className="h-full flex items-center justify-center border-2 border-dashed border-brand-border rounded-xl bg-brand-light/50">
            <p className="text-sm text-brand-muted">
              Chart visualization goes here
            </p>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-surface rounded-2xl border border-brand-border shadow-card p-6">
          <h3 className="font-semibold text-brand-dark mb-6">Recent Events</h3>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-2 w-2 rounded-full bg-brand-dark mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-brand-dark">
                    API Key Regenerated
                  </p>
                  <p className="text-xs text-brand-muted mt-1">
                    2 hours ago via Web
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

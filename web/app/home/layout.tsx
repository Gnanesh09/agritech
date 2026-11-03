
import BottomNav from "../../components/BoottomNav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[var(--dash-bg)] text-[var(--dash-text-primary)]">
      {/* =====================================================
          MAIN APPLICATION CONTENT
      ===================================================== */}

      <main className="min-h-screen w-full pb-24 lg:pb-8 lg:pl-[var(--dashboard-sidebar-width)]">
        {children}
      </main>


      {/* =====================================================
          SHARED NAVIGATION
      ===================================================== */}
      <BottomNav />
    </div>
  );
}

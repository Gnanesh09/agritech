
import BottomNav from "../../components/BoottomNav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#0c1410] text-[#f4efe4]">
      {/* =====================================================
          MAIN APPLICATION CONTENT
      ===================================================== */}

      <main className="min-h-screen w-full pb-24 lg:pb-8 lg:pl-64">
        {children}
      </main>


      {/* =====================================================
          SHARED NAVIGATION
      ===================================================== */}
      <BottomNav />
    </div>
  );
}

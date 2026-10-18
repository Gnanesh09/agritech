
import BottomNav from "../../components/BoottomNav";
import PageTransition from "../../components/PageTransition";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f6ef] dark:bg-gray-950">
      <div className="relative min-h-screen w-full bg-white dark:bg-gray-900">
        <main className="min-h-screen pb-24 lg:pb-8 lg:pl-[76px]">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

import BottomNav from "../../components/ui/BoottomNav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="relative mx-auto min-h-screen w-full bg-white lg:max-w-[430px]">
        {/* Page content */}
        <main className="min-h-screen ">{children}</main>

        {/* Bottom navigation */}
        <BottomNav />
      </div>
    </div>
  );
}

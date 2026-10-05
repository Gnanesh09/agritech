import BottomNav from "../../components/BoottomNav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f6ef] dark:bg-gray-950">
      <div className="relative mx-auto min-h-screen w-full bg-white pb-32 dark:bg-gray-900 lg:max-w-[430px]">
        <main className="min-h-screen">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
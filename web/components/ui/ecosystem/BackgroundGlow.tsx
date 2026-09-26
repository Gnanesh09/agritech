export default function BackgroundGlow() {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#dceacb]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#c9dfbd]/45 blur-3xl" />
    </>
  );
}

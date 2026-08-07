import { ModeScope } from "@/components/app/ModeScope";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Light is the default, but /scratch can leave dark on <html>; set
          before paint so arriving from it never flashes the wrong canvas. */}
      <script
        dangerouslySetInnerHTML={{
          __html: 'document.documentElement.dataset.mode="light";',
        }}
      />
      {/* Re-asserts the mode when arriving via client-side navigation. */}
      <ModeScope mode="light" />
      {children}
    </>
  );
}

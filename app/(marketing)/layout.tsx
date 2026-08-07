import { ModeScope } from "@/components/app/ModeScope";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Set before paint so a direct load never flashes dark. */}
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

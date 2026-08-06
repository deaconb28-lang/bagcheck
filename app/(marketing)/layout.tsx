export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Marketing renders in light mode; runs before paint to avoid a flash. */}
      <script
        dangerouslySetInnerHTML={{
          __html: 'document.documentElement.dataset.mode="light";',
        }}
      />
      {children}
    </>
  );
}

/*
 * The marketing group: the one place General Sans exists. The app keeps its
 * own faces; the landing speaks the brand's public voice, so the font loads
 * here and nowhere else.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
}

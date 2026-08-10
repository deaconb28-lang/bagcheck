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
    <>
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}

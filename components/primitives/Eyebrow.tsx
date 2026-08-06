type EyebrowProps = {
  children: React.ReactNode;
  tone?: "ink" | "gold" | "violet";
  as?: "div" | "span";
};

export function Eyebrow({ children, tone = "ink", as: Tag = "div" }: EyebrowProps) {
  return (
    <Tag className="eyebrow" data-tone={tone === "ink" ? undefined : tone}>
      {children}
    </Tag>
  );
}

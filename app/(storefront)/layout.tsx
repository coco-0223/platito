export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="storefront-wrapper min-h-screen flex flex-col">{children}</div>;
}

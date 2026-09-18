import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { RoleProvider } from "@/lib/context/RoleContext";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";

export const metadata: Metadata = {
  title: "Platito - Marketplace Gastronómico",
  description: "Marketplace gastronómico de marca blanca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <RoleProvider>
          <CartProvider>
            {children}
            <RoleSwitcher />
          </CartProvider>
        </RoleProvider>
      </body>
    </html>
  );
}

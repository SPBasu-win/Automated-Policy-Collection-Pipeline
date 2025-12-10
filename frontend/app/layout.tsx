import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedWrapper from "./components/ProtectedWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The People's Agent",
  description: "Secure Government Interface with Authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ProtectedWrapper>
            {children}
          </ProtectedWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
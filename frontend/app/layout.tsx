import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The People's Agent",
  description: "Secure Government Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        <div className="flex h-screen w-full bg-zinc-950 overflow-hidden">
          
          
          <div className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950">
            <Sidebar />
          </div>

          
          <main className="flex-1 relative flex flex-col h-full metallic-bg">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}
import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Automated Exam Proctoring System",
  description: "Secure and automated exam monitoring powered by AI.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#0c1929] text-white antialiased selection:bg-[#0091ad]/30`}>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_#0d3352_0%,_#0c1929_65%)] pointer-events-none" />
        <AuthProvider>
          <main className="relative z-10 min-h-full">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

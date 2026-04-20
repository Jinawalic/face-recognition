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
      <body className={`${inter.className} h-full bg-[#0a0a0a] text-white antialiased selection:bg-[#44A194]/30`}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1a2a28_0%,_#0a0a0a_60%)] pointer-events-none" />
        <AuthProvider>
          <main className="relative z-10 min-h-full">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

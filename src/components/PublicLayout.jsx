import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar } from "./SiteNavbar";
import { Footer } from "./SiteFooter";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  );
}

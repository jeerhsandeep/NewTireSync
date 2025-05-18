"use client";

import type { ReactNode } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { Wrench, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [shopDetails, setShopDetails] = useState<{ shopName?: string } | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setShopDetails(null);
        return;
      }
      const userEmail = user.email || "unknown_user";
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setShopDetails(userDoc.data());
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold text-sidebar-foreground">
              TireSync
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <UserCircle className="h-5 w-5" />
            <span>{shopDetails?.shopName || "Shop Name"}</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppHeader() {
  const { isMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 shadow-sm md:px-6">
      {isMobile && <SidebarTrigger />}
      {!isMobile && <div className="w-7"></div>}{" "}
      {/* Placeholder for non-mobile trigger space */}
      <div className="flex items-center gap-4">
        {/* Add any header actions here, e.g., search, notifications */}
      </div>
    </header>
  );
}

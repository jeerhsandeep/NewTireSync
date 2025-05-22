"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Wrench, UserCircle, UserCog, KeyRound, LogOut } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { signOut, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [shopDetails, setShopDetails] = useState<{ shopName?: string } | null>(
    null
  );
  const [showChangePasswordAlert, setShowChangePasswordAlert] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        toast({
          title: "No email address found for the current user",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }
      setIsSendingResetEmail(true);
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
    } catch (error) {
      console.error("Error sending password reset email:", error);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("user changed", user);

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
    <SidebarProvider defaultOpen collapsible="icon">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <UserCircle className="h-5 w-5" />
                <span>{shopDetails?.shopName || "Shop Name"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              sideOffset={5}
              align="start"
              className="w-56 bg-popover text-popover-foreground"
            >
              <DropdownMenuItem onClick={() => router.push("/my-account")}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>My Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowChangePasswordAlert(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
      <AlertDialog
        open={showChangePasswordAlert}
        onOpenChange={setShowChangePasswordAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Password Reset</AlertDialogTitle>
            <AlertDialogDescription>
              {resetEmailSent
                ? "Password reset email has been sent. Please check your inbox."
                : "We'll send you an email with instructions to reset your password."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!resetEmailSent && (
              <Button
                onClick={handlePasswordReset}
                disabled={isSendingResetEmail}
                className={`${isSendingResetEmail && "opacity-50"}`}
              >
                {isSendingResetEmail ? "Sending..." : "Send Reset Email"}
              </Button>
            )}
            <AlertDialogAction
              onClick={() => {
                setShowChangePasswordAlert(false);
                setResetEmailSent(false);
              }}
            >
              {resetEmailSent ? "OK" : "Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

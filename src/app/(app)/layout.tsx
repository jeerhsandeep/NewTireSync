"use client";
import { AppLayout } from "@/components/layout/app-layout";
import { useEffect, type ReactNode } from "react";
import { auth } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("user changed", user);
      if (!user) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  return <AppLayout>{children}</AppLayout>;
}

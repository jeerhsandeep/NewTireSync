"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building, Mail, User, Phone, MapPin, Save, LockKeyhole } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountDetails {
  contactPersonName: string;
  businessContactNumber: string;
  businessAddress: string;
}

export default function MyAccountPage() {
  const { toast } = useToast();
  const [accountDetails, setAccountDetails] = useState<AccountDetails>({
    contactPersonName: "Admin User",
    businessContactNumber: "(555) 123-4567",
    businessAddress: "123 Performance Ave, Gearsville, ON M1S 2T3",
  });
  const [shopDetails, setShopDetails] = useState<{ shopName?: string, email?: string, phoneNumber?: string, address?: string , reportEmail?: string, contactPerson?: string, contactPersonPhone?: string, reportPassword?: string} | null>(
      null
    );
  const [showResetReportsPasswordAlert, setShowResetReportsPasswordAlert] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAccountDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = (e: FormEvent) => {
    e.preventDefault();
    // Here you would typically send data to a backend
    console.log("Saving account details:", accountDetails);
    toast({
      title: "Settings Saved",
      description: "Your account details have been updated.",
    });
  };

  const handleReportSaveChanges = (e: FormEvent) => {
    e.preventDefault();
    // Here you would typically send data to a backend
    console.log("Saving account details:", accountDetails);
    toast({
      title: "Settings Saved",
      description: "Your account details have been updated.",
    });
  };


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
const userEmail ="";
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
          <CardDescription>Manage your account and business settings here.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveChanges}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary flex items-center">
                <Building className="mr-2 h-5 w-5" /> Business Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={shopDetails?.shopName || "Shop Name"}
                    readOnly
                    disabled
                    className="mt-1 bg-muted/50"
                  />
                </div>
                <div>
                  <Label htmlFor="businessEmailDisplay">Business Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="businessEmailDisplay"
                      value={shopDetails?.email || "EMAIL"}
                      readOnly
                      disabled
                      className="pl-10 mt-1 bg-muted/50"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="businessContactNumberInfo">Business Contact Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="businessContactNumberInfo"
                      name="businessContactNumber"
                      value={shopDetails?.phoneNumber}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="e.g. (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-primary flex items-center">
                <User className="mr-2 h-5 w-5" /> Contact Details
              </h3>
              <div>
                <Label htmlFor="businessAddress">Business Address</Label>
                 <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="businessAddress"
                    name="businessAddress"
                    value={shopDetails?.address }
                    onChange={handleInputChange}
                    className="pl-10"
                    rows={3}
                    placeholder="e.g. 123 Main St, City, Province, Postal Code"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
            <h3 className="text-lg font-medium text-primary flex items-center">
                <LockKeyhole className="mr-2 h-5 w-5" /> Manage Reports
            </h3>
        </CardHeader>
        
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="accountEmail">Account Email</Label>
                  <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                          id="accountEmail"
                          value={shopDetails?.reportEmail }
                          readOnly
                          disabled
                          className="pl-10 bg-muted/50"
                      />
                  </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPersonName">Contact Person Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contactPersonName"
                    name="contactPersonName"
                    value={shopDetails?.contactPerson }
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="manageReportsContactNumber">Contact Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="manageReportsContactNumber"
                  name="businessContactNumber" // Linked to the same state
                  value={shopDetails?.contactPersonPhone }
                  onChange={handleInputChange}
                  className="pl-10"
                  placeholder="e.g. (555) 555-5555"
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label htmlFor="resetReportsPasswordButton">Reports Page Password</Label>
                <p className="text-sm text-muted-foreground">
                    Manage access to the financial reports section.
                </p>
                 <Button id="resetReportsPasswordButton" variant="outline" onClick={() => setShowResetReportsPasswordAlert(true)}>
                    Reset Reports Page Password
                </Button>
                <CardFooter className="border-t px-6 py-4">
                  <Button type="submit" onClick={handleReportSaveChanges}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
            </div>
        </CardContent>
        
      </Card>

      <AlertDialog open={showResetReportsPasswordAlert} onOpenChange={setShowResetReportsPasswordAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reports Password Information</AlertDialogTitle>
            <AlertDialogDescription>
              The password for the Reports page is currently 'reportspass'.
              To change this password, the application code (specifically in <code>src/app/(app)/reports/page.tsx</code>) needs to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowResetReportsPasswordAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}


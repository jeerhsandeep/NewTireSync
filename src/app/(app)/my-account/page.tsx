"use client";

import type { ChangeEvent, FormEvent } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Mail,
  User,
  Phone,
  MapPin,
  Save,
  LockKeyhole,
  Loader2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
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
  shopName: string;
  email: string;
  contactPersonPhone: string;
  reportEmail: string;
  reportPassword: string;
}

export default function MyAccountPage() {
  const { toast } = useToast();
  const [accountDetails, setAccountDetails] = useState<AccountDetails>({
    contactPersonName: "",
    businessContactNumber: "",
    businessAddress: "",
    shopName: "",
    email: "",
    contactPersonPhone: "",
    reportEmail: "",
    reportPassword: "",
  });
  const [userEmail, setUserEmail] = useState("");
  const [shopDetails, setShopDetails] = useState<{
    shopName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    reportEmail?: string;
    contactPerson?: string;
    contactPersonPhone?: string;
    reportPassword?: string;
  } | null>(null);
  const [showResetReportsPasswordAlert, setShowResetReportsPasswordAlert] =
    useState(false);

  const [isPending, setIsPending] = useState(false);
  const [isSavingReportsData, setIsSavingReportsData] = useState(false);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "");

    // Format the number as (XXX) XXX-XXXX
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(
        6,
        10
      )}`;
    }
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Format phone number if it's a phone number field
    if (name === "businessContactNumber") {
      const formattedValue = formatPhoneNumber(value);
      setAccountDetails((prev) => ({ ...prev, [name]: formattedValue }));
    } else {
      setAccountDetails((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    // 89 Orenda Rd, Brampton, ON L6W 1V7
    console.log("Saving account details:", accountDetails);

    try {
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          phoneNumber: accountDetails.businessContactNumber,
          address: accountDetails.businessAddress,
          shopName: accountDetails.shopName,
          email: accountDetails.email,
        });
        toast({
          title: "Settings Saved",
          description: "Your account details have been updated.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving account details. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving account details:", error);
    } finally {
      setIsPending(false);
    }
  };

  const handleReportSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingReportsData(true);
    try {
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          contactPerson: accountDetails.contactPersonName,
          contactPersonPhone: accountDetails.contactPersonPhone,
          reportEmail: accountDetails.reportEmail,
        });
        toast({
          title: "Settings Saved",
          description: "Your account details have been updated.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving account details. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving account details:", error);
    } finally {
      setIsSavingReportsData(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setShopDetails(null);
        return;
      }
      const userEmail = user.email || "unknown_user";
      const userDocRef = doc(db, "users", userEmail);
      setUserEmail(userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setAccountDetails((prev) => ({
          ...prev,
          contactPersonName: userData.contactPerson,
          businessContactNumber: userData.phoneNumber,
          businessAddress: userData.address,
          shopName: userData.shopName,
          email: userData.email,
          contactPersonPhone: userData.contactPersonPhone,
          reportEmail: userData.reportEmail,
          reportPassword: userData.reportPassword,
        }));
        setShopDetails(userData);
        console.log({ userData });
      }
    });
    return () => unsubscribe();
  }, []);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Account</CardTitle>
          <CardDescription>
            Manage your account and business settings here.
          </CardDescription>
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
                    value={accountDetails.shopName || "Shop Name"}
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
                  <Label htmlFor="businessContactNumberInfo">
                    Business Contact Number
                  </Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="businessContactNumberInfo"
                      name="businessContactNumber"
                      value={accountDetails.businessContactNumber}
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
                    value={accountDetails.businessAddress}
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
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
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
                  value={shopDetails?.reportEmail}
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
                  value={accountDetails.contactPersonName}
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
                name="contactPersonPhone" // Linked to the same state
                value={accountDetails.contactPersonPhone}
                onChange={handleInputChange}
                className="pl-10"
                placeholder="e.g. (555) 555-5555"
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="resetReportsPasswordButton">
              Reports Page Password
            </Label>
            <p className="text-sm text-muted-foreground">
              Manage access to the financial reports section.
            </p>
            <Button
              id="resetReportsPasswordButton"
              variant="outline"
              onClick={() => setShowResetReportsPasswordAlert(true)}
            >
              Reset Reports Page Password
            </Button>
            <CardFooter className="border-t px-6 py-4">
              <Button
                type="submit"
                onClick={handleReportSaveChanges}
                disabled={isSavingReportsData}
              >
                {isSavingReportsData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </div>
        </CardContent>
      </Card>

      {showResetReportsPasswordAlert && (
        <ReportPasswordForm
          showResetReportsPasswordAlert={showResetReportsPasswordAlert}
          setShowResetReportsPasswordAlert={setShowResetReportsPasswordAlert}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}

const ReportPasswordForm = ({
  showResetReportsPasswordAlert,
  setShowResetReportsPasswordAlert,
  userEmail,
}: {
  showResetReportsPasswordAlert: boolean;
  setShowResetReportsPasswordAlert: (open: boolean) => void;
  userEmail: string;
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [isSavingReportsData, setIsSavingReportsData] = useState(false);
  const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  const { toast } = useToast();
  const handleSave = async () => {
    if (!newPassword) return;
    setIsSavingReportsData(true);
    try {
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { reportPassword: newPassword });
        toast({
          title: "Password Saved",
          description: "Your password has been updated.",
        });
        setShowResetReportsPasswordAlert(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error saving reports data.",
        variant: "destructive",
      });
      console.error("Error saving reports data:", error);
    } finally {
      setIsSavingReportsData(false);
    }
  };

  const disabled = isSavingReportsData || newPassword === "";

  return (
    <AlertDialog
      open={showResetReportsPasswordAlert}
      onOpenChange={setShowResetReportsPasswordAlert}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Reports Password</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the new password for the Reports page.
            <div className="relative mt-1">
              <Input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={handleNewPasswordChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !disabled) {
                    handleSave();
                  }
                }}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* <AlertDialogContent>
          <Input type="password" placeholder="New Password" />
        </AlertDialogContent> */}
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowResetReportsPasswordAlert(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={disabled}>
            {isSavingReportsData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

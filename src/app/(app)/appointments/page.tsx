"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Edit3,
  Trash2,
  CalendarIcon,
  User,
  Phone,
  Mail,
  Settings,
  StickyNote,
  DollarSign,
  Clock,
  Printer,
  ChevronsUpDown,
  Check,
  FilterX,
  Search,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Appointment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface MockAppointmentCustomer {
  contactNumber: string;
  customerName: string;
  customerEmail?: string;
}

const mockAppointmentCustomers: MockAppointmentCustomer[] = [
  {
    contactNumber: "555-0101",
    customerName: "John Wick",
    customerEmail: "jw@continental.com",
  },
  {
    contactNumber: "555-0202",
    customerName: "Sarah Connor",
    customerEmail: "sarah.c@cyberdyne.com",
  },
  {
    contactNumber: "555-0303",
    customerName: "Tony Stark",
    customerEmail: "tony@stark.com",
  },
  {
    contactNumber: "555-0404",
    customerName: "Ellen Ripley",
    customerEmail: "ripley@weyland-yutani.com",
  },
  {
    contactNumber: "555-0505",
    customerName: "Bruce Wayne",
    customerEmail: "bruce@wayne.enterprises",
  },
  {
    contactNumber: "555-9999",
    customerName: "Peter Parker",
    customerEmail: "p.parker@dailybugle.com",
  },
];

const initialAppointmentsData: Appointment[] = [
  {
    id: "appt001",
    customerName: "John Wick",
    contactNumber: "555-0101",
    customerEmail: "jw@continental.com",
    appointmentDate: new Date(2024, 6, 15),
    appointmentTime: "10:00 AM",
    serviceType: "Tire Installation",
    itemDetails: "Michelin Pilot Sport 4S, 245/35R19",
    depositPaid: 50,
    notes: "Needs alignment check too.",
    status: "Scheduled",
  },
  {
    id: "appt002",
    customerName: "Sarah Connor",
    contactNumber: "555-0202",
    customerEmail: "sarah.c@cyberdyne.com",
    appointmentDate: new Date(2024, 6, 16),
    appointmentTime: "02:00 PM",
    serviceType: "Oil Change",
    itemDetails: "Synthetic 5W-30",
    status: "Scheduled",
  },
  {
    id: "appt003",
    customerName: "Tony Stark",
    contactNumber: "555-0303",
    customerEmail: "tony@stark.com",
    appointmentDate: new Date(2024, 6, 10),
    appointmentTime: "11:00 AM",
    serviceType: "Brake Service",
    notes: "Check front rotors.",
    status: "Completed",
  },
  {
    id: "appt004",
    customerName: "Ellen Ripley",
    contactNumber: "555-0404",
    customerEmail: "ripley@weyland-yutani.com",
    appointmentDate: new Date(2024, 6, 15),
    appointmentTime: "03:00 PM",
    serviceType: "General Inspection",
    status: "Scheduled",
  },
  {
    id: "appt005",
    customerName: "Bruce Wayne",
    contactNumber: "555-0505",
    customerEmail: "bruce@wayne.enterprises",
    appointmentDate: new Date(2024, 6, 15),
    appointmentTime: "09:00 AM",
    serviceType: "Tire Rotation",
    status: "Scheduled",
  },
];

const serviceTypes = [
  "Tire Installation",
  "Oil Change",
  "Brake Service",
  "General Inspection",
  "Other",
];

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour % 12 === 0 ? 12 : hour % 12;
      const m = minute === 0 ? "00" : minute;
      const ampm = hour < 12 ? "AM" : "PM";
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
      );
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function AppointmentsPage() {
  const { toast } = useToast();
  // const [appointments, setAppointments] = useState<Appointment[]>(
  //   initialAppointmentsData
  // );
  const [newAppointment, setNewAppointment] = useState<
    Omit<Appointment, "id" | "status" | "appointmentDate"> & {
      appointmentDate?: Date;
    }
  >({
    customerName: "",
    contactNumber: "",
    customerEmail: "",
    appointmentDate: undefined,
    appointmentTime: "",
    serviceType: "",
    itemDetails: "",
    depositPaid: undefined,
    notes: "",
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Appointment | null>(null);

  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [timeSearchInput, setTimeSearchInput] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [currentContactCommandInputValue, setCurrentContactCommandInputValue] =
    useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<MockAppointmentCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch appointments and customers from Firestore on mount/auth change
  useEffect(() => {
    let unsubscribe: () => void;
    setLoading(true);
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAppointments([]);
        setCustomers([]);
        setLoading(false);
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        return;
      }
      const userEmail = user.email || "unknown_user";
      try {
        // Fetch appointments
        const apptCol = collection(
          db,
          "appointments",
          userEmail,
          "userAppointments"
        );
        const apptSnap = await getDocs(apptCol);
        const apptData = apptSnap.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          appointmentDate: doc.data().appointmentDate?.toDate
            ? doc.data().appointmentDate.toDate()
            : new Date(doc.data().appointmentDate),
        })) as Appointment[];
        setAppointments(apptData);

        // Fetch customers
        const custCol = collection(
          db,
          "customers",
          userEmail,
          "contactNumbers"
        );
        const custSnap = await getDocs(custCol);
        const custData = custSnap.docs.map((doc) => ({
          contactNumber: doc.id,
          ...doc.data(),
        })) as MockAppointmentCustomer[];
        setCustomers(custData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch appointments or customers.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!isEditing && newAppointment.appointmentDate === undefined) {
      setNewAppointment((prev) => ({ ...prev, appointmentDate: new Date() }));
    }
  }, [isEditing, newAppointment.appointmentDate]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const val =
      e.target.type === "number"
        ? value === ""
          ? undefined
          : parseFloat(value)
        : value;
    if (isEditing && editForm) {
      setEditForm({ ...editForm, [name]: val });
    } else {
      setNewAppointment((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleContactChange = (
    name: "contactNumber" | "customerName" | "customerEmail",
    value: string
  ) => {
    if (isEditing && editForm) {
      setEditForm((prev) => ({ ...prev!, [name]: value }));
    } else {
      setNewAppointment((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectAppointmentCustomer = (
    customer: MockAppointmentCustomer
  ) => {
    if (isEditing && editForm) {
      setEditForm((prev) => ({
        ...prev!,
        contactNumber: customer.contactNumber,
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
      }));
    } else {
      setNewAppointment((prev) => ({
        ...prev,
        contactNumber: customer.contactNumber,
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
      }));
    }
    setCurrentContactCommandInputValue(customer.contactNumber);
    setContactPopoverOpen(false);
    toast({
      title: "Customer Selected",
      description: "Customer details have been pre-filled.",
    });
  };

  const handleDateChange = (date?: Date) => {
    if (date) {
      if (isEditing && editForm) {
        setEditForm({ ...editForm, appointmentDate: date });
      } else {
        setNewAppointment((prev) => ({ ...prev, appointmentDate: date }));
      }
    }
  };

  const handleServiceTypeSelectChange = (value: string) => {
    if (isEditing && editForm) {
      setEditForm({ ...editForm, serviceType: value });
    } else {
      setNewAppointment((prev) => ({ ...prev, serviceType: value }));
    }
  };

  const handleTimeSelect = (selectedTime: string) => {
    if (isEditing && editForm) {
      setEditForm({ ...editForm, appointmentTime: selectedTime });
    } else {
      setNewAppointment((prev) => ({ ...prev, appointmentTime: selectedTime }));
    }
    setTimeSearchInput(selectedTime);
    setTimePopoverOpen(false);
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: Appointment["status"]
  ) => {
    setAppointments((prev) =>
      prev.map((app) =>
        app.id === appointmentId ? { ...app, status: newStatus } : app
      )
    );
    try {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        return;
      }
      const userEmail = user.email || "unknown_user";
      const apptRef = doc(
        db,
        "appointments",
        userEmail,
        "userAppointments",
        appointmentId
      );
      await updateDoc(apptRef, { status: newStatus });
      toast({
        title: "Status Updated",
        description: `Appointment status changed to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status in database.",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async (userEmail: string) => {
    const custCol = collection(db, "customers", userEmail, "contactNumbers");
    const custSnap = await getDocs(custCol);
    const custData = custSnap.docs.map((doc) => ({
      contactNumber: doc.id,
      ...doc.data(),
    })) as MockAppointmentCustomer[];
    setCustomers(custData);
  };

  const handleAddAppointment = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const {
      customerName,
      contactNumber,
      appointmentDate,
      appointmentTime,
      serviceType,
      depositPaid,
    } = newAppointment;
    if (
      !customerName ||
      !contactNumber ||
      !appointmentDate ||
      !appointmentTime ||
      !serviceType
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      setFormLoading(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      setFormLoading(false);
      return;
    }
    const userEmail = user.email || "unknown_user";

    // Ensure depositPaid is always a number
    const normalizedDepositPaid =
      depositPaid === undefined || depositPaid === null ? 0 : depositPaid;

    const createdAppointment: Appointment = {
      ...(newAppointment as Omit<Appointment, "id" | "status"> & {
        appointmentDate: Date;
      }),
      depositPaid: normalizedDepositPaid,
      id: `appt-${Date.now()}`,
      status: "Scheduled",
    };
    try {
      const apptRef = doc(
        db,
        "appointments",
        userEmail,
        "userAppointments",
        createdAppointment.id
      );
      // Remove undefined fields before saving to Firestore
      const appointmentToSave = Object.fromEntries(
        Object.entries({
          ...createdAppointment,
          appointmentDate: createdAppointment.appointmentDate.toISOString(),
        }).filter(([_, v]) => v !== undefined)
      );

      await setDoc(apptRef, appointmentToSave);
      setAppointments((prev) => [createdAppointment, ...prev]);

      // Optionally update customer contact info in Firestore
      if (createdAppointment.contactNumber) {
        const custRef = doc(
          db,
          "customers",
          userEmail,
          "contactNumbers",
          createdAppointment.contactNumber
        );
        await setDoc(
          custRef,
          {
            customerName: createdAppointment.customerName,
            customerEmail: createdAppointment.customerEmail,
          },
          { merge: true }
        );
        await fetchCustomers(userEmail);
      }

      setNewAppointment({
        customerName: "",
        contactNumber: "",
        customerEmail: "",
        appointmentDate: new Date(),
        appointmentTime: "",
        serviceType: "",
        itemDetails: "",
        depositPaid: undefined,
        notes: "",
      });
      setCurrentContactCommandInputValue("");
      setTimeSearchInput("");
      toast({
        title: "Appointment Booked",
        description: `Appointment for ${
          createdAppointment.customerName
        } on ${format(createdAppointment.appointmentDate, "PPP")} at ${
          createdAppointment.appointmentTime
        } has been booked.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add appointment.",
        variant: "destructive",
      });
      setFormLoading(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setIsEditing(appointment.id);
    setEditForm({ ...appointment });
    setTimeSearchInput(appointment.appointmentTime);
    setCurrentContactCommandInputValue(appointment.contactNumber);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    if (!editForm) return;
    const {
      customerName,
      contactNumber,
      appointmentDate,
      appointmentTime,
      serviceType,
    } = editForm;
    if (
      !customerName ||
      !contactNumber ||
      !appointmentDate ||
      !appointmentTime ||
      !serviceType
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields for editing.",
        variant: "destructive",
      });
      setFormLoading(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      setFormLoading(false);
      return;
    }
    const userEmail = user.email || "unknown_user";
    try {
      const apptRef = doc(
        db,
        "appointments",
        userEmail,
        "userAppointments",
        editForm.id
      );
      await updateDoc(apptRef, {
        ...editForm,
        appointmentDate: editForm.appointmentDate.toISOString(),
      });
      setAppointments((prev) =>
        prev.map((app) => (app.id === editForm.id ? editForm : app))
      );
      // Optionally update customer contact info in Firestore
      if (editForm.contactNumber) {
        const custRef = doc(
          db,
          "customers",
          userEmail,
          "contactNumbers",
          editForm.contactNumber
        );
        await setDoc(
          custRef,
          {
            customerName: editForm.customerName,
            customerEmail: editForm.customerEmail,
          },
          { merge: true }
        );
        await fetchCustomers(userEmail);
      }
      toast({
        title: "Appointment Updated",
        description: `Appointment for ${editForm.customerName} has been updated.`,
      });
      setIsEditing(null);
      setEditForm(null);
      setNewAppointment({
        customerName: "",
        contactNumber: "",
        customerEmail: "",
        appointmentDate: new Date(),
        appointmentTime: "",
        serviceType: "",
        itemDetails: "",
        depositPaid: undefined,
        notes: "",
      });
      setCurrentContactCommandInputValue("");
      setTimeSearchInput("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appointment.",
        variant: "destructive",
      });
      setFormLoading(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      return;
    }
    const userEmail = user.email || "unknown_user";
    try {
      const apptRef = doc(
        db,
        "appointments",
        userEmail,
        "userAppointments",
        appointmentId
      );
      await deleteDoc(apptRef);
      const apptToDelete = appointments.find((app) => app.id === appointmentId);
      setAppointments((prev) => prev.filter((app) => app.id !== appointmentId));
      toast({
        title: "Appointment Cancelled/Deleted",
        description: `Appointment for ${apptToDelete?.customerName} removed.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete appointment.",
        variant: "destructive",
      });
    }
  };

  const fetchShopDetails = async (userEmail: string) => {
    try {
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data(); // Returns shop details
      } else {
        console.error("No shop details found for this user.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching shop details:", error);
      return null;
    }
  };

  const handlePrintAppointment = async (appointment: Appointment) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Error",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      return;
    }

    const userEmail = user.email || "unknown_user";
    const shopDetails = await fetchShopDetails(userEmail);

    if (!shopDetails) {
      toast({
        title: "Error",
        description: "Failed to fetch shop details.",
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Appointment Details - ${appointment.customerName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .appointment-box { max-width: 700px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0 0 10px 0; font-size: 28px; color: #333; }
              .header p { margin: 2px 0; font-size: 14px; color: #555; }
              .details-section { margin-bottom: 30px; }
              .details-section h2 { font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .details-section p { margin: 0 0 8px 0; font-size: 14px; }
              .details-section strong { display: inline-block; width: 150px; }
              .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
              @media print {
                body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .appointment-box { box-shadow: none; border: none; margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="appointment-box">
              <div class="header">
                <h1>${shopDetails.shopName}</h1>
              <p>${shopDetails.address}</p>
              <p>Phone: ${shopDetails.phoneNumber} | Email: ${
        shopDetails.email
      }</p>
                <h2>Appointment Confirmation</h2>
              </div>

              <div class="details-section">
                <p><strong>Customer Name:</strong> ${
                  appointment.customerName
                }</p>
                <p><strong>Contact Number:</strong> ${
                  appointment.contactNumber
                }</p>
                ${
                  appointment.customerEmail
                    ? `<p><strong>Email:</strong> ${appointment.customerEmail}</p>`
                    : ""
                }
                <p><strong>Date:</strong> ${format(
                  appointment.appointmentDate,
                  "PPP"
                )}</p>
                <p><strong>Time:</strong> ${appointment.appointmentTime}</p>
                <p><strong>Service Type:</strong> ${appointment.serviceType}</p>
                ${
                  appointment.itemDetails
                    ? `<p><strong>Item Details:</strong> ${appointment.itemDetails}</p>`
                    : ""
                }
                ${
                  appointment.depositPaid !== undefined
                    ? `<p><strong>Deposit Paid:</strong> $${appointment.depositPaid.toFixed(
                        2
                      )}</p>`
                    : ""
                }
                ${
                  appointment.notes
                    ? `<p><strong>Notes:</strong> ${appointment.notes}</p>`
                    : ""
                }
                <p><strong>Status:</strong> ${appointment.status}</p>
              </div>

              <div class="footer">
                <p>Please arrive 10 minutes before your scheduled time.</p>
                <p class="no-print" style="margin-top: 20px;"><button onclick="window.print();">Print this page</button> or close this window.</p>
              </div>
            </div>
            <script>
              setTimeout(() => {
                window.print();
              }, 250);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast({
        title: "Print Error",
        description:
          "Could not open print window. Please check your browser's pop-up settings.",
        variant: "destructive",
      });
    }
  };

  const currentForm = isEditing && editForm ? editForm : newAppointment;
  const currentHandler = isEditing ? handleSaveEdit : handleAddAppointment;
  const currentButtonText = isEditing ? "Save Changes" : "Book Appointment";

  const filteredAppointments = useMemo(() => {
    // Helper to convert "hh:mm AM/PM" to hours and minutes
    const parseTime = (timeStr: string) => {
      if (!timeStr) return { hour: 0, min: 0 };
      const [time, meridian] = timeStr.split(" ");
      const [hourStr, minStr] = time.split(":");
      let hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);
      if (meridian === "PM" && hour !== 12) hour += 12;
      if (meridian === "AM" && hour === 12) hour = 0;
      return { hour, min };
    };

    let apps = [...appointments];

    // Sort by combined date and time
    apps.sort((a, b) => {
      const dateA = a.appointmentDate
        ? new Date(a.appointmentDate)
        : new Date(0);
      const dateB = b.appointmentDate
        ? new Date(b.appointmentDate)
        : new Date(0);

      // Add time to date
      const { hour: hourA, min: minA } = parseTime(a.appointmentTime);
      const { hour: hourB, min: minB } = parseTime(b.appointmentTime);

      dateA.setHours(hourA, minA, 0, 0);
      dateB.setHours(hourB, minB, 0, 0);

      return dateA.getTime() - dateB.getTime();
    });

    if (searchTerm) {
      apps = apps.filter(
        (appt) =>
          appt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (appt.contactNumber &&
            appt.contactNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (filterDate) {
        apps = apps.filter(
          (appt) =>
            appt.appointmentDate && isSameDay(appt.appointmentDate, filterDate)
        );
      }
    } else {
      if (filterDate) {
        apps = apps.filter(
          (appt) =>
            appt.appointmentDate && isSameDay(appt.appointmentDate, filterDate)
        );
      } else {
        const today = new Date();
        apps = apps.filter(
          (appt) =>
            appt.appointmentDate && isSameDay(appt.appointmentDate, today)
        );
      }
    }
    return apps;
  }, [appointments, filterDate, searchTerm]);

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    setIsDeleting(true);
    await handleDeleteAppointment(appointmentToDelete.id);
    setIsDeleting(false);
    setIsConfirmModalOpen(false);
    setAppointmentToDelete(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Appointment" : "Book New Appointment"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? `Update details for ${editForm?.customerName}'s appointment.`
                : "Fill in the details to schedule a new appointment."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={currentHandler}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customerName"
                      name="customerName"
                      value={currentForm.customerName}
                      onChange={handleInputChange}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contactNumberCombobox">
                    Contact Number *
                  </Label>
                  <Popover
                    open={contactPopoverOpen}
                    onOpenChange={(isOpen) => {
                      setContactPopoverOpen(isOpen);
                      if (isOpen) {
                        setCurrentContactCommandInputValue(
                          currentForm.contactNumber
                        );
                      } else {
                        const oldCommittedContactNumber =
                          currentForm.contactNumber;
                        const isTypedValueAKnownContact = customers.some(
                          (c) =>
                            c.contactNumber === currentContactCommandInputValue
                        );

                        if (
                          currentContactCommandInputValue &&
                          !isTypedValueAKnownContact &&
                          currentContactCommandInputValue !==
                            oldCommittedContactNumber
                        ) {
                          handleContactChange(
                            "contactNumber",
                            currentContactCommandInputValue
                          );
                          if (
                            customers.find(
                              (c) =>
                                c.contactNumber === oldCommittedContactNumber
                            )
                          ) {
                            handleContactChange("customerName", "");
                            handleContactChange("customerEmail", "");
                          }
                        } else if (
                          !currentContactCommandInputValue &&
                          oldCommittedContactNumber
                        ) {
                          handleContactChange("contactNumber", "");
                          handleContactChange("customerName", "");
                          handleContactChange("customerEmail", "");
                        }
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={contactPopoverOpen}
                        id="contactNumberCombobox"
                        className="w-full justify-between mt-1"
                      >
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {currentForm.contactNumber ||
                            "Search or enter contact..."}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search by phone or name..."
                          value={currentContactCommandInputValue}
                          onValueChange={setCurrentContactCommandInputValue}
                        />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {customers
                              .filter(
                                (customer) =>
                                  customer.contactNumber.includes(
                                    currentContactCommandInputValue
                                  ) ||
                                  customer.customerName
                                    .toLowerCase()
                                    .includes(
                                      currentContactCommandInputValue.toLowerCase()
                                    )
                              )
                              .map((customer) => (
                                <CommandItem
                                  key={customer.contactNumber}
                                  value={`${customer.contactNumber} ${customer.customerName}`}
                                  onSelect={() =>
                                    handleSelectAppointmentCustomer(customer)
                                  }
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentForm.contactNumber ===
                                        customer.contactNumber
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <div>{customer.customerName}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {customer.contactNumber}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="customerEmail"
                      name="customerEmail"
                      type="email"
                      value={currentForm.customerEmail || ""}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="appointmentDate">Appointment Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !currentForm.appointmentDate &&
                            "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentForm.appointmentDate ? (
                          format(currentForm.appointmentDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={currentForm.appointmentDate}
                        onSelect={handleDateChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="appointmentTimeCombobox">
                    Appointment Time *
                  </Label>
                  <Popover
                    open={timePopoverOpen}
                    onOpenChange={setTimePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={timePopoverOpen}
                        id="appointmentTimeCombobox"
                        className="w-full justify-between mt-1"
                      >
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                          {currentForm.appointmentTime ||
                            "Select a time slot..."}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search time..."
                          value={timeSearchInput}
                          onValueChange={setTimeSearchInput}
                        />
                        <CommandEmpty>No time slot found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {timeSlots
                              .filter((slot) =>
                                slot
                                  .toLowerCase()
                                  .includes(timeSearchInput.toLowerCase())
                              )
                              .map((slot) => (
                                <CommandItem
                                  key={slot}
                                  value={slot}
                                  onSelect={() => handleTimeSelect(slot)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentForm.appointmentTime === slot
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {slot}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select
                    name="serviceType"
                    value={currentForm.serviceType}
                    onValueChange={handleServiceTypeSelectChange}
                    required
                  >
                    <SelectTrigger className="mt-1" id="serviceType">
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="itemDetails">
                    Item Details (e.g., Tire Size)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="itemDetails"
                      name="itemDetails"
                      value={currentForm.itemDetails || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Michelin 205/55R16"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="depositPaid">Deposit Paid ($)</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="depositPaid"
                      name="depositPaid"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentForm.depositPaid ?? ""}
                      onChange={handleInputChange}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <Label htmlFor="notes">Notes</Label>
                  <div className="relative mt-1">
                    <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="notes"
                      name="notes"
                      value={currentForm.notes || ""}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(null);
                    setEditForm(null);
                    setNewAppointment({
                      customerName: "",
                      contactNumber: "",
                      customerEmail: "",
                      appointmentDate: new Date(),
                      appointmentTime: "",
                      serviceType: "",
                      itemDetails: "",
                      depositPaid: undefined,
                      notes: "",
                    });
                    setCurrentContactCommandInputValue("");
                    setTimeSearchInput("");
                  }}
                >
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEditing ? "Saving..." : "Booking..."}
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" /> {currentButtonText}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Scheduled Appointments</CardTitle>
                <CardDescription>
                  Overview of appointments. Defaults to today. Use filters to
                  narrow results.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-auto justify-start text-left font-normal",
                        !filterDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDate ? (
                        format(filterDate, "PPP")
                      ) : (
                        <span>Filter by Date...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={setFilterDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {(filterDate || searchTerm) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFilterDate(undefined);
                          setSearchTerm("");
                        }}
                        aria-label="Clear all filters"
                      >
                        <FilterX className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear All Filters</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex justify-center items-center py-8">
                        <svg
                          className="animate-spin h-8 w-8 text-primary"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell>
                        <div>{appt.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {appt.contactNumber}
                        </div>
                        {appt.customerEmail && (
                          <div className="text-xs text-muted-foreground">
                            {appt.customerEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {appt.appointmentDate
                          ? format(appt.appointmentDate, "PP")
                          : "N/A"}{" "}
                        at {appt.appointmentTime}
                      </TableCell>
                      <TableCell>{appt.serviceType}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {appt.itemDetails || "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(appt.depositPaid || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={appt.status}
                          onValueChange={(newStatus) =>
                            handleStatusChange(
                              appt.id,
                              newStatus as Appointment["status"]
                            )
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 w-[130px]",
                              appt.status === "Scheduled" &&
                                "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
                              appt.status === "Completed" &&
                                "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700",
                              appt.status === "Cancelled" &&
                                "bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700"
                            )}
                          >
                            <SelectValue placeholder="Set status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAppointment(appt)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Appointment</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintAppointment(appt)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Print Appointment</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAppointmentToDelete(appt);
                                setIsConfirmModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Appointment</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {filteredAppointments.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">
                {!searchTerm && !filterDate
                  ? "No appointments scheduled for today."
                  : "No appointments found for the current filters."}
              </p>
            )}
          </CardContent>
        </Card>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 !mt-0">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-auto">
              <h2 className="text-lg font-bold">Confirm Deletion</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-bold">
                  {appointmentToDelete?.customerName}
                </span>
                's appointment? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setAppointmentToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteAppointment}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

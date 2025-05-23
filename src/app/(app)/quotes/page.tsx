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
  Trash2,
  User,
  Phone,
  Mail,
  Car,
  Check,
  ChevronsUpDown,
  FileText,
  CalendarDays,
  CalendarIcon,
  FilterX,
  Edit3,
  Printer,
  FileOutput,
  Loader2,
} from "lucide-react";
import type { QuoteItem, InventoryItem, Quote, SaleTransaction } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";

// Mock inventory for item selection (can be shared or a subset)
const mockInventory: InventoryItem[] = [
  {
    id: "tire001",
    name: "Performance Radial 205/55R16",
    stock: 50,
    costPrice: 75,
    retailPrice: 120,
    lowStockThreshold: 10,
    category: "Tires",
  },
  {
    id: "tire002",
    name: "All-Season Touring 195/65R15",
    stock: 8,
    costPrice: 60,
    retailPrice: 100,
    lowStockThreshold: 10,
    category: "Tires",
  },
  {
    id: "oil001",
    name: "Synthetic Oil 5W-30 (1 Qt)",
    stock: 100,
    costPrice: 5,
    retailPrice: 9,
    lowStockThreshold: 20,
    category: "Oil",
  },
  {
    id: "filter001",
    name: "Oil Filter XYZ",
    stock: 30,
    costPrice: 3,
    retailPrice: 7,
    lowStockThreshold: 15,
    category: "Filters",
  },
  {
    id: "service001",
    name: "Oil Change Service",
    stock: 999,
    costPrice: 15,
    retailPrice: 45,
    lowStockThreshold: 0,
    category: "Services",
  },
  {
    id: "service002",
    name: "Tire Rotation",
    stock: 999,
    costPrice: 5,
    retailPrice: 25,
    lowStockThreshold: 0,
    category: "Services",
  },
];

interface MockCustomer {
  contactNumber: string;
  customerName: string;
  customerEmail?: string;
  carModel?: string;
  vin?: string;
  odometer?: string;
  notes?: string;
}

const TAX_RATE_VALUE = 0.13; // 13% Tax

interface MockQuoteCustomer {
  contactNumber: string;
  customerName: string;
  customerEmail?: string;
  carModel?: string;
  notes?: string;
}

const mockQuoteCustomers: MockQuoteCustomer[] = [
  {
    contactNumber: "555-1234",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    carModel: "Honda Civic 2020",
    notes: "Needs new summer tires.",
  },
  {
    contactNumber: "555-5678",
    customerName: "Bob Johnson",
    customerEmail: "bob.j@work.com",
    carModel: "Toyota Corolla 2019",
    notes: "Interested in brake check.",
  },
  {
    contactNumber: "555-8765",
    customerName: "Carol Williams",
    customerEmail: "carol.w@service.com",
    carModel: "Ford F-150 2022",
    notes: "Quote for all-season tires.",
  },
];

export default function QuotesPage() {
  const { toast } = useToast();
  const [currentItem, setCurrentItem] = useState<{
    inventoryItemId: string;
    quantity: string;
  }>({ inventoryItemId: "", quantity: "1" });
  const [currentQuoteItems, setCurrentQuoteItems] = useState<QuoteItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [customers, setCustomers] = useState<MockCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [carModel, setCarModel] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedQuoteDate, setSelectedQuoteDate] = useState<Date | undefined>(
    undefined
  );

  const [openItemCombobox, setOpenItemCombobox] = useState(false);
  const [contactSearchPopoverOpen, setContactSearchPopoverOpen] =
    useState(false);
  const [currentCommandInputValue, setCurrentCommandInputValue] = useState("");
  const [applyTax, setApplyTax] = useState(true);

  const [customItemName, setCustomItemName] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState("1");
  const [customItemUnitPrice, setCustomItemUnitPrice] = useState("");
  const [customItemCostPrice, setCustomItemCostPrice] = useState(""); // For internal reference
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);

  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [userQuotes, setUserQuotes] = useState<Quote[]>([]);

  const [filterSessionQuotesDateRange, setFilterSessionQuotesDateRange] =
    useState<DateRange | undefined>(undefined);

  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const filteredQuotes = useMemo(() => {
    const { from, to } = filterSessionQuotesDateRange || {};
    if (!from && !to) return userQuotes;

    return userQuotes.filter((quote) => {
      // Convert Firestore timestamp to JavaScript Date
      const quoteDate =
        quote.quoteDate instanceof Date
          ? quote.quoteDate
          : (quote.quoteDate as Timestamp).toDate();

      let passesFrom = true;
      let passesTo = true;

      if (from) {
        passesFrom = quoteDate >= startOfDay(from);
      }
      if (to) {
        passesTo = quoteDate <= endOfDay(to);
      }
      return passesFrom && passesTo;
    });
  }, [userQuotes, filterSessionQuotesDateRange]);

  useEffect(() => {
    const newSubtotal = currentQuoteItems.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0
    );
    setSubtotal(newSubtotal);
    const currentActualTaxRate = applyTax ? TAX_RATE_VALUE : 0;
    const newTaxAmount = newSubtotal * currentActualTaxRate;
    setTaxAmount(newTaxAmount);
    setTotalAmount(newSubtotal + newTaxAmount);
  }, [currentQuoteItems, applyTax]);

  useEffect(() => {
    setSelectedQuoteDate(new Date());

    const initializeData = async () => {
      setLoading(true); // Start loading
      try {
        const user = auth.currentUser;
        if (!user) {
          setCustomers([]); // Clear customers if user is not authenticated
          toast({
            title: "Error",
            description: "User is not authenticated.",
            variant: "destructive",
          });
          return;
        }

        const userEmail = user.email || "unknown_user";

        // Fetch Quotes
        const quotesCollection = collection(
          db,
          "sales",
          userEmail,
          "userQuotes"
        );
        const quotesSnapshot = await getDocs(quotesCollection);
        const quotesData = quotesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Quote[];
        setUserQuotes(quotesData);
        // Fetch customers
        const customersCollection = collection(
          db,
          "customers",
          userEmail,
          "contactNumbers"
        );
        const customersSnapshot = await getDocs(customersCollection);
        const customerData = customersSnapshot.docs.map((doc) => ({
          contactNumber: doc.id,
          ...doc.data(),
        })) as MockCustomer[];
        setCustomers(customerData);

        // Set default sale date
        setSelectedQuoteDate(new Date());
      } catch (error) {
        console.error("Error initializing data:", error);
        toast({
          title: "Error",
          description: "Failed to initialize data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false); // Stop loading
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        initializeData();
      } else {
        setCustomers([]); // Clear customers if user is not authenticated
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);

  useEffect(() => {
    if (quoteToEdit) {
      setCustomerName(quoteToEdit.customerName || "N/A");
      setContactNumber(
        quoteToEdit?.contactNumber
          ? quoteToEdit.contactNumber === "N/A"
            ? ""
            : quoteToEdit.contactNumber
          : ""
      );
      setCustomerEmail(quoteToEdit.customerEmail || "N/A");
      setCarModel(quoteToEdit.carModel || "N/A");
      setNotes(quoteToEdit.notes || "N/A");
      setApplyTax(quoteToEdit.taxRateApplied === TAX_RATE_VALUE);
      setCurrentQuoteItems(quoteToEdit.items || []);
      setSubtotal(quoteToEdit.subtotal || 0);
      setTaxAmount(quoteToEdit.taxAmount || 0);
      setTotalAmount(quoteToEdit.totalAmount || 0);
      setSelectedQuoteDate(
        quoteToEdit.quoteDate instanceof Date
          ? quoteToEdit.quoteDate
          : (quoteToEdit.quoteDate as Timestamp).toDate()
      );
    }
  }, [quoteToEdit]);

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!currentItem.inventoryItemId || !currentItem.quantity) {
      toast({
        title: "Error",
        description: "Please select an item and quantity.",
        variant: "destructive",
      });
      return;
    }
    const selectedInventoryItem = mockInventory.find(
      (invItem) => invItem.id === currentItem.inventoryItemId
    );
    if (!selectedInventoryItem) {
      toast({
        title: "Error",
        description: "Selected item not found in inventory.",
        variant: "destructive",
      });
      return;
    }
    const quantity = parseInt(currentItem.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }
    const existingQuoteItemIndex = currentQuoteItems.findIndex(
      (item) => item.inventoryItemId === selectedInventoryItem.id
    );
    if (existingQuoteItemIndex > -1) {
      const updatedQuoteItems = [...currentQuoteItems];
      updatedQuoteItems[existingQuoteItemIndex].quantity += quantity;
      setCurrentQuoteItems(updatedQuoteItems);
    } else {
      const newQuoteItem: QuoteItem = {
        id: Date.now().toString(),
        inventoryItemId: selectedInventoryItem.id,
        name: selectedInventoryItem.name,
        quantity: quantity,
        unitPrice: selectedInventoryItem.retailPrice,
        costPrice: selectedInventoryItem.costPrice,
      };
      setCurrentQuoteItems((prevItems) => [...prevItems, newQuoteItem]);
    }
    setCurrentItem({ inventoryItemId: "", quantity: "1" });
  };

  const handleAddCustomItem = (e: FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim() || !customItemQuantity || !customItemUnitPrice) {
      toast({
        title: "Error",
        description: "Please provide name, quantity, and unit price.",
        variant: "destructive",
      });
      return;
    }
    const quantity = parseInt(customItemQuantity, 10);
    const unitPrice = parseFloat(customItemUnitPrice);
    const costPrice = customItemCostPrice ? parseFloat(customItemCostPrice) : 0;
    if (
      isNaN(quantity) ||
      quantity <= 0 ||
      isNaN(unitPrice) ||
      unitPrice < 0 ||
      isNaN(costPrice) ||
      costPrice < 0
    ) {
      toast({
        title: "Error",
        description:
          "Please enter valid numbers for quantity, unit price, and cost price.",
        variant: "destructive",
      });
      return;
    }
    const newCustomQuoteItem: QuoteItem = {
      id: `custom-${Date.now().toString()}`,
      name: customItemName.trim(),
      quantity: quantity,
      unitPrice: unitPrice,
      costPrice: costPrice,
    };
    setCurrentQuoteItems((prevItems) => [...prevItems, newCustomQuoteItem]);
    toast({
      title: "Custom Item Added",
      description: `${newCustomQuoteItem.name} added to quote.`,
    });
    setCustomItemName("");
    setCustomItemQuantity("1");
    setCustomItemUnitPrice("");
    setCustomItemCostPrice("");
    setShowCustomItemForm(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setCurrentQuoteItems((prevItems) =>
      prevItems.filter((item) => item.id !== itemId)
    );
  };

  const handleQuoteItemUpdate = (
    itemId: string,
    field: "quantity" | "unitPrice" | "itemTotal",
    value: string
  ) => {
    const updatedItems = [...currentQuoteItems];
    const itemIndex = updatedItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;
    const item = updatedItems[itemIndex];
    if (field === "quantity") {
      const newQuantity = parseInt(value, 10);
      item.quantity = isNaN(newQuantity) || newQuantity < 1 ? 1 : newQuantity;
    } else {
      if (value === "" || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
        // Allow temporary empty string for editing
      } else if (field === "unitPrice") {
        item.unitPrice = parseFloat(value);
      } else if (field === "itemTotal") {
        if (item.quantity > 0)
          item.unitPrice = parseFloat(value) / item.quantity;
        else item.unitPrice = parseFloat(value);
      }
    }
    setCurrentQuoteItems(updatedItems);
  };

  const handleQuoteItemInputBlur = (
    itemId: string,
    field: "unitPrice" | "itemTotal",
    value: string
  ) => {
    const updatedItems = [...currentQuoteItems];
    const itemIndex = updatedItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;
    const item = updatedItems[itemIndex];
    let numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) numericValue = 0;
    if (field === "unitPrice") item.unitPrice = numericValue;
    else if (field === "itemTotal") {
      if (item.quantity > 0) item.unitPrice = numericValue / item.quantity;
      else item.unitPrice = numericValue;
    }
    setCurrentQuoteItems(updatedItems);
  };

  const resetForm = () => {
    setCurrentQuoteItems([]);
    setCustomerName("");
    setContactNumber("");
    setCustomerEmail("");
    setCurrentCommandInputValue("");
    setCarModel("");
    setNotes("");
    setApplyTax(true);
    setCurrentItem({ inventoryItemId: "", quantity: "1" });
    setCustomItemName("");
    setCustomItemQuantity("1");
    setCustomItemUnitPrice("");
    setCustomItemCostPrice("");
    setShowCustomItemForm(false);
    setSelectedQuoteDate(new Date());
  };

  const handleSaveQuote = async () => {
    setIsSubmitting(true);
    try {
      if (currentQuoteItems.length === 0) {
        toast({
          title: "Error",
          description: "Cannot save an empty quote.",
          variant: "destructive",
        });
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      const userEmail = user.email || "unknown_user";

      const quoteId = quoteToEdit?.id || `QT-${Date.now()}`;
      const quoteData: Quote = {
        id: quoteId,
        items: currentQuoteItems,
        subtotal,
        taxAmount,
        totalAmount,
        quoteDate: selectedQuoteDate || new Date(),
        customerName: customerName.trim() || "N/A",
        contactNumber: contactNumber.trim() || "N/A",
        customerEmail: customerEmail.trim() || "N/A",
        carModel: carModel.trim() || "N/A",
        taxRateApplied: applyTax ? TAX_RATE_VALUE : 0,
        notes: notes.trim() || "N/A",
      };

      const quoteRef = doc(db, "sales", userEmail, "userQuotes", quoteId);
      await setDoc(quoteRef, quoteData);

      if (quoteToEdit) {
        setUserQuotes((prevQuotes) =>
          prevQuotes.map((q) => (q.id === quoteToEdit.id ? quoteData : q))
        );
      } else {
        setUserQuotes((prevQuotes) => [...prevQuotes, quoteData]);
      }

      // Only save customer details if contact number is provided and not "N/A"
      if (contactNumber && contactNumber !== "N/A") {
        const customerRef = doc(
          db,
          "customers",
          userEmail,
          "contactNumbers",
          contactNumber
        );

        const existingCustomer = customers.find(
          (customer) => customer.contactNumber === contactNumber
        );

        const updatedCustomer = {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          carModel: carModel.trim() || "",
          notes: notes.trim() || "",
        };

        if (existingCustomer) {
          // Update existing customer details
          await setDoc(customerRef, {
            ...existingCustomer,
            ...updatedCustomer,
          });

          // Update customers state
          setCustomers((prevCustomers) =>
            prevCustomers.map((customer) =>
              customer.contactNumber === contactNumber
                ? { ...customer, ...updatedCustomer }
                : customer
            )
          );
        } else {
          // Add new customer details
          await setDoc(customerRef, updatedCustomer);

          // Update customers state with the new customer
          setCustomers((prevCustomers) => [
            ...prevCustomers,
            { contactNumber, ...updatedCustomer },
          ]);
        }
      }

      if (quoteData) {
        setQuoteToEdit(null);
      }
      toast({
        title: "Quote Saved",
        description: `Quote ${quoteId} for ${
          quoteData.customerName || "N/A"
        } saved.`,
      });
      resetForm();
    } catch (error) {
      console.error("Error finalizing quote:", error);
      toast({
        title: "Error",
        description: "Failed to finalize quote.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSpecificQuote = (quoteToPrint: Quote) => {
    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quote ${quoteToPrint.id}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .quote-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { margin: 0 0 10px 0; font-size: 28px; color: #333; }
              .header p { margin: 2px 0; font-size: 14px; color: #555; }
              .details-section { display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap; }
              .details-section div { width: 48%; margin-bottom: 15px; }
              .details-section .full-width { width: 100%; }
              .details-section h2 { font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .details-section p { margin: 0 0 5px 0; font-size: 14px; white-space: pre-wrap; }
              .items-table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
              .items-table th, .items-table td { padding: 8px; border-bottom: 1px solid #ddd; }
              .items-table th { background-color: #f9f9f9; font-weight: bold; }
              .items-table .text-right { text-align: right; }
              .totals-table { width: 100%; margin-top: 20px; }
              .totals-table td { padding: 5px 0; }
              .totals-table .label { font-weight: bold; }
              .totals-table .text-right { text-align: right; }
              .grand-total { font-size: 1.2em; font-weight: bold; }
              .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
              @media print {
                body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .quote-box { box-shadow: none; border: none; margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="quote-box">
              <div class="header">
                <h1>TireSync</h1>
                <p>123 Performance Ave, Gearsville, ON M1S 2T3</p>
                <p>Phone: (555) 123-4567 | Email: service@tiresync.example</p>
                <h2>QUOTE</h2>
                <p>Quote #: ${quoteToPrint.id}</p>
                <p>Date: ${format(new Date(quoteToPrint.quoteDate), "PPP")}</p>
              </div>

              <div class="details-section">
                <div>
                  <h2>Quote For:</h2>
                  <p><strong>Name:</strong> ${
                    quoteToPrint.customerName || "N/A"
                  }</p>
                  <p><strong>Contact:</strong> ${
                    quoteToPrint.contactNumber || "N/A"
                  }</p>
                  ${
                    quoteToPrint.customerEmail
                      ? `<p><strong>Email:</strong> ${quoteToPrint.customerEmail}</p>`
                      : ""
                  }
                  ${
                    quoteToPrint.carModel
                      ? `<p><strong>Vehicle:</strong> ${quoteToPrint.carModel}</p>`
                      : ""
                  }
                </div>
              </div>

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item/Service</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${quoteToPrint.items
                    .map(
                      (item) => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                      <td class="text-right">$${(
                        item.unitPrice * item.quantity
                      ).toFixed(2)}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>

              <table class="totals-table">
                <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                <tr>
                  <td class="label">Subtotal:</td>
                  <td class="text-right">$${quoteToPrint.subtotal.toFixed(
                    2
                  )}</td>
                </tr>
                ${
                  quoteToPrint.taxRateApplied > 0 && quoteToPrint.taxAmount > 0
                    ? `
                <tr>
                  <td class="label">Tax (${(
                    quoteToPrint.taxRateApplied * 100
                  ).toFixed(0)}%):</td>
                  <td class="text-right">$${quoteToPrint.taxAmount.toFixed(
                    2
                  )}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td class="label grand-total">Grand Total:</td>
                  <td class="text-right grand-total">$${quoteToPrint.totalAmount.toFixed(
                    2
                  )}</td>
                </tr>
              </table>

              <div class="footer">
                <p>This quote is valid for 30 days. Prices are subject to change.</p>
                <p class="no-print" style="margin-top: 20px;"><button onclick="window.print();">Print this quote</button> or close this window.</p>
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

  const handleDeleteQuote = async () => {
    setIsDeleting(true);
    const userEmail = auth.currentUser?.email;
    if (!quoteToDelete || !userEmail) return;
    try {
      await deleteDoc(
        doc(db, "sales", userEmail, "userQuotes", quoteToDelete?.id)
      );
      setUserQuotes((prevQuotes) =>
        prevQuotes.filter((q) => q.id !== quoteToDelete?.id)
      );
      if (quoteToDelete.id === quoteToEdit?.id) {
        setQuoteToEdit(null);
        resetForm();
      }
      setQuoteToDelete(null);
      toast({
        title: "Quote Deleted",
        description: `Quote ${quoteToDelete?.id.substring(0, 10)}... for ${
          quoteToDelete?.customerName || "N/A"
        } has been removed.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting quote:", error);
      toast({
        title: "Error",
        description: "Failed to delete quote.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectContact = (selectedCustomer: MockQuoteCustomer) => {
    setContactNumber(selectedCustomer.contactNumber);
    setCurrentCommandInputValue(selectedCustomer.contactNumber);
    setCustomerName(selectedCustomer.customerName);
    setCustomerEmail(selectedCustomer.customerEmail || "");
    setCarModel(selectedCustomer.carModel || "");
    setNotes(selectedCustomer.notes || "");
    setContactSearchPopoverOpen(false);
    toast({
      title: "Customer Selected",
      description: "Customer details have been pre-filled.",
    });
  };

  const handleEditQuote = (quoteId: string) => {
    toast({
      title: "Not Implemented",
      description: `Editing quote ${quoteId.substring(
        0,
        10
      )}... functionality will be available soon.`,
    });
    console.log("Attempting to edit quote:", quoteId);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <CardTitle>
                  {quoteToEdit ? "Edit Quote" : "Create New Quote"}
                </CardTitle>
                <CardDescription>
                  Enter customer and vehicle information. Search or enter a
                  contact number to auto-fill details.
                </CardDescription>
              </div>

              {quoteToEdit && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuoteToEdit(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <Label htmlFor="contactNumberCombobox">Contact Number</Label>
                <Popover
                  open={contactSearchPopoverOpen}
                  onOpenChange={(isOpen) => {
                    setContactSearchPopoverOpen(isOpen);
                    if (isOpen) setCurrentCommandInputValue(contactNumber);
                    else {
                      const isKnown = mockQuoteCustomers.some(
                        (c) => c.contactNumber === currentCommandInputValue
                      );
                      if (
                        currentCommandInputValue &&
                        !isKnown &&
                        currentCommandInputValue !== contactNumber
                      ) {
                        setContactNumber(currentCommandInputValue);
                        if (
                          mockQuoteCustomers.find(
                            (c) => c.contactNumber === contactNumber
                          )
                        ) {
                          setCustomerName("");
                          setCustomerEmail("");
                          setCarModel("");
                          setNotes("");
                        }
                      } else if (!currentCommandInputValue && contactNumber) {
                        setContactNumber("");
                        setCustomerName("");
                        setCustomerEmail("");
                        setCarModel("");
                        setNotes("");
                      }
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between mt-1"
                    >
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                        {contactNumber || "Search or enter contact..."}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    {loading ? (
                      <div className="flex justify-center items-center py-4">
                        <svg
                          className="animate-spin h-6 w-6 text-primary"
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
                    ) : (
                      <Command>
                        <CommandInput
                          placeholder="Search by phone or name..."
                          value={currentCommandInputValue}
                          onValueChange={setCurrentCommandInputValue}
                        />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {customers
                              .filter(
                                (customer) =>
                                  customer.contactNumber.includes(
                                    currentCommandInputValue
                                  ) ||
                                  customer.customerName
                                    .toLowerCase()
                                    .includes(
                                      currentCommandInputValue.toLowerCase()
                                    )
                              )
                              .map((customer) => (
                                <CommandItem
                                  key={customer.contactNumber}
                                  value={`${customer.contactNumber} ${customer.customerName}`}
                                  onSelect={() => handleSelectContact(customer)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      contactNumber === customer.contactNumber
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
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-1"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="carModel">Car Model</Label>
                <Input
                  id="carModel"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Toyota Camry 2021"
                />
              </div>
              <div>
                <Label htmlFor="quoteDate">Quote Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !selectedQuoteDate && "text-muted-foreground"
                      )}
                      id="quoteDate"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {selectedQuoteDate ? (
                        format(selectedQuoteDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedQuoteDate}
                      onSelect={setSelectedQuoteDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <Label htmlFor="notes">Notes for Quote</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. Customer requires quote for winter tires..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote Items</CardTitle>
            <CardDescription>
              Add items from inventory or custom items to the quote.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={handleAddItem}
              className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end"
            >
              <div className="md:col-span-2">
                <Label htmlFor="inventoryItemIdCombobox">
                  Item/Service from Inventory
                </Label>
                <Popover
                  open={openItemCombobox}
                  onOpenChange={setOpenItemCombobox}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between mt-1"
                    >
                      {currentItem.inventoryItemId
                        ? mockInventory.find(
                            (item) => item.id === currentItem.inventoryItemId
                          )?.name
                        : "Select item..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search item..." />
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {mockInventory.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setCurrentItem((prev) => ({
                                  ...prev,
                                  inventoryItemId: item.id,
                                }));
                                setOpenItemCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentItem.inventoryItemId === item.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {item.name} ($ {item.retailPrice})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="md:self-end">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </form>
            <Separator />
            {!showCustomItemForm && (
              <div className="py-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomItemForm(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Custom
                  Item/Service
                </Button>
              </div>
            )}
            {showCustomItemForm && (
              <div className="py-4">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-medium">
                    Add Custom Item/Service Details
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomItemForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <form
                  onSubmit={handleAddCustomItem}
                  className="grid grid-cols-1 gap-4 md:grid-cols-6 items-end"
                >
                  <div className="md:col-span-2">
                    <Label htmlFor="customItemName">Item Name</Label>
                    <Input
                      id="customItemName"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="e.g. Special Labor"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customItemQuantity">Quantity</Label>
                    <Input
                      id="customItemQuantity"
                      type="number"
                      min="1"
                      value={customItemQuantity}
                      onChange={(e) => setCustomItemQuantity(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customItemCostPrice">Cost Price ($)</Label>
                    <Input
                      id="customItemCostPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={customItemCostPrice}
                      onChange={(e) => setCustomItemCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customItemUnitPrice">Unit Price ($)</Label>
                    <Input
                      id="customItemUnitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={customItemUnitPrice}
                      onChange={(e) => setCustomItemUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="md:self-end">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add This Custom Item
                  </Button>
                </form>
              </div>
            )}
            {currentQuoteItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-base font-medium">
                    Current Quote Items
                  </Label>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-[100px] text-right">
                          Qty
                        </TableHead>
                        <TableHead className="w-[120px] text-right">
                          Unit Price
                        </TableHead>
                        <TableHead className="w-[120px] text-right">
                          Item Total
                        </TableHead>
                        <TableHead className="w-[80px] text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentQuoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuoteItemUpdate(
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              value={item.unitPrice}
                              onBlur={(e) =>
                                handleQuoteItemInputBlur(
                                  item.id,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              onChange={(e) =>
                                handleQuoteItemUpdate(
                                  item.id,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              className="h-8 text-right"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              value={(item.unitPrice * item.quantity).toFixed(
                                2
                              )}
                              onBlur={(e) =>
                                handleQuoteItemInputBlur(
                                  item.id,
                                  "itemTotal",
                                  e.target.value
                                )
                              }
                              onChange={(e) =>
                                handleQuoteItemUpdate(
                                  item.id,
                                  "itemTotal",
                                  e.target.value
                                )
                              }
                              className="h-8 text-right"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Separator />
                <div>
                  <Label className="text-base font-medium">
                    Tax Setting for Quote
                  </Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      id="tax-toggle"
                      checked={applyTax}
                      onCheckedChange={setApplyTax}
                    />
                    <Label htmlFor="tax-toggle">
                      Apply {(TAX_RATE_VALUE * 100).toFixed(0)}% Tax to Quote
                    </Label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          {currentQuoteItems.length > 0 && (
            <CardFooter className="flex flex-col items-stretch space-y-4 p-6 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2">
              <div className="flex flex-col items-end space-y-1 sm:flex-grow sm:items-start">
                <div className="text-lg font-medium">
                  Subtotal: ${subtotal.toFixed(2)}
                </div>
                {applyTax && (
                  <div className="text-md text-muted-foreground">
                    Tax ({(TAX_RATE_VALUE * 100).toFixed(0)}%): $
                    {taxAmount.toFixed(2)}
                  </div>
                )}
                <div className="text-xl font-bold text-primary">
                  Grand Total: ${totalAmount.toFixed(2)}
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleSaveQuote}
                className="w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
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
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-5 w-5" /> Save Quote
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Recent Quotes This Session</CardTitle>
                <CardDescription>
                  Quotes created during this active session.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
                        !filterSessionQuotesDateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterSessionQuotesDateRange?.from ? (
                        filterSessionQuotesDateRange.to ? (
                          <>
                            {format(
                              filterSessionQuotesDateRange.from,
                              "LLL dd, y"
                            )}{" "}
                            -{" "}
                            {format(
                              filterSessionQuotesDateRange.to,
                              "LLL dd, y"
                            )}
                          </>
                        ) : (
                          format(filterSessionQuotesDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Filter by Date Range...</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filterSessionQuotesDateRange?.from}
                      selected={filterSessionQuotesDateRange}
                      onSelect={setFilterSessionQuotesDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                {(filterSessionQuotesDateRange?.from ||
                  filterSessionQuotesDateRange?.to) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setFilterSessionQuotesDateRange(undefined)
                        }
                        aria-label="Clear date filter"
                      >
                        <FilterX className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear Date Range Filter</p>
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
                  <TableHead>Quote ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <div className="flex justify-center items-center py-4">
                        <svg
                          className="animate-spin h-6 w-6 text-primary"
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
                  filteredQuotes?.map((quote) => (
                    <TableRows
                      key={quote.id}
                      quote={quote}
                      setQuoteToEdit={setQuoteToEdit}
                      handlePrintSpecificQuote={handlePrintSpecificQuote}
                      setQuoteToDelete={setQuoteToDelete}
                    />
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && filteredQuotes?.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">
                {filterSessionQuotesDateRange?.from ||
                filterSessionQuotesDateRange?.to
                  ? "No session quotes found for selected date range."
                  : "No quotes created this session."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <DeleteConfirmationDialog
        open={quoteToDelete !== null}
        onOpenChange={() => setQuoteToDelete(null)}
        handleDeleteQuote={handleDeleteQuote}
        isDeleting={isDeleting}
      />
    </TooltipProvider>
  );
}

const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  handleDeleteQuote,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: () => void;
  handleDeleteQuote: () => void;
  isDeleting: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Quote</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to delete this quote?
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDeleteQuote}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete"
            )}
          </Button>
          <Button variant="outline" onClick={onOpenChange}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TableRows = ({
  quote,
  setQuoteToEdit,
  handlePrintSpecificQuote,
  setQuoteToDelete,
}: {
  quote: Quote;
  setQuoteToEdit: (quote: Quote | null) => void;
  handlePrintSpecificQuote: (quote: Quote) => void;
  setQuoteToDelete: (quote: Quote | null) => void;
}) => {
  const [isConvertingToInvoice, setIsConvertingToInvoice] = useState(false);
  const { toast } = useToast();

  const handleConvertToInvoice = async (quote: Quote) => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    try {
      setIsConvertingToInvoice(true);
      const saleId = `sale-${Date.now()}`;
      const saleData = {
        id: saleId,
        items: quote.items,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        profit: 0,
        timestamp: quote.quoteDate || new Date(),
        customerName: quote.customerName || "N/A",
        contactNumber: quote.contactNumber || "N/A",
        customerEmail: quote.customerEmail || "N/A",
        carModel: quote.carModel || "N/A",
        vin: "N/A",
        odometer: "N/A",
        paymentMethod: "N/A",
        hstRate: quote.taxRateApplied,
        notes: quote.notes || "N/A",
        invoiceNumber: 0,
      };
      const saleRef = doc(db, "sales", userEmail, "userSales", saleId);
      await setDoc(saleRef, saleData);

      toast({
        title: "Success",
        description: "Quote converted to invoice successfully.",
      });
      console.log({ saleData });
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
      toast({
        title: "Error",
        description: "Failed to convert quote to invoice.",
        variant: "destructive",
      });
    } finally {
      setIsConvertingToInvoice(false);
    }
    // toast({
    //   title: "Not Implemented",
    //   description: `Converting quote ${quote.id.substring(
    //     0,
    //     10
    //   )}... to invoice will be available soon.`,
    // });
  };

  return (
    <TableRow key={quote.id}>
      <TableCell className="font-medium">
        {quote.id.substring(0, 10)}...
      </TableCell>
      <TableCell>
        {format(
          quote.quoteDate instanceof Date
            ? quote.quoteDate
            : (quote.quoteDate as Timestamp).toDate(),
          "PPP"
        )}
      </TableCell>
      <TableCell>
        <div>{quote.customerName || "N/A"}</div>
        {quote.contactNumber && (
          <div className="text-xs text-muted-foreground">
            {quote.contactNumber}
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {quote.items
          .map((item) => `${item.name} (x${item.quantity})`)
          .join(", ")}
      </TableCell>
      <TableCell className="max-w-[150px] truncate">
        {quote.notes || "N/A"}
      </TableCell>
      <TableCell className="text-right">
        ${quote.totalAmount.toFixed(2)}
      </TableCell>
      <TableCell className="text-center space-x-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setQuoteToEdit(null);
                setTimeout(() => setQuoteToEdit(quote), 0);
              }}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit Quote</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePrintSpecificQuote(quote)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Print Quote</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleConvertToInvoice(quote)}
              disabled={isConvertingToInvoice}
            >
              {isConvertingToInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileOutput className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Convert to Invoice</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setQuoteToDelete(quote);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete Quote</p>
          </TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

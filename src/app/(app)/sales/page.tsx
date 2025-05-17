"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect } from "react";
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
  DollarSign,
  User,
  Phone,
  Mail,
  Car,
  Check,
  ChevronsUpDown,
  CreditCard,
  Landmark,
  Printer,
  PencilLine,
  Fingerprint,
  Gauge,
  CalendarDays,
} from "lucide-react";
import type { SaleItem, InventoryItem, SaleTransaction } from "@/types";
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
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

// Mock inventory for item selection
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

const HST_RATE_VALUE = 0.13; // 13% HST

interface MockCustomer {
  contactNumber: string;
  customerName: string;
  customerEmail?: string;
  carModel?: string;
  vin?: string;
  odometer?: string;
  notes?: string;
}

const mockCustomers: MockCustomer[] = [
  {
    contactNumber: "555-1234",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    carModel: "Honda Civic 2020",
    vin: "1HGCMABC123",
    odometer: "120500km",
    notes: "Regular oil change. Prefers synthetic.",
  },
  {
    contactNumber: "555-5678",
    customerName: "Bob Johnson",
    customerEmail: "bob.j@work.com",
    carModel: "Toyota Corolla 2019",
    vin: "2T1BUDEF456",
    odometer: "85300mi",
    notes: "Check tire pressure before return.",
  },
  {
    contactNumber: "555-8765",
    customerName: "Carol Williams",
    customerEmail: "carol.w@service.com",
    carModel: "Ford F-150 2022",
    vin: "JH4CU5HJ8KC000000",
    odometer: "32000km",
    notes: "New customer, referred by John Doe.",
  },
  {
    contactNumber: "555-1111",
    customerName: "David Brown",
    customerEmail: "d.brown@email.org",
    carModel: "Mazda 3 2021",
    vin: "JM1BKGHJ789",
    odometer: "45000km",
    notes: "Wants a car wash if time permits.",
  },
];

export default function SalesPage() {
  const { toast } = useToast();
  const [currentItem, setCurrentItem] = useState<{
    inventoryItemId: string;
    quantity: string;
  }>({ inventoryItemId: "", quantity: "1" });
  const [currentSaleItems, setCurrentSaleItems] = useState<SaleItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [carModel, setCarModel] = useState("");
  const [vin, setVin] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSaleDate, setSelectedSaleDate] = useState<Date | undefined>(
    undefined
  );

  const [openItemCombobox, setOpenItemCombobox] = useState(false);
  const [contactSearchPopoverOpen, setContactSearchPopoverOpen] =
    useState(false);
  const [currentCommandInputValue, setCurrentCommandInputValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "">("");
  const [applyHst, setApplyHst] = useState(true);

  // State for custom item inputs
  const [customItemName, setCustomItemName] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState("1");
  const [customItemUnitPrice, setCustomItemUnitPrice] = useState("");
  const [customItemCostPrice, setCustomItemCostPrice] = useState("");
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<MockCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true); // Start loading
      try {
        const user = auth.currentUser;
        if (!user) {
          setInventory([]); // Clear inventory if user is not authenticated
          setCustomers([]); // Clear customers if user is not authenticated
          toast({
            title: "Error",
            description: "User is not authenticated.",
            variant: "destructive",
          });
          return;
        }

        const userEmail = user.email || "unknown_user";

        // Fetch inventory
        const inventoryCollection = collection(
          db,
          "inventory",
          userEmail,
          "userInventory"
        );
        const inventorySnapshot = await getDocs(inventoryCollection);
        const inventoryData = inventorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];
        setInventory(inventoryData);

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
        setSelectedSaleDate(new Date());
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
        setInventory([]); // Clear inventory if user is not authenticated
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
    const newSubtotal = currentSaleItems.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0
    );
    setSubtotal(newSubtotal);
    const currentActualHstRate = applyHst ? HST_RATE_VALUE : 0;
    const newTaxAmount = newSubtotal * currentActualHstRate;
    setTaxAmount(newTaxAmount);
    setTotalAmount(newSubtotal + newTaxAmount);
  }, [currentSaleItems, applyHst]);

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

    const selectedInventoryItem = inventory.find(
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

    const existingSaleItemIndex = currentSaleItems.findIndex(
      (item) => item.inventoryItemId === selectedInventoryItem.id
    );

    if (existingSaleItemIndex > -1) {
      const updatedSaleItems = [...currentSaleItems];
      updatedSaleItems[existingSaleItemIndex].quantity += quantity;
      setCurrentSaleItems(updatedSaleItems);
    } else {
      const newSaleItem: SaleItem = {
        id: Date.now().toString(),
        inventoryItemId: selectedInventoryItem.id,
        name: selectedInventoryItem.name,
        quantity: quantity,
        unitPrice: selectedInventoryItem.retailPrice,
        costPrice: selectedInventoryItem.costPrice,
      };
      setCurrentSaleItems((prevItems) => [...prevItems, newSaleItem]);
    }

    setCurrentItem({ inventoryItemId: "", quantity: "1" });
  };

  const handleAddCustomItem = (e: FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim() || !customItemQuantity || !customItemUnitPrice) {
      toast({
        title: "Error",
        description:
          "Please provide name, quantity, and unit price for the custom item.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(customItemQuantity, 10);
    const unitPrice = parseFloat(customItemUnitPrice);
    const costPrice = customItemCostPrice ? parseFloat(customItemCostPrice) : 0;

    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity for the custom item.",
        variant: "destructive",
      });
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid unit price for the custom item.",
        variant: "destructive",
      });
      return;
    }
    if (isNaN(costPrice) || costPrice < 0) {
      toast({
        title: "Error",
        description:
          "Please enter a valid cost price for the custom item or leave it empty for $0.",
        variant: "destructive",
      });
      return;
    }

    const newCustomSaleItem: SaleItem = {
      id: `custom-${Date.now().toString()}`,
      name: customItemName.trim(),
      quantity: quantity,
      unitPrice: unitPrice,
      costPrice: costPrice,
    };

    setCurrentSaleItems((prevItems) => [...prevItems, newCustomSaleItem]);
    toast({
      title: "Custom Item Added",
      description: `${newCustomSaleItem.name} added to sale.`,
    });

    setCustomItemName("");
    setCustomItemQuantity("1");
    setCustomItemUnitPrice("");
    setCustomItemCostPrice("");
    setShowCustomItemForm(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setCurrentSaleItems((prevItems) =>
      prevItems.filter((item) => item.id !== itemId)
    );
  };

  const handleAddItemFormQuantityChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setCurrentItem((prev) => ({ ...prev, quantity: e.target.value }));
  };

  const handleSaleItemUpdate = (
    itemId: string,
    field: "quantity" | "unitPrice" | "itemTotal",
    value: string
  ) => {
    const updatedSaleItems = [...currentSaleItems];
    const itemIndex = updatedSaleItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const item = updatedSaleItems[itemIndex];
    let numericValue = parseFloat(value);

    if (field === "quantity") {
      const newQuantity = parseInt(value, 10);
      item.quantity = isNaN(newQuantity) || newQuantity < 1 ? 1 : newQuantity;
    } else {
      if (value === "" || isNaN(numericValue) || numericValue < 0) {
        // Allow temporary empty string for editing, will be caught by onBlur or parseFloat logic later
        // For calculations, treat invalid/negative as 0 if not an intermediate empty string.
        numericValue =
          value === ""
            ? field === "unitPrice"
              ? item.unitPrice
              : item.unitPrice * item.quantity
            : 0;
      }

      if (field === "unitPrice") {
        item.unitPrice =
          value === ""
            ? item.unitPrice
            : isNaN(parseFloat(value)) || parseFloat(value) < 0
            ? 0
            : parseFloat(value);
      } else if (field === "itemTotal") {
        const totalVal = parseFloat(value);
        if (!isNaN(totalVal) && totalVal >= 0) {
          if (item.quantity > 0) {
            item.unitPrice = totalVal / item.quantity;
          } else {
            item.unitPrice = totalVal; // If qty is 0, set unit price to total (could be 0)
          }
        } else if (value === "") {
          // If empty string, don't change unit price immediately, let onBlur handle it.
        } else {
          item.unitPrice = 0; // Invalid input
        }
      }
    }
    setCurrentSaleItems(updatedSaleItems);
  };

  const handleSaleItemInputBlur = (
    itemId: string,
    field: "unitPrice" | "itemTotal",
    value: string
  ) => {
    const updatedSaleItems = [...currentSaleItems];
    const itemIndex = updatedSaleItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const item = updatedSaleItems[itemIndex];
    let numericValue = parseFloat(value);

    if (isNaN(numericValue) || numericValue < 0) {
      numericValue = 0; // Default to 0 if input is invalid or negative
    }

    if (field === "unitPrice") {
      item.unitPrice = numericValue;
    } else if (field === "itemTotal") {
      if (item.quantity > 0) {
        item.unitPrice = numericValue / item.quantity;
      } else {
        item.unitPrice = numericValue; // if quantity is 0, unit price becomes the total
      }
    }
    setCurrentSaleItems(updatedSaleItems);
  };

  const handleFinalizeSale = async () => {
    if (currentSaleItems.length === 0) {
      toast({
        title: "Error",
        description: "Cannot finalize an empty sale. Add items first.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    const finalizedProfit = currentSaleItems.reduce(
      (acc, item) => acc + (item.unitPrice - item.costPrice) * item.quantity,
      0
    );
    const currentActualHstRate = applyHst ? HST_RATE_VALUE : 0;

    const saleData: Partial<SaleTransaction> = {
      items: currentSaleItems,
      subtotal,
      taxAmount,
      totalAmount,
      profit: finalizedProfit,
      timestamp: selectedSaleDate || new Date(),
      customerName: customerName.trim() || "N/A",
      contactNumber: contactNumber.trim() || "N/A",
      customerEmail: customerEmail.trim() || "N/A",
      carModel: carModel.trim() || "N/A",
      vin: vin.trim() || "N/A",
      odometer: odometer.trim() || "N/A",
      paymentMethod,
      hstRate: currentActualHstRate,
      notes: notes.trim() || "N/A",
    };

    // Remove fields with null values
    const sanitizedSaleData = Object.fromEntries(
      Object.entries(saleData).filter(([_, value]) => value !== null)
    );

    setIsLoading(true); // Start loading

    console.log("Finalizing sale:", {
      ...saleData,
      id: `sale-${Date.now()}`,
    });

    try {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const userEmail = user.email || "unknown_user";

      // Save sale data to Firestore
      const saleId = `sale-${Date.now()}`;
      const saleRef = doc(db, "sales", userEmail, "userSales", saleId);
      await setDoc(saleRef, sanitizedSaleData);

      // Save or update customer details in Firestore
      if (contactNumber) {
        const customerRef = doc(
          db,
          "customers",
          userEmail, // User's email
          "contactNumbers", // Subcollection for contact numbers
          contactNumber // Document ID
        );

        const existingCustomer = customers.find(
          (customer) => customer.contactNumber === contactNumber
        );

        const updatedCustomer = {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          carModel: carModel.trim() || "",
          vin: vin.trim() || "",
          notes: notes.trim() || "",
          odometer: odometer.trim() || "",
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

      toast({
        title: "Sale Finalized",
        description: `Total: $${totalAmount.toFixed(2)} for ${
          saleData.customerName || "N/A"
        }`,
      });

      setCurrentSaleItems([]);
      setCustomerName("");
      setContactNumber("");
      setCustomerEmail("");
      setCurrentCommandInputValue("");
      setCarModel("");
      setVin("");
      setOdometer("");
      setPaymentMethod("");
      setApplyHst(true);
      setCurrentItem({ inventoryItemId: "", quantity: "1" });
      setCustomItemName("");
      setCustomItemQuantity("1");
      setCustomItemUnitPrice("");
      setCustomItemCostPrice("");
      setShowCustomItemForm(false);
      setSelectedSaleDate(new Date());
      // notes state is intentionally not cleared
    } catch (error) {
      console.error("Error finalizing sale:", error);
      toast({
        title: "Error",
        description: "Failed to finalize sale.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading
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

  const handlePrintInvoice = async () => {
    if (currentSaleItems.length === 0) {
      toast({
        title: "Cannot Print",
        description: "Add items to the sale first.",
        variant: "destructive",
      });
      return;
    }
    if (!paymentMethod) {
      toast({
        title: "Cannot Print",
        description: "Please select a payment method before printing.",
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

    const invoiceNumber = `INV-${Date.now()}`;
    const saleDataForPrint = {
      items: currentSaleItems,
      subtotal,
      taxAmount,
      totalAmount,
      customerName: customerName || "N/A",
      contactNumber: contactNumber || "N/A",
      customerEmail: customerEmail || "N/A",
      carModel: carModel || "N/A",
      vin: vin || "N/A",
      odometer: odometer || "N/A",
      paymentMethodDisplay: paymentMethod
        ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
        : "N/A",
      hstRate: applyHst ? HST_RATE_VALUE : 0,
      timestamp: selectedSaleDate || new Date(),
      invoiceNumber: invoiceNumber,
      shopName: shopDetails.shopName,
      shopAddress: shopDetails.address,
      shopPhoneNumber: shopDetails.phoneNumber,
      shopEmail: shopDetails.email,
    };

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice ${saleDataForPrint.invoiceNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
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
                .invoice-box { box-shadow: none; border: none; margin: 0; padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="header">
                <h1>${saleDataForPrint.shopName}</h1>
              <p>${saleDataForPrint.shopAddress}</p>
              <p>Phone: ${saleDataForPrint.shopPhoneNumber} | Email: ${
        saleDataForPrint.shopEmail
      }</p>
              <p>Invoice #: ${saleDataForPrint.invoiceNumber}</p>
                <p>Invoice Date: ${format(
                  saleDataForPrint.timestamp,
                  "PPP"
                )}</p>
              </div>

              <div class="details-section">
                <div>
                  <h2>Bill To:</h2>
                  <p><strong>Name:</strong> ${saleDataForPrint.customerName}</p>
                  <p><strong>Contact:</strong> ${
                    saleDataForPrint.contactNumber
                  }</p>
                  ${
                    saleDataForPrint.customerEmail &&
                    saleDataForPrint.customerEmail !== "N/A"
                      ? `<p><strong>Email:</strong> ${saleDataForPrint.customerEmail}</p>`
                      : ""
                  }
                  ${
                    saleDataForPrint.carModel &&
                    saleDataForPrint.carModel !== "N/A"
                      ? `<p><strong>Vehicle:</strong> ${saleDataForPrint.carModel}</p>`
                      : ""
                  }
                  ${
                    saleDataForPrint.vin && saleDataForPrint.vin !== "N/A"
                      ? `<p><strong>VIN:</strong> ${saleDataForPrint.vin}</p>`
                      : ""
                  }
                  ${
                    saleDataForPrint.odometer &&
                    saleDataForPrint.odometer !== "N/A"
                      ? `<p><strong>Odometer:</strong> ${saleDataForPrint.odometer}</p>`
                      : ""
                  }
                </div>
                <div>
                  <h2>Payment Details:</h2>
                  <p><strong>Payment Method:</strong> ${
                    saleDataForPrint.paymentMethodDisplay
                  }</p>
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
                  ${saleDataForPrint.items
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
                  <td class="text-right">$${saleDataForPrint.subtotal.toFixed(
                    2
                  )}</td>
                </tr>
                ${
                  saleDataForPrint.hstRate > 0
                    ? `
                <tr>
                  <td class="label">Tax (${(
                    saleDataForPrint.hstRate * 100
                  ).toFixed(0)}%):</td>
                  <td class="text-right">$${saleDataForPrint.taxAmount.toFixed(
                    2
                  )}</td>
                </tr>
                `
                    : ""
                }
                <tr>
                  <td class="label grand-total">Grand Total:</td>
                  <td class="text-right grand-total">$${saleDataForPrint.totalAmount.toFixed(
                    2
                  )}</td>
                </tr>
              </table>

              <div class="footer">
                <p>Thank you for your business!</p>
                <p class="no-print" style="margin-top: 20px;"><button onclick="window.print();">Print this invoice</button> or close this window.</p>
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

  const handleSelectContact = (selectedCustomer: MockCustomer) => {
    setContactNumber(selectedCustomer.contactNumber);
    setCurrentCommandInputValue(selectedCustomer.contactNumber);
    setCustomerName(selectedCustomer.customerName);
    setCustomerEmail(selectedCustomer.customerEmail || "");
    setCarModel(selectedCustomer.carModel || "");
    setVin(selectedCustomer.vin || "");
    setOdometer(selectedCustomer.odometer || "");
    setNotes(selectedCustomer.notes || "");
    setContactSearchPopoverOpen(false);
    toast({
      title: "Customer Selected",
      description: "Customer details have been pre-filled.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer & Vehicle Details</CardTitle>
          <CardDescription>
            Enter customer and vehicle information. Search or enter a contact
            number to auto-fill details for existing customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customerName"
                  name="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contactNumberCombobox">Contact Number</Label>
              <Popover
                open={contactSearchPopoverOpen}
                onOpenChange={(isOpen) => {
                  setContactSearchPopoverOpen(isOpen);
                  if (isOpen) {
                    setCurrentCommandInputValue(contactNumber);
                  } else {
                    const oldCommittedContactNumber = contactNumber;
                    const isTypedValueAKnownContact = customers.some(
                      (c) => c.contactNumber === currentCommandInputValue
                    );

                    if (
                      currentCommandInputValue &&
                      !isTypedValueAKnownContact &&
                      currentCommandInputValue !== oldCommittedContactNumber
                    ) {
                      setContactNumber(currentCommandInputValue);
                      const previousCustomerAutoFilled = customers.find(
                        (c) => c.contactNumber === oldCommittedContactNumber
                      );
                      if (previousCustomerAutoFilled) {
                        setCustomerName("");
                        setCustomerEmail("");
                        setCarModel("");
                        setVin("");
                        setOdometer("");
                        setNotes("");
                      }
                    } else if (
                      !currentCommandInputValue &&
                      oldCommittedContactNumber
                    ) {
                      setContactNumber("");
                      setCustomerName("");
                      setCustomerEmail("");
                      setCarModel("");
                      setVin("");
                      setOdometer("");
                      setNotes("");
                    }
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactSearchPopoverOpen}
                    id="contactNumberCombobox"
                    className="w-full justify-between mt-1"
                  >
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
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
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="carModel">Car Model</Label>
              <div className="relative mt-1">
                <Car className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="carModel"
                  name="carModel"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. Toyota Camry 2021"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vin">VIN</Label>
              <div className="relative mt-1">
                <Fingerprint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vin"
                  name="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. 1HGCM82P3V******"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="odometer">Odometer</Label>
              <div className="relative mt-1">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="odometer"
                  name="odometer"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. 120000 km"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="transactionDate">Transaction Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !selectedSaleDate && "text-muted-foreground"
                    )}
                    id="transactionDate"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedSaleDate ? (
                      format(selectedSaleDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedSaleDate}
                    onSelect={setSelectedSaleDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <div className="relative mt-1">
                <PencilLine className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="pl-10"
                  placeholder="e.g. Customer requested synthetic oil, check tire pressure..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sale Transaction</CardTitle>
          <CardDescription>
            Add items, manage quantities, and set payment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Record Sale Items Form */}
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
                    aria-expanded={openItemCombobox}
                    id="inventoryItemIdCombobox"
                    className="w-full justify-between mt-1"
                  >
                    {currentItem.inventoryItemId
                      ? inventory.find(
                          (item) => item.id === currentItem.inventoryItemId
                        )?.name
                      : "Select item/service..."}
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
                      <CommandInput placeholder="Search item/service..." />
                      <CommandEmpty>No item found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {inventory.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={(currentValue) => {
                                const selectedInvItem = inventory.find(
                                  (inv) =>
                                    inv.name.toLowerCase() ===
                                    currentValue.toLowerCase()
                                );
                                if (selectedInvItem) {
                                  setCurrentItem((prev) => ({
                                    ...prev,
                                    inventoryItemId: selectedInvItem.id,
                                  }));
                                }
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
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={handleAddItemFormQuantityChange}
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
                <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Item/Service
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

          {currentSaleItems.length > 0 && (
            <>
              <Separator />
              {/* Current Sale Items Table */}
              <div>
                <Label className="text-base font-medium">
                  Current Sale Items
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
                    {currentSaleItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleSaleItemUpdate(
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
                              handleSaleItemInputBlur(
                                item.id,
                                "unitPrice",
                                e.target.value
                              )
                            }
                            onChange={(e) =>
                              handleSaleItemUpdate(
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
                            value={(item.unitPrice * item.quantity).toFixed(2)}
                            onBlur={(e) =>
                              handleSaleItemInputBlur(
                                item.id,
                                "itemTotal",
                                e.target.value
                              )
                            }
                            onChange={(e) =>
                              handleSaleItemUpdate(
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
              {/* Payment & Tax Details */}
              <div>
                <Label className="text-base font-medium">Payment & Tax</Label>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-2">
                  <div>
                    <Label className="mb-2 block">Payment Method *</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) =>
                        setPaymentMethod(value as "card" | "cash" | "")
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label
                          htmlFor="card"
                          className="flex items-center gap-2"
                        >
                          <CreditCard className="h-4 w-4" /> Card
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label
                          htmlFor="cash"
                          className="flex items-center gap-2"
                        >
                          <Landmark className="h-4 w-4" /> Cash
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="flex items-center space-x-2 self-end justify-self-start md:justify-self-end">
                    <Switch
                      id="hst-toggle"
                      checked={applyHst}
                      onCheckedChange={setApplyHst}
                    />
                    <Label htmlFor="hst-toggle">Apply 13% HST</Label>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>

        {currentSaleItems.length > 0 && (
          <CardFooter className="flex flex-col items-stretch space-y-4 p-6 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2">
            <div className="flex flex-col items-end space-y-1 sm:flex-grow sm:items-start">
              <div className="text-lg font-medium">
                Subtotal: ${subtotal.toFixed(2)}
              </div>
              <div className="text-md text-muted-foreground">
                Tax (${applyHst ? (HST_RATE_VALUE * 100).toFixed(0) : "0"}%): $
                {taxAmount.toFixed(2)}
              </div>
              <div className="text-xl font-bold text-primary">
                Grand Total: ${totalAmount.toFixed(2)}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintInvoice}
              disabled={currentSaleItems.length === 0 || !paymentMethod}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Printer className="mr-2 h-5 w-5" /> Print Invoice
            </Button>
            <Button
              size="lg"
              onClick={handleFinalizeSale}
              className="w-full sm:w-auto"
              disabled={isLoading} // Disable button while saving
            >
              {isLoading ? (
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
                  <DollarSign className="mr-2 h-5 w-5" /> Finalize Sale
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

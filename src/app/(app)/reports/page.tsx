"use client";

import { useState, useEffect, useMemo } from "react";
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
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CalendarIcon,
  FilterX,
  UserSearch,
  ChevronsUpDown,
  Check,
  Trash2,
  Printer,
} from "lucide-react";
import type { SaleTransaction } from "@/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// Mock sales data for demonstration
const mockSales: SaleTransaction[] = [
  {
    id: "sale001",
    timestamp: new Date("2024-05-01T10:30:00Z"),
    items: [
      {
        id: "si001",
        inventoryItemId: "tire001",
        name: "Performance Radial 205/55R16",
        quantity: 2,
        unitPrice: 120,
        costPrice: 75,
      },
      {
        id: "si002",
        inventoryItemId: "service001",
        name: "Oil Change Service",
        quantity: 1,
        unitPrice: 45,
        costPrice: 15,
      },
    ],
    subtotal: 2 * 120 + 45,
    taxAmount: (2 * 120 + 45) * 0.1,
    totalAmount: (2 * 120 + 45) * 1.1,
    profit: 2 * (120 - 75) + (45 - 15),
    customerName: "Alice Smith",
    contactNumber: "555-1234",
    customerEmail: "alice@example.com",
    carModel: "Honda Civic 2020",
    paymentMethod: "card",
    hstRate: 0.13,
  },
  {
    id: "sale002",
    timestamp: new Date("2024-05-01T14:15:00Z"),
    items: [
      {
        id: "si003",
        inventoryItemId: "oil001",
        name: "Synthetic Oil 5W-30 (1 Qt)",
        quantity: 5,
        unitPrice: 9,
        costPrice: 5,
      },
      {
        id: "si004",
        inventoryItemId: "filter001",
        name: "Oil Filter XYZ",
        quantity: 1,
        unitPrice: 7,
        costPrice: 3,
      },
    ],
    subtotal: 5 * 9 + 7,
    taxAmount: (5 * 9 + 7) * 0.1,
    totalAmount: (5 * 9 + 7) * 1.1,
    profit: 5 * (9 - 5) + (7 - 3),
    customerName: "Bob Johnson",
    contactNumber: "555-5678",
    customerEmail: "bob@example.com",
    carModel: "Toyota Corolla 2019",
    paymentMethod: "cash",
    hstRate: 0.13,
  },
  {
    id: "sale003",
    timestamp: new Date("2024-05-02T09:00:00Z"),
    items: [
      {
        id: "si005",
        inventoryItemId: "tire002",
        name: "All-Season Touring 195/65R15",
        quantity: 4,
        unitPrice: 100,
        costPrice: 60,
      },
    ],
    subtotal: 4 * 100,
    taxAmount: 4 * 100 * 0.1,
    totalAmount: 4 * 100 * 1.1,
    profit: 4 * (100 - 60),
    customerName: "Alice Smith", // Another sale for Alice
    contactNumber: "555-1234",
    customerEmail: "alice@example.com",
    carModel: "Honda Civic 2020",
    paymentMethod: "card",
    hstRate: 0.13,
  },
  {
    id: "sale004",
    timestamp: new Date("2024-04-15T11:00:00Z"),
    items: [
      {
        id: "si006",
        inventoryItemId: "service002",
        name: "Tire Rotation",
        quantity: 1,
        unitPrice: 25,
        costPrice: 5,
      },
    ],
    subtotal: 25,
    taxAmount: 2.5,
    totalAmount: 27.5,
    profit: 20,
    customerName: "Carol Williams",
    contactNumber: "555-8765",
    customerEmail: "carol@example.com",
    carModel: "Ford F-150 2022",
    paymentMethod: "cash",
    hstRate: 0, // No HST for this sale
  },
];

interface ReportCustomer {
  contactNumber: string;
  customerName: string;
}

const chartConfig = {
  profit: { label: "Profit", color: "hsl(var(--chart-1))" },
  revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
};

export default function ReportsPage() {
  const { toast } = useToast();
  const [salesData, setSalesData] = useState<SaleTransaction[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [customerSearchTerm, setCustomerSearchTerm] = useState(""); // Will store selected customer's contactNumber
  const [selectedCustomerDisplayName, setSelectedCustomerDisplayName] =
    useState("");
  const [customerSearchPopoverOpen, setCustomerSearchPopoverOpen] =
    useState(false);
  const [
    currentCustomerCommandInputValue,
    setCurrentCustomerCommandInputValue,
  ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<SaleTransaction | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchSalesData = async (userEmail: string) => {
      setIsLoading(true);
      try {
        const salesCollection = collection(db, "sales", userEmail, "userSales");
        const querySnapshot = await getDocs(salesCollection);

        const sales = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(), // Convert Firestore timestamp to JS Date
        })) as SaleTransaction[];

        setSalesData(sales);
      } catch (error) {
        console.error("Error fetching sales data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch sales data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = user.email || "unknown_user";
        fetchSalesData(userEmail);
      } else {
        setSalesData([]);
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const uniqueCustomers = useMemo(() => {
    const customersMap = new Map<string, ReportCustomer>();
    salesData.forEach((sale) => {
      if (sale.contactNumber && sale.customerName) {
        if (!customersMap.has(sale.contactNumber)) {
          customersMap.set(sale.contactNumber, {
            contactNumber: sale.contactNumber,
            customerName: sale.customerName,
          });
        }
      }
    });
    return Array.from(customersMap.values());
  }, [salesData]);

  const filteredSalesData = useMemo(() => {
    let intermediateFilteredSales = salesData;

    if (customerSearchTerm) {
      intermediateFilteredSales = intermediateFilteredSales.filter(
        (sale) => sale.contactNumber === customerSearchTerm
      );
    }

    const { from, to } = dateRange;
    if (from || to) {
      const startDate = from ? startOfDay(from) : null;
      const endDate = to ? endOfDay(to) : null;

      return intermediateFilteredSales.filter((sale) => {
        const saleTimestamp = sale.timestamp;
        if (startDate && saleTimestamp < startDate) return false;
        if (endDate && saleTimestamp > endDate) return false;
        return true;
      });
    }

    return intermediateFilteredSales;
  }, [salesData, dateRange, customerSearchTerm]);

  const totalRevenue = useMemo(
    () => filteredSalesData.reduce((acc, sale) => acc + sale.totalAmount, 0),
    [filteredSalesData]
  );
  const totalProfit = useMemo(
    () => filteredSalesData.reduce((acc, sale) => acc + sale.profit, 0),
    [filteredSalesData]
  );
  const averageProfitMargin = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  }, [totalProfit, totalRevenue]);
  const totalSalesCount = filteredSalesData.length;

  const salesByDay = useMemo(() => {
    const dailyData: {
      [key: string]: { date: string; revenue: number; profit: number };
    } = {};
    filteredSalesData.forEach((sale) => {
      const dateStr = sale.timestamp.toLocaleDateString("en-CA");
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
      }
      dailyData[dateStr].revenue += sale.totalAmount;
      dailyData[dateStr].profit += sale.profit;
    });
    return Object.values(dailyData).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredSalesData]);

  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setCustomerSearchTerm("");
    setSelectedCustomerDisplayName("");
    setCurrentCustomerCommandInputValue("");
  };

  const handleSelectCustomer = (customer: ReportCustomer) => {
    setCustomerSearchTerm(customer.contactNumber);
    setSelectedCustomerDisplayName(customer.customerName);
    setCurrentCustomerCommandInputValue(
      `${customer.customerName} (${customer.contactNumber})`
    );
    setCustomerSearchPopoverOpen(false);
  };

  const handleDeleteSale = (sale: SaleTransaction) => {
    setSaleToDelete(sale);
    setIsConfirmModalOpen(true); // Open the confirmation modal
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    setIsDeleting(true); // Start loading
    try {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      const userEmail = user.email || "unknown_user";
      const saleDocRef = doc(
        db,
        "sales",
        userEmail,
        "userSales",
        saleToDelete.id
      );

      // Delete the sale from Firestore
      await deleteDoc(saleDocRef);

      // Update local state
      setSalesData((prev) => prev.filter((s) => s.id !== saleToDelete.id));

      toast({
        title: "Sale Deleted",
        description: `Sale transaction ${saleToDelete.id.substring(
          0,
          8
        )}... has been deleted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({
        title: "Error",
        description: "Failed to delete the sale.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsConfirmModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const fetchShopDetails = async (userEmail: string) => {
    try {
      const userDocRef = doc(db, "users", userEmail);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch {
      return null;
    }
  };

  const handlePrintInvoice = async (sale: SaleTransaction) => {
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
          <title>Invoice ${sale.id}</title>
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
              <h1>${shopDetails.shopName}</h1>
              <p>${shopDetails.address}</p>
              <p>Phone: ${shopDetails.phoneNumber} | Email: ${
        shopDetails.email
      }</p>
              <p>Invoice #: ${sale.id}</p>
              <p>Date: ${
                sale.timestamp
                  ? new Date(sale.timestamp).toLocaleDateString()
                  : ""
              }</p>
            </div>
            <div class="details-section">
              <div>
                <h2>Bill To:</h2>
                <p><strong>Name:</strong> ${sale.customerName || "N/A"}</p>
                <p><strong>Contact:</strong> ${sale.contactNumber || "N/A"}</p>
                ${
                  sale.customerEmail
                    ? `<p><strong>Email:</strong> ${sale.customerEmail}</p>`
                    : ""
                }
                ${
                  sale.carModel
                    ? `<p><strong>Vehicle:</strong> ${sale.carModel}</p>`
                    : ""
                }
              </div>
              <div>
                <h2>Payment Details:</h2>
                <p><strong>Payment Method:</strong> ${
                  sale.paymentMethod
                    ? sale.paymentMethod.charAt(0).toUpperCase() +
                      sale.paymentMethod.slice(1)
                    : "N/A"
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
                ${sale.items
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
                <td class="text-right">$${sale.subtotal.toFixed(2)}</td>
              </tr>
              ${
                sale.hstRate && sale.hstRate > 0
                  ? `
              <tr>
                <td class="label">Tax (${(sale.hstRate * 100).toFixed(
                  0
                )}%):</td>
                <td class="text-right">$${sale.taxAmount.toFixed(2)}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td class="label grand-total">Grand Total:</td>
                <td class="text-right grand-total">$${sale.totalAmount.toFixed(
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

  return (
    <>
      <TooltipProvider>
        <div className="space-y-6">
          <CardHeader className="px-0">
            <CardTitle>Profit & Sales Reports</CardTitle>
            <CardDescription>
              Analyze your business performance. Select a date range or search
              by customer to filter results.
            </CardDescription>
          </CardHeader>

          <Card>
            <CardHeader>
              <CardTitle>Filter Reports</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        format(dateRange.from, "PPP")
                      ) : (
                        <span>Pick a start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) =>
                        setDateRange((prev) => ({
                          ...prev,
                          from: date || undefined,
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground hidden sm:inline">
                  -
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, "PPP")
                      ) : (
                        <span>Pick an end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) =>
                        setDateRange((prev) => ({
                          ...prev,
                          to: date || undefined,
                        }))
                      }
                      disabled={(date) =>
                        dateRange.from ? date < dateRange.from : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-grow">
                <Label
                  htmlFor="customerSearchCombobox"
                  className="block mb-1 text-sm font-medium"
                >
                  Search by Customer
                </Label>
                <Popover
                  open={customerSearchPopoverOpen}
                  onOpenChange={setCustomerSearchPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchPopoverOpen}
                      id="customerSearchCombobox"
                      className="w-full justify-between mt-1"
                    >
                      <div className="flex items-center">
                        <UserSearch className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {selectedCustomerDisplayName || "Select a customer..."}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search by name or phone..."
                        value={currentCustomerCommandInputValue}
                        onValueChange={(value) => {
                          setCurrentCustomerCommandInputValue(value);
                          // If user clears input, deselect customer
                          if (!value.trim()) {
                            setCustomerSearchTerm("");
                            setSelectedCustomerDisplayName("");
                          }
                        }}
                      />
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {uniqueCustomers
                            .filter(
                              (customer) =>
                                customer.contactNumber.includes(
                                  currentCustomerCommandInputValue
                                ) ||
                                customer.customerName
                                  .toLowerCase()
                                  .includes(
                                    currentCustomerCommandInputValue.toLowerCase()
                                  )
                            )
                            .map((customer) => (
                              <CommandItem
                                key={customer.contactNumber}
                                value={`${customer.customerName} ${customer.contactNumber}`}
                                onSelect={() => handleSelectCustomer(customer)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    customerSearchTerm ===
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
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                className="w-full lg:w-auto"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalRevenue.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Profit
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalProfit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Profit Margin
                </CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageProfitMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Sales
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSalesCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Performance</CardTitle>
              <CardDescription>
                Revenue and Profit for the selected period and customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
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
              ) : salesByDay.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesByDay}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) =>
                          new Date(value + "T00:00:00").toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )
                        }
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => `$${value}`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            labelFormatter={(label, payload) => {
                              if (
                                payload &&
                                payload.length > 0 &&
                                payload[0].payload.date
                              ) {
                                return new Date(
                                  payload[0].payload.date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                });
                              }
                              return label;
                            }}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="revenue"
                        fill="var(--color-revenue)"
                        radius={4}
                      />
                      <Bar
                        dataKey="profit"
                        fill="var(--color-profit)"
                        radius={4}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="py-4 text-center text-muted-foreground">
                  No sales data available for the selected filters.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Sales Transactions</CardTitle>
              <CardDescription>
                Showing transactions for the selected filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
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
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Car Model</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">
                          Total Amount
                        </TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSalesData.slice(0, 10).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {sale.carModel}
                          </TableCell>
                          <TableCell>
                            {sale.timestamp.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {sale.customerName || "N/A"} <br />{" "}
                            <span className="text-xs text-muted-foreground">
                              {sale.contactNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            {sale.items
                              .map((item) => `${item.name} (x${item.quantity})`)
                              .join(", ")}
                          </TableCell>
                          <TableCell className="text-right">
                            ${sale.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            ${sale.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center space-x-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePrintInvoice(sale)}
                                >
                                  <Printer className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Print Invoice</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSale(sale)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Sale</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredSalesData.length === 0 && (
                    <p className="py-4 text-center text-muted-foreground">
                      No sales transactions found for the selected filters.
                    </p>
                  )}
                </>
              )}
            </CardContent>
            {filteredSalesData.length > 10 && (
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Showing first 10 of {filteredSalesData.length} sales.
                </p>
              </CardFooter>
            )}
          </Card>
        </div>
      </TooltipProvider>
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 !mt-0">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold">Confirm Deletion</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-bold">{saleToDelete?.id}</span>? This action
              cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setSaleToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteSale}
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
    </>
  );
}

// Custom Percent Icon
const Percent = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("lucide lucide-percent", className)}
    {...props}
  >
    <line x1="19" x2="5" y1="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

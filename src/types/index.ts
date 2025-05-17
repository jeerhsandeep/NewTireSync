export interface InventoryItem {
  id: string;
  sku?: string; // Stock Keeping Unit - Optional for now
  name: string;
  description?: string; // Optional item description
  stock: number;
  costPrice: number;
  retailPrice: number;
  lowStockThreshold: number;
  category: string;
}

export interface SaleItem {
  id: string;
  inventoryItemId?: string; // Link to inventory item
  name: string;
  quantity: number;
  unitPrice: number; // Selling price
  costPrice: number; // Cost price for profit calculation
}

export interface SaleTransaction {
  id: string;
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  profit: number;
  timestamp: Date;
  customerName?: string;
  contactNumber?: string;
  customerEmail?: string;
  carModel?: string;
  vin?: string; // Vehicle Identification Number - Optional
  odometer?: string; // Odometer reading - Optional
  paymentMethod: "card" | "cash" | ""; // Payment method
  hstRate: number; // HST rate applied (e.g., 0.13 for 13%, 0 for no tax)
  notes?: string;
  invoiceNumber: number;
}

export interface Appointment {
  id: string;
  customerName: string;
  contactNumber: string;
  appointmentDate: Date;
  appointmentTime: string; // e.g., "10:00 AM"
  serviceType: string;
  itemDetails?: string; // e.g., tire size, specific part
  depositPaid?: number;
  notes?: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

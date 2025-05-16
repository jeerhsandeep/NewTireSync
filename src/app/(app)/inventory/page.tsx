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
  Edit3,
  Trash2,
  CircleAlert,
  PackagePlus,
  ScanBarcode,
  Search,
} from "lucide-react";
import type { InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Switch } from "@/components/ui/switch";

const initialInventoryData: InventoryItem[] = [
  {
    id: "tire001",
    sku: "TR-PERF-2055516",
    name: "Performance Radial 205/55R16",
    description: "High performance radial tire for sedans and sports cars.",
    stock: 50,
    costPrice: 75,
    retailPrice: 120,
    lowStockThreshold: 10,
    category: "Tires",
  },
  {
    id: "tire002",
    sku: "TR-ALLS-1956515",
    name: "All-Season Touring 195/65R15",
    description: "Reliable all-season tire for various weather conditions.",
    stock: 8,
    costPrice: 60,
    retailPrice: 100,
    lowStockThreshold: 10,
    category: "Tires",
  },
  {
    id: "oil001",
    sku: "OL-SYN-5W30-1QT",
    name: "Synthetic Oil 5W-30 (1 Qt)",
    description: "Full synthetic motor oil, 1 quart.",
    stock: 100,
    costPrice: 5,
    retailPrice: 9,
    lowStockThreshold: 20,
    category: "Oil",
  },
  {
    id: "filter001",
    sku: "FL-OIL-XYZ",
    name: "Oil Filter XYZ",
    description: "Standard oil filter, compatible with various models.",
    stock: 30,
    costPrice: 3,
    retailPrice: 7,
    lowStockThreshold: 15,
    category: "Filters",
  },
  {
    id: "usedtire001",
    sku: "UT-MICH-2055516",
    name: "Used Michelin 205/55R16",
    description: "Used Michelin tire with good tread remaining.",
    stock: 15,
    costPrice: 30,
    retailPrice: 60,
    lowStockThreshold: 5,
    category: "Used Tires",
  },
  {
    id: "other001",
    sku: "OT-WIPER-PAIR",
    name: "Wiper Blades - Pair",
    description: "Set of two wiper blades for front windshield.",
    stock: 25,
    costPrice: 10,
    retailPrice: 20,
    lowStockThreshold: 5,
    category: "Others",
  },
  {
    id: "rim001",
    sku: "RM-ALLOY-17",
    name: "Alloy Rim 17-inch",
    description: "17-inch alloy rim, silver finish.",
    stock: 10,
    costPrice: 150,
    retailPrice: 250,
    lowStockThreshold: 3,
    category: "Rims",
  },
  {
    id: "service001",
    name: "Oil Change Service",
    description: "Standard oil change service including filter and labor.",
    stock: 999,
    costPrice: 15,
    retailPrice: 45,
    lowStockThreshold: 0,
    category: "Services",
  },
  {
    id: "service002",
    name: "Tire Rotation",
    description: "Tire rotation service for even wear.",
    stock: 999,
    costPrice: 5,
    retailPrice: 25,
    lowStockThreshold: 0,
    category: "Services",
  },
];

const inventoryCategories = [
  "Tires",
  "Used Tires",
  "Oil",
  "Filters",
  "Rims",
  "Services",
  "Others",
];

export default function InventoryPage() {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, "id">>({
    sku: "",
    name: "",
    description: "",
    stock: 0,
    costPrice: 0,
    retailPrice: 0,
    lowStockThreshold: 0,
    category: "",
  });
  const [isEditing, setIsEditing] = useState<string | null>(null); // Stores ID of item being edited
  const [editForm, setEditForm] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    const fetchInventory = async (userEmail: string) => {
      setIsLoading(true); // Start loading

      try {
        const inventoryCollection = collection(
          db,
          "inventory",
          userEmail,
          "userInventory"
        );
        const querySnapshot = await getDocs(inventoryCollection);

        const inventoryData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryItem[];

        setInventory(inventoryData);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        toast({
          title: "Error",
          description: "Failed to fetch inventory data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false); // Stop loading
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = user.email || "unknown_user";
        fetchInventory(userEmail);
      } else {
        setInventory([]); // Clear inventory if user is not authenticated
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Check if target is an HTMLInputElement and its type is 'number'
    const isNumberInput =
      e.target instanceof HTMLInputElement && e.target.type === "number";
    const val = isNumberInput && name !== "sku" ? parseFloat(value) : value; // SKU is not a number

    if (isEditing && editForm) {
      setEditForm({ ...editForm, [name]: val });
    } else {
      setNewItem((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleCategoryChange = (value: string) => {
    const isService = value === "Services";
    const serviceStockValue = 999;
    const defaultStockForNonService = 0;
    const defaultLowStockThresholdForNonService = 0;

    if (isEditing && editForm) {
      setEditForm((prev) => {
        const wasService = prev!.category === "Services";
        return {
          ...prev!,
          category: value,
          stock: isService
            ? serviceStockValue
            : wasService
            ? defaultStockForNonService
            : prev!.stock,
          lowStockThreshold: isService
            ? 0
            : wasService
            ? defaultLowStockThresholdForNonService
            : prev!.lowStockThreshold,
        };
      });
    } else {
      setNewItem((prev) => {
        const wasService = prev.category === "Services";
        return {
          ...prev,
          category: value,
          stock: isService
            ? serviceStockValue
            : wasService
            ? defaultStockForNonService
            : prev.stock,
          lowStockThreshold: isService
            ? 0
            : wasService
            ? defaultLowStockThresholdForNonService
            : prev.lowStockThreshold,
        };
      });
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !newItem.name ||
      !newItem.category ||
      newItem.costPrice < 0 ||
      newItem.retailPrice < 0 ||
      (newItem.category !== "Services" && newItem.stock < 0)
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true); // Start loading

    try {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      const userEmail = user.email || "unknown_user";
      const inventoryId = Date.now().toString(); // Generate a unique inventory ID
      const inventoryRef = doc(
        db,
        "inventory",
        userEmail,
        "userInventory",
        inventoryId
      );

      const newInventoryItem = {
        ...newItem,
        stock: newItem.category === "Services" ? 999 : newItem.stock,
        lowStockThreshold:
          newItem.category === "Services" ? 0 : newItem.lowStockThreshold,
      };

      await setDoc(inventoryRef, newInventoryItem);

      setInventory((prev) => [
        ...prev,
        { id: inventoryId, ...newInventoryItem },
      ]);
      setNewItem({
        sku: "",
        name: "",
        description: "",
        stock: 0,
        costPrice: 0,
        retailPrice: 0,
        lowStockThreshold: 10,
        category: "",
      });
      toast({
        title: "Success",
        description: `${newInventoryItem.name} added to inventory.`,
      });
    } catch (error) {
      console.error("Error adding inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to add inventory item.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false); // Stop loading
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setIsEditing(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !editForm ||
      !editForm.name ||
      !editForm.category ||
      editForm.costPrice < 0 ||
      editForm.retailPrice < 0 ||
      (editForm.category !== "Services" && editForm.stock < 0)
    ) {
      toast({
        title: "Error",
        description:
          "Please fill all required fields with valid values for editing.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true); // Start loading

    try {
      const user = auth.currentUser;
      if (!user) {
        toast({
          title: "Error",
          description: "User is not authenticated.",
          variant: "destructive",
        });
        setIsAdding(false);
        return;
      }

      const userEmail = user.email || "unknown_user";
      const docRef = doc(
        db,
        "inventory",
        userEmail,
        "userInventory",
        editForm.id
      );

      const updatedForm = {
        ...editForm,
        stock: editForm.category === "Services" ? 999 : editForm.stock,
        lowStockThreshold:
          editForm.category === "Services" ? 0 : editForm.lowStockThreshold,
      };

      await updateDoc(docRef, updatedForm);

      setInventory((prev) =>
        prev.map((item) => (item.id === updatedForm.id ? updatedForm : item))
      );
      toast({ title: "Success", description: `${updatedForm.name} updated.` });
      setIsEditing(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to update inventory item.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false); // Stop loading
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item);
    setIsConfirmModalOpen(true); // Open the confirmation modal
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

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
      const docRef = doc(
        db,
        "inventory",
        userEmail,
        "userInventory",
        itemToDelete.id
      );

      await deleteDoc(docRef);

      setInventory((prev) =>
        prev.filter((item) => item.id !== itemToDelete.id)
      );
      toast({
        title: "Success",
        description: "Item removed from inventory.",
      });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to delete inventory item.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false); // Stop loading
      setItemToDelete(null);
      setIsConfirmModalOpen(false); // Close the modal
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (searchTerm) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.sku &&
            item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (showLowStockOnly) {
      items = items.filter(
        (item) =>
          item.category !== "Services" &&
          item.lowStockThreshold > 0 &&
          item.stock <= item.lowStockThreshold
      );
    }
    return items;
  }, [inventory, searchTerm, showLowStockOnly]);

  const currentForm = isEditing && editForm ? editForm : newItem;
  const currentHandler = isEditing ? handleSaveEdit : handleAddItem;
  const currentButtonText = isEditing ? "Save Changes" : "Add to Inventory";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Item" : "Add New Stock"}</CardTitle>
          <CardDescription>
            {isEditing
              ? `Update details for ${editForm?.name}`
              : "Enter details for a new inventory item."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={currentHandler}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="sku">SKU (Optional)</Label>
                <div className="relative mt-1">
                  <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sku"
                    name="sku"
                    value={currentForm.sku || ""}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="e.g. TR-BLK-205"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={currentForm.name}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Item Description (Optional)</Label>
                <Input
                  id="description"
                  name="description"
                  value={currentForm.description || ""}
                  onChange={handleInputChange}
                  className="mt-1"
                  placeholder="Enter a description for the item..."
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  name="category"
                  value={currentForm.category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger className="mt-1" id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentForm.costPrice}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="retailPrice">Retail Price ($)</Label>
                <Input
                  id="retailPrice"
                  name="retailPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentForm.retailPrice}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={currentForm.stock}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                  disabled={currentForm.category === "Services"}
                />
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  value={currentForm.lowStockThreshold}
                  onChange={handleInputChange}
                  className="mt-1"
                  required
                  disabled={currentForm.category === "Services"}
                />
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
                  setNewItem({
                    sku: "",
                    name: "",
                    description: "",
                    stock: 0,
                    costPrice: 0,
                    retailPrice: 0,
                    lowStockThreshold: 0,
                    category: "",
                  });
                }}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isAdding}>
              {isAdding ? (
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
                  {currentButtonText === "Add to Inventory"
                    ? "Adding..."
                    : "Saving..."}
                </>
              ) : (
                <>
                  <PackagePlus className="mr-2 h-4 w-4" /> {currentButtonText}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>
            Overview of all items in stock. Use filters to narrow results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="searchInventory"
                type="search"
                placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2 sm:pt-0">
              <Switch
                id="low-stock-filter"
                checked={showLowStockOnly}
                onCheckedChange={setShowLowStockOnly}
              />
              <Label htmlFor="low-stock-filter">Show Low Stock Only</Label>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
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
              <p className="ml-4 text-muted-foreground">Loading inventory...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Retail Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow
                    key={item.id}
                    className={
                      item.category !== "Services" &&
                      item.lowStockThreshold > 0 &&
                      item.stock <= item.lowStockThreshold
                        ? "bg-destructive/10"
                        : ""
                    }
                  >
                    <TableCell>{item.sku || "N/A"}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      {item.category === "Services" ? "N/A" : item.stock}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.retailPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.category === "Services" ? (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 justify-center"
                        >
                          Service
                        </Badge>
                      ) : item.lowStockThreshold > 0 &&
                        item.stock <= item.lowStockThreshold ? (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1 justify-center"
                        >
                          <CircleAlert className="h-3 w-3" /> Low Stock
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 justify-center"
                        >
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredInventory.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">
              {searchTerm || showLowStockOnly
                ? "No items match your filters."
                : "No inventory items found."}
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
              <span className="font-bold">{itemToDelete?.name}</span>? This
              action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteItem}
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
  );
}

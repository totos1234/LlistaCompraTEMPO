import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, History, ShoppingBag } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  notes: string;
  addedBy: string;
  addedDate: Date;
}

interface StoreType {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

const ShoppingList = () => {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const { t } = useTranslation();
  const [newItem, setNewItem] = useState<{
    name: string;
    notes: string;
  }>({
    name: "",
    notes: "",
  });
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [store, setStore] = useState<StoreType>({
    id: storeId || "1",
    name: "",
    color: "#f0f4f8",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const userName = localStorage.getItem("userName");
    const familyCode = localStorage.getItem("familyCode");

    if (!userName || !familyCode) {
      navigate("/");
      return;
    }

    // Fetch store details and shopping items
    fetchStoreDetails();
    fetchShoppingItems();
  }, [storeId, navigate]);

  const fetchStoreDetails = async () => {
    if (!storeId) return;

    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .single();

      if (error) throw error;

      if (data) {
        setStore({
          id: data.id,
          name: data.name,
          description: data.description,
          color: data.color || "#f0f4f8",
        });
      }
    } catch (error) {
      console.error("Error fetching store details:", error);
      setStore({ id: storeId, name: `${t("common.store")} ${storeId}` });
    }
  };

  const fetchShoppingItems = async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_purchased", false)
        .order("added_date", { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedItems: ShoppingItem[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity || "",
          notes: item.notes || "",
          addedBy: item.added_by || localStorage.getItem("userName") || "",
          addedDate: new Date(item.added_date),
        }));
        setItems(formattedItems);
      }
    } catch (error) {
      console.error("Error fetching shopping items:", error);
      // Set default items if fetch fails
      setItems([
        {
          id: "1",
          name: "Milk",
          quantity: "1 gallon",
          notes: "Whole milk preferred",
          addedBy: "John",
          addedDate: new Date(),
        },
        {
          id: "2",
          name: "Bread",
          quantity: "2 loaves",
          notes: "Whole wheat",
          addedBy: "Sarah",
          addedDate: new Date(),
        },
        {
          id: "3",
          name: "Eggs",
          quantity: "1 dozen",
          notes: "Organic",
          addedBy: "John",
          addedDate: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || !storeId) return;

    const userName = localStorage.getItem("userName") || "Current User";
    const userId = localStorage.getItem("userId");

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert([
          {
            store_id: storeId,
            name: newItem.name,
            quantity: "",
            notes: newItem.notes,
            added_by: userId,
            added_date: new Date().toISOString(),
            is_purchased: false,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newItemData: ShoppingItem = {
          id: data[0].id,
          name: data[0].name,
          quantity: data[0].quantity || "",
          notes: data[0].notes || "",
          addedBy: userName,
          addedDate: new Date(data[0].added_date),
        };

        setItems((prev) => [newItemData, ...prev]);
      }

      setNewItem({ name: "", notes: "" });
    } catch (error) {
      console.error("Error adding item:", error);
      // Fallback to client-side only if database operation fails
      const item: ShoppingItem = {
        id: Date.now().toString(),
        name: newItem.name,
        quantity: "",
        notes: newItem.notes,
        addedBy: userName,
        addedDate: new Date(),
      };

      setItems((prev) => [item, ...prev]);
      setNewItem({ name: "", notes: "" });
    }
  };

  const handlePurchaseItem = async (id: string) => {
    const purchasedItem = items.find((item) => item.id === id);
    if (!purchasedItem || !storeId) return;

    const userName = localStorage.getItem("userName") || "Current User";
    const userId = localStorage.getItem("userId");

    try {
      // Update the item as purchased
      const { error: updateError } = await supabase
        .from("shopping_items")
        .update({
          is_purchased: true,
          purchased_by: userId,
          purchased_date: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Check if this item already exists in purchase history
      const { data: existingItems, error: queryError } = await supabase
        .from("purchase_history")
        .select("*")
        .eq("store_id", storeId)
        .eq("item_name", purchasedItem.name);

      if (queryError) throw queryError;

      if (existingItems && existingItems.length > 0) {
        // Item exists in history, update frequency count
        const existingItem = existingItems[0];
        const newFrequency = (existingItem.frequency || 0) + 1;

        const { error: updateHistoryError } = await supabase
          .from("purchase_history")
          .update({
            frequency: newFrequency,
            buyer_id: userId,
            buyer_name: userName,
            purchase_date: new Date().toISOString(),
            last_quantity: purchasedItem.quantity,
            last_notes: purchasedItem.notes,
          })
          .eq("id", existingItem.id);

        if (updateHistoryError) throw updateHistoryError;
      } else {
        // Add new item to purchase history
        const { error: insertError } = await supabase
          .from("purchase_history")
          .insert([
            {
              store_id: storeId,
              item_name: purchasedItem.name,
              quantity: purchasedItem.quantity,
              notes: purchasedItem.notes,
              buyer_id: userId,
              buyer_name: userName,
              purchase_date: new Date().toISOString(),
              frequency: 1,
            },
          ]);

        if (insertError) throw insertError;
      }

      // Remove from shopping list in UI
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error purchasing item:", error);
      // Fallback to client-side only if database operation fails
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const goBack = () => {
    navigate("/stores");
  };

  const viewPurchaseHistory = () => {
    navigate(`/stores/${storeId}/history`);
  };

  return (
    <div
      className="min-h-screen p-4"
      style={{ backgroundColor: store.color || "#f0f4f8" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="border border-black shadow-md"
          >
            <ArrowLeft className="h-5 w-5 text-red-500" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">
            {store.name || `${t("common.store")} ${storeId}`}
          </h1>
        </div>
        <Button variant="outline" onClick={viewPurchaseHistory}>
          <History className="h-4 w-4 mr-2" />
          {t("common.history")}
        </Button>
      </div>

      <Separator className="my-4" />

      {/* Add Item Form */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <form onSubmit={handleAddItem} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <label
                htmlFor="name"
                className="text-sm font-medium whitespace-nowrap"
              >
                {t("shoppingList.itemName")}
              </label>
              <Input
                id="name"
                name="name"
                value={newItem.name}
                onChange={handleInputChange}
                placeholder={t("shoppingList.enterItemName")}
                required
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium whitespace-nowrap"
              >
                {t("shoppingList.notes")}
              </label>
              <Input
                id="notes"
                name="notes"
                value={newItem.notes}
                onChange={handleInputChange}
                placeholder={t("shoppingList.enterNotes")}
                className="flex-1"
              />
            </div>
            <Button type="submit" className="w-full mt-2">
              <Plus className="h-4 w-4 mr-2" />
              {t("shoppingList.addItem")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Shopping List */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <ShoppingBag className="h-5 w-5 mr-2" />
          {t("shoppingList.shoppingList")}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t("shoppingList.tapToPurchase")}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>Carregant...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-dashed">
          <p className="text-gray-500">{t("shoppingList.noItems")}</p>
          <p className="text-sm text-gray-400 mt-1">
            {t("shoppingList.addItemsAbove")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
              onClick={() => handlePurchaseItem(item.id)}
            >
              <CardContent className="p-1 py-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.quantity && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <p className="inline-block">
                      {item.addedBy &&
                      item.addedBy.startsWith &&
                      item.addedBy.startsWith("user_")
                        ? localStorage.getItem("userName")
                        : item.addedBy}{" "}
                      · {item.addedDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-0.5 italic truncate">
                    "{item.notes}"
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShoppingList;

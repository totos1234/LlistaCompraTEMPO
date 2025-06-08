import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";

interface SummaryItem {
  id: string;
  name: string;
  storeId: string;
  storeName: string;
  storeColor?: string;
}

const SummaryList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const userName = localStorage.getItem("userName");
    const familyCode = localStorage.getItem("familyCode");

    if (!userName || !familyCode) {
      navigate("/");
      return;
    }

    fetchAllItems();
  }, [navigate]);

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      const familyCode = localStorage.getItem("familyCode");

      if (!familyCode) {
        navigate("/");
        return;
      }

      // First get all stores for this family
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("id, name, color")
        .eq("family_code", familyCode)
        .order("name");

      if (storesError) throw storesError;

      if (!stores || stores.length === 0) {
        setItems([]);
        return;
      }

      // Create a map of store IDs to store names for quick lookup
      const storeMap = new Map(
        stores.map((store) => [
          store.id,
          { name: store.name, color: store.color },
        ]),
      );

      // Get all unpurchased items for stores in this family
      const storeIds = stores.map((store) => store.id);

      if (storeIds.length === 0) {
        setItems([]);
        return;
      }

      const { data: items, error: itemsError } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("is_purchased", false)
        .in("store_id", storeIds)
        .order("name");

      if (itemsError) throw itemsError;

      if (items) {
        // Format items with store names
        const formattedItems: SummaryItem[] = items.map((item) => ({
          id: item.id,
          name: item.name,
          storeId: item.store_id,
          storeName: storeMap.get(item.store_id)?.name || "Botiga desconeguda",
          storeColor: storeMap.get(item.store_id)?.color,
        }));

        // Sort by store name first, then by item name
        formattedItems.sort((a, b) => {
          if (a.storeName === b.storeName) {
            return a.name.localeCompare(b.name);
          }
          return a.storeName.localeCompare(b.storeName);
        });

        setItems(formattedItems);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseItem = async (id: string) => {
    try {
      const itemToUpdate = items.find((item) => item.id === id);
      if (!itemToUpdate) return;

      const userName = localStorage.getItem("userName") || "Current User";
      const userId = localStorage.getItem("userId");

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
        .eq("store_id", itemToUpdate.storeId)
        .eq("item_name", itemToUpdate.name);

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
          })
          .eq("id", existingItem.id);

        if (updateHistoryError) throw updateHistoryError;
      } else {
        // Add new item to purchase history
        const { error: insertError } = await supabase
          .from("purchase_history")
          .insert([
            {
              store_id: itemToUpdate.storeId,
              item_name: itemToUpdate.name,
              buyer_id: userId,
              buyer_name: userName,
              purchase_date: new Date().toISOString(),
              frequency: 1,
            },
          ]);

        if (insertError) throw insertError;
      }

      // Remove from list in UI
      setItems(items.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error purchasing item:", error);
    }
  };

  const goBack = () => {
    navigate("/stores");
  };

  return (
    <div className="min-h-screen bg-background p-4">
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
            {t("summaryList.title") || "Llista Resum"}
          </h1>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Items List */}
      {loading ? (
        <div className="text-center py-10">
          <p>Carregant...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-dashed">
          <p className="text-gray-500">
            {t("summaryList.noItems") ||
              "No hi ha articles pendents de comprar"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePurchaseItem(item.id)}
            >
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.storeColor || "#f0f4f8" }}
                  />
                  <span className="font-medium text-sm">{item.storeName}:</span>
                  <span>{item.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SummaryList;

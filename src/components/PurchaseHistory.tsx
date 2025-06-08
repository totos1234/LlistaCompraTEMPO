import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  User,
  BarChart2,
  ArrowLeftCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface PurchaseItem {
  id: string;
  name: string;
  buyer: string;
  date: string;
  frequency: number;
  store: string;
  quantity?: string;
  notes?: string;
  reAddedToList?: boolean;
  color?: string;
}

interface PurchaseHistoryProps {
  storeId?: string;
  storeName?: string;
  onBack?: () => void;
}

const PurchaseHistory = ({
  storeId,
  storeName,
  onBack,
}: PurchaseHistoryProps) => {
  // Get storeId from URL params if not provided as prop
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const actualStoreId = storeId || params.storeId || "1";
  const [actualStoreName, setActualStoreName] = useState(
    storeName || `Store ${actualStoreId}`,
  );
  const [actualStoreColor, setActualStoreColor] = useState<string | undefined>(
    undefined,
  );
  const handleBack =
    onBack || (() => navigate(`/shopping-list/${actualStoreId}`));
  const [sortBy, setSortBy] = useState<"name" | "date" | "frequency">("date");
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseItem[]>([]);

  // Fetch store details
  useEffect(() => {
    const fetchStoreDetails = async () => {
      if (!actualStoreId) return;

      try {
        const { data, error } = await supabase
          .from("stores")
          .select("name, color")
          .eq("id", actualStoreId)
          .single();

        if (error) throw error;

        if (data) {
          if (data.name) {
            setActualStoreName(data.name);
          }
          if (data.color) {
            setActualStoreColor(data.color);
          }
        }
      } catch (error) {
        console.error("Error fetching store details:", error);
      }
    };

    if (!storeName) {
      fetchStoreDetails();
    }
  }, [actualStoreId, storeName]);

  // Fetch purchase history from Supabase
  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("purchase_history")
          .select("*")
          .eq("store_id", actualStoreId);

        if (error) throw error;

        if (data) {
          const formattedData: PurchaseItem[] = data.map((item) => ({
            id: item.id,
            name: item.item_name,
            buyer: item.buyer_name || "Unknown",
            date: item.purchase_date,
            frequency: item.frequency || 1,
            store: item.store_id,
            quantity: item.last_quantity || item.quantity,
            notes: item.last_notes || item.notes,
            reAddedToList: false,
          }));
          setPurchaseHistory(formattedData);
        }
      } catch (error) {
        console.error("Error fetching purchase history:", error);
        // Fallback to empty array if fetch fails
        setPurchaseHistory([]);
      }
    };

    fetchPurchaseHistory();
  }, [actualStoreId]);

  // Sort the purchase history based on the selected sort option
  const sortedPurchaseHistory = [...purchaseHistory]
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.frequency - a.frequency;
      }
    });

  // Group purchases by buyer for the buyer tab
  const purchasesByBuyer: Record<string, PurchaseItem[]> = {};
  sortedPurchaseHistory.forEach((item) => {
    if (!purchasesByBuyer[item.buyer]) {
      purchasesByBuyer[item.buyer] = [];
    }
    purchasesByBuyer[item.buyer].push(item);
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!actualStoreId) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from("purchase_history")
        .delete()
        .eq("id", itemId);

      if (error) {
        console.error("Error deleting item from purchase history:", error);
        alert("Error eliminant l'article de l'historial: " + error.message);
        return;
      }

      // Remove the item from the UI only after successful deletion
      setPurchaseHistory((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error: any) {
      console.error("Error deleting item from purchase history:", error);
      alert(
        "Error eliminant l'article de l'historial: " +
          (error.message || "Error desconegut"),
      );
    }
  };

  const handleReAddToShoppingList = async (item: PurchaseItem) => {
    if (!actualStoreId) return;

    const userName = localStorage.getItem("userName") || "Current User";
    const userId = localStorage.getItem("userId");

    try {
      // Check if the item already exists in the shopping list
      const { data: existingItems, error: checkError } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("store_id", actualStoreId)
        .eq("name", item.name)
        .eq("is_purchased", false);

      if (checkError) throw checkError;

      // If item already exists in shopping list, don't add it again
      if (existingItems && existingItems.length > 0) {
        return;
      }

      // Add item to shopping list
      const { error: insertError } = await supabase
        .from("shopping_items")
        .insert([
          {
            store_id: actualStoreId,
            name: item.name,
            quantity: item.quantity || "",
            notes: item.notes || "",
            added_by: userId,
            added_date: new Date().toISOString(),
            is_purchased: false,
          },
        ]);

      if (insertError) throw insertError;

      // Mark item as re-added in the UI
      setPurchaseHistory((prev) =>
        prev.map((historyItem) =>
          historyItem.id === item.id
            ? { ...historyItem, reAddedToList: true }
            : historyItem,
        ),
      );
    } catch (error) {
      console.error("Error re-adding item to shopping list:", error);
    }
  };

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ backgroundColor: actualStoreColor || "#f0f4f8" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="border border-black shadow-md"
            >
              <ArrowLeft className="h-5 w-5 text-red-500" />
            </Button>
            <h1 className="text-2xl font-bold">
              {t("common.history")} de {actualStoreName}
            </h1>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <Input
            placeholder={t("purchaseHistory.searchItems")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              onClick={() => setSortBy("name")}
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowUpDown className="h-4 w-4" /> {t("purchaseHistory.name")}
            </Button>
            <Button
              variant={sortBy === "date" ? "default" : "outline"}
              onClick={() => setSortBy("date")}
              size="sm"
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" /> {t("purchaseHistory.date")}
            </Button>
            <Button
              variant={sortBy === "frequency" ? "default" : "outline"}
              onClick={() => setSortBy("frequency")}
              size="sm"
              className="flex items-center gap-1"
            >
              <BarChart2 className="h-4 w-4" /> {t("common.frequency")}
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              {t("purchaseHistory.allPurchases")}
            </TabsTrigger>
            <TabsTrigger value="byBuyer">
              {t("purchaseHistory.byBuyer")}
            </TabsTrigger>
          </TabsList>

          {/* All Purchases Tab */}
          <TabsContent value="all">
            <div className="grid gap-4">
              {sortedPurchaseHistory.length > 0 ? (
                sortedPurchaseHistory.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleReAddToShoppingList(item)}
                  >
                    <CardContent className="p-1 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-3 w-3 mr-1" /> {item.buyer}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />{" "}
                            {formatDate(item.date)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.reAddedToList && (
                          <ArrowLeftCircle className="h-5 w-5 text-green-500 mr-2" />
                        )}
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <BarChart2 className="h-3 w-3" /> {item.frequency}{" "}
                          {t("common.times")}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("purchaseHistory.noPurchaseHistory")}
                </div>
              )}
            </div>
          </TabsContent>

          {/* By Buyer Tab */}
          <TabsContent value="byBuyer">
            <div className="grid gap-6">
              {Object.keys(purchasesByBuyer).length > 0 ? (
                Object.entries(purchasesByBuyer).map(([buyer, items]) => (
                  <div key={buyer} className="space-y-2">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" /> {buyer}{" "}
                      <Badge>
                        {items.length} {t("purchaseHistory.items")}
                      </Badge>
                    </h2>
                    <div className="grid gap-2">
                      {items.map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleReAddToShoppingList(item)}
                        >
                          <CardContent className="p-1 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h3 className="font-medium">{item.name}</h3>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />{" "}
                                {formatDate(item.date)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.reAddedToList && (
                                <ArrowLeftCircle className="h-5 w-5 text-green-500 mr-2" />
                              )}
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <BarChart2 className="h-3 w-3" />{" "}
                                {item.frequency} {t("common.times")}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("purchaseHistory.noPurchaseHistory")}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PurchaseHistory;

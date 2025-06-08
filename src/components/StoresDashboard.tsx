import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Plus,
  Store,
  Palette,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";

interface StoreType {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface StoresDashboardProps {
  userName?: string;
  familyCode?: string;
  onLogout?: () => void;
}

const StoresDashboard = ({
  userName: propUserName,
  familyCode: propFamilyCode,
  onLogout: propOnLogout,
}: StoresDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [userName, setUserName] = useState(
    propUserName || localStorage.getItem("userName") || "User",
  );
  const [familyCode, setFamilyCode] = useState(
    propFamilyCode || localStorage.getItem("familyCode") || "FAM123",
  );
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStore, setNewStore] = useState<{
    name: string;
    description: string;
    color: string;
  }>({ name: "", description: "", color: "#f0f4f8" });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // Comprovar si l'usuari està autenticat
    const checkAuth = async () => {
      const userName = localStorage.getItem("userName");
      const familyCode = localStorage.getItem("familyCode");

      if (!userName || !familyCode) {
        navigate("/");
        return;
      }

      // Carregar les botigues de Supabase
      fetchStores();
    };

    checkAuth();
  }, [navigate]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("family_code", familyCode);

      if (error) throw error;

      if (data) {
        setStores(data);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStore = async () => {
    if (newStore.name.trim()) {
      try {
        // Insert without specifying ID (let Supabase generate it)
        const { error } = await supabase.from("stores").insert([
          {
            name: newStore.name,
            description: newStore.description,
            family_code: familyCode,
            color: newStore.color,
          },
        ]);

        if (error) {
          console.error("Error adding store:", error);
          throw error;
        }

        // Close dialog and refresh stores list
        setNewStore({ name: "", description: "", color: "#f0f4f8" });
        setDialogOpen(false);
        fetchStores(); // Refresh the stores list
      } catch (error: any) {
        console.error("Error adding store:", error);
        alert(error?.message || "Error adding store. Please try again.");
      }
    }
  };

  const handleStoreClick = (storeId: string) => {
    navigate(`/shopping-list/${storeId}`);
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      // First delete all shopping items for this store
      const { error: deleteItemsError } = await supabase
        .from("shopping_items")
        .delete()
        .eq("store_id", storeId);

      if (deleteItemsError) {
        console.error("Error deleting shopping items:", deleteItemsError);
        alert(
          "Error eliminant els articles de compra: " + deleteItemsError.message,
        );
        return;
      }

      // Delete purchase history for this store
      const { error: deleteHistoryError } = await supabase
        .from("purchase_history")
        .delete()
        .eq("store_id", storeId);

      if (deleteHistoryError) {
        console.error("Error deleting purchase history:", deleteHistoryError);
        alert(
          "Error eliminant l'historial de compres: " +
            deleteHistoryError.message,
        );
        return;
      }

      // Then delete the store itself
      const { error: deleteStoreError } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeId);

      if (deleteStoreError) {
        console.error("Error deleting store:", deleteStoreError);
        alert("Error eliminant la botiga: " + deleteStoreError.message);
        return;
      }

      // Update the UI only after successful database operations
      setStores(stores.filter((store) => store.id !== storeId));
    } catch (error: any) {
      console.error("Error deleting store:", error);
      alert(
        "Error eliminant la botiga: " + (error.message || "Error desconegut"),
      );
    }
  };

  const handleLogout = () => {
    if (propOnLogout) {
      propOnLogout();
    } else {
      // Netejar localStorage i tancar sessió
      localStorage.removeItem("userName");
      localStorage.removeItem("familyCode");
      localStorage.removeItem("userId");

      // Tancar sessió a Supabase
      supabase.auth.signOut().then(() => {
        // Redirigir a la pàgina d'inici
        navigate("/");
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Botigues</h1>
          <p className="text-muted-foreground">
            {t("common.family")}: {familyCode}
          </p>
          <p className="text-muted-foreground">Usuari: {userName}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-5 w-5 text-red-500" />
        </Button>
      </header>

      <div className="mb-4 flex justify-between">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />{" "}
              {t("storesDashboard.addNewStore")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("storesDashboard.addNewStore")}</DialogTitle>
              <DialogDescription>
                {t("storesDashboard.createNewStore")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="store-name">
                  {t("storesDashboard.storeName")}
                </Label>
                <Input
                  id="store-name"
                  placeholder={t("storesDashboard.enterStoreName")}
                  value={newStore.name}
                  onChange={(e) =>
                    setNewStore({ ...newStore, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="store-description">
                  {t("storesDashboard.storeDescription")}
                </Label>
                <Textarea
                  id="store-description"
                  placeholder={t("storesDashboard.enterStoreDescription")}
                  value={newStore.description}
                  onChange={(e) =>
                    setNewStore({ ...newStore, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="store-color"
                  className="flex items-center gap-2"
                >
                  <Palette className="h-4 w-4" />{" "}
                  {t("storesDashboard.storeColor") || "Color de la botiga"}
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    "#d0e1f9",
                    "#b5e2fa",
                    "#b5ead7",
                    "#e2f0cb",
                    "#ffdac1",
                    "#ffb7b2",
                    "#e0c3fc",
                    "#f9f7c9",
                    "#c7ceea",
                    "#ffc8dd",
                  ].map((color) => (
                    <div
                      key={color}
                      className={`h-8 w-full rounded-md cursor-pointer border-2 ${newStore.color === color ? "border-primary" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewStore({ ...newStore, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddStore}>{t("common.add")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="secondary" onClick={() => navigate("/summary-list")}>
          Llista Resum
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-12">
          <p>Carregant...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {stores.map((store) => (
            <Card
              key={store.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
              onClick={() => handleStoreClick(store.id)}
              style={{ backgroundColor: store.color || "#f0f4f8" }}
            >
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center">
                  <Store className="mr-2 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    {store.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {store.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStoreClick(store.id);
                    }}
                  >
                    {t("storesDashboard.viewList")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          {t("storesDashboard.deleteStore") ||
                            "Eliminar botiga"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {(
                            t("storesDashboard.deleteStoreConfirmation") ||
                            'Estàs segur que vols borrar la botiga "{0}" i tots els articles pendents de comprar?'
                          ).replace("{0}", store.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStore(store.id);
                          }}
                        >
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && stores.length === 0 && (
        <div className="text-center p-6 border rounded-lg">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-base font-medium">
            {t("storesDashboard.noStores")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("storesDashboard.addFirstStore")}
          </p>
        </div>
      )}
    </div>
  );
};

export default StoresDashboard;

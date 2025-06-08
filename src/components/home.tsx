import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validació bàsica
    if (!name.trim() || !familyCode.trim()) {
      setError(t("home.error"));
      return;
    }

    setLoading(true);

    try {
      // Check if user already exists with this name and family code
      const { data: existingUsers, error: queryError } = await supabase
        .from("users")
        .select("*")
        .eq("name", name)
        .eq("family_code", familyCode);

      if (queryError) throw queryError;

      if (existingUsers && existingUsers.length > 0) {
        // User exists, just use localStorage and skip authentication
        localStorage.setItem("userName", name);
        localStorage.setItem("familyCode", familyCode);
        localStorage.setItem("userId", existingUsers[0].id);
        navigate("/stores");
        return;
      }

      // Skip email validation by using localStorage only
      localStorage.setItem("userName", name);
      localStorage.setItem("familyCode", familyCode);
      localStorage.setItem("userId", `user_${Date.now()}`);

      // Navigate to stores dashboard
      navigate("/stores");
      return;

      // Create a new user record with a generated ID
      const userId = `user_${Date.now()}`;

      try {
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: userId,
            name,
            family_code: familyCode,
          },
        ]);

        if (insertError) {
          console.warn("Could not insert user, but continuing:", insertError);
        }
      } catch (err) {
        console.warn("Error inserting user, but continuing:", err);
      }

      // Guardar informació de l'usuari al localStorage
      localStorage.setItem("userName", name);
      localStorage.setItem("familyCode", familyCode);
      localStorage.setItem("userId", userId);

      // Navegar al tauler de botigues
      navigate("/stores");
    } catch (error: any) {
      console.error("Error:", error);
      setError(
        error.message ||
          "Error en iniciar sessió. Si us plau, torna-ho a provar.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {t("home.title")}
          </CardTitle>
          <CardDescription>{t("home.description")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("home.yourName")}</Label>
              <Input
                id="name"
                placeholder={t("home.enterName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyCode">{t("home.familyCode")}</Label>
              <Input
                id="familyCode"
                placeholder={t("home.enterFamilyCode")}
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value)}
                required
              />
            </div>
          </form>
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Carregant..." : t("common.login")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Home;

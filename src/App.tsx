import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import StoresDashboard from "./components/StoresDashboard";
import ShoppingList from "./components/ShoppingList";
import PurchaseHistory from "./components/PurchaseHistory";
import SummaryList from "./components/SummaryList";
import routes from "tempo-routes";

function App() {
  // For the tempo routes
  const tempoRoutes =
    import.meta.env.VITE_TEMPO === "true" ? useRoutes(routes) : null;

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        {tempoRoutes}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stores" element={<StoresDashboard />} />
          <Route path="/shopping-list/:storeId" element={<ShoppingList />} />
          <Route path="/summary-list" element={<SummaryList />} />
          <Route
            path="/stores/:storeId/history"
            element={<PurchaseHistory />}
          />
          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" />
          )}
        </Routes>
      </>
    </Suspense>
  );
}

export default App;

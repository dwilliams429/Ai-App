// client/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import TopNav from "./components/TopNav";
import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import RecipeDetail from "./pages/RecipeDetail";
import Inventory from "./pages/Inventory";
import ShoppingList from "./pages/ShoppingList";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import { useAuth } from "./context/AuthContext";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function getQFromLocation(loc) {
  try {
    const params = new URLSearchParams(loc.search || "");
    return params.get("q") || "";
  } catch {
    return "";
  }
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  const [searchValue, setSearchValue] = useState("");

  // Keep search box in sync with URL ?q= when you are on /recipes or /recipes/:id
  useEffect(() => {
    const onRecipesPage = loc.pathname === "/recipes" || loc.pathname.startsWith("/recipes/");
    if (!onRecipesPage) return;

    const q = getQFromLocation(loc);
    setSearchValue(q);
  }, [loc.pathname, loc.search]);

  const activeTabLabel = useMemo(() => {
    if (!user) return "Welcome — please login to use saved features.";
    return "";
  }, [user]);

  function goSearch() {
    const q = (searchValue || "").trim();
    // Always navigate to /recipes with q
    navigate(q ? `/recipes?q=${encodeURIComponent(q)}` : "/recipes");
  }

  return (
    <>
      <TopNav
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={goSearch}
        activeTabLabel={activeTabLabel}
      />

      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />

        <Route
          path="/recipes"
          element={
            <RequireAuth>
              <Recipes />
            </RequireAuth>
          }
        />

        <Route
          path="/recipes/:id"
          element={
            <RequireAuth>
              <RecipeDetail />
            </RequireAuth>
          }
        />

        <Route
          path="/inventory"
          element={
            <RequireAuth>
              <Inventory />
            </RequireAuth>
          }
        />

        <Route
          path="/shopping-list"
          element={
            <RequireAuth>
              <ShoppingList />
            </RequireAuth>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

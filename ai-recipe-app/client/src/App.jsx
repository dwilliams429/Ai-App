import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/layouts/Layout";

import Home from "./components/Pages/Home/Home";
import Recipes from "./components/Pages/Recipes/Recipes";
import Inventory from "./components/Pages/Inventory/Inventory";
import ShoppingList from "./components/Pages/ShoppingList/ShoppingList";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "recipes", element: <Recipes /> },
      { path: "inventory", element: <Inventory /> },
      { path: "shopping-list", element: <ShoppingList /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}

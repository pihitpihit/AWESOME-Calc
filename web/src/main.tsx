import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { ItemsIndex } from "./pages/ItemsIndex";
import { ItemDetail } from "./pages/ItemDetail";
import { RecipesIndex } from "./pages/RecipesIndex";
import { RecipeDetail } from "./pages/RecipeDetail";
import { Calculator } from "./pages/Calculator";
import { RecipeExplorer } from "./pages/RecipeExplorer";
import { DependencyMap } from "./pages/DependencyMap";
import { NotFound } from "./pages/NotFound";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="items" element={<ItemsIndex />} />
          <Route path="items/:slug" element={<ItemDetail />} />
          <Route path="recipes" element={<RecipesIndex />} />
          <Route path="recipes/:slug" element={<RecipeDetail />} />
          <Route path="explorer" element={<RecipeExplorer />} />
          <Route path="depmap" element={<DependencyMap />} />
          <Route path="calc" element={<Calculator />} />
          <Route path="calc/:slug" element={<Calculator />} />
          <Route path="404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);

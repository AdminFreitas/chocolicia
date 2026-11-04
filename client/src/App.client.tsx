import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import LegacyRouteFallback from "./components/LegacyRouteFallback";
import RecipeRouteFallback from "./components/RecipeRouteFallback";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const AreasAtendidas = lazy(() => import("./pages/AreasAtendidas"));
const BolosPersonalizados = lazy(() => import("./pages/BolosPersonalizados"));
const BuffetParaFestas = lazy(() => import("./pages/BuffetParaFestas"));
const DocesParaFestas = lazy(() => import("./pages/DocesParaFestas"));
const Legal = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const Promotion = lazy(() => import("./pages/Promotion"));

function LegacyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LegacyRouteFallback />}>{children}</Suspense>;
}

function RecipeListRoute() {
  return <Suspense fallback={<RecipeRouteFallback />}><Recipes /></Suspense>;
}

function RecipeDetailRoute() {
  return <Suspense fallback={<RecipeRouteFallback detail />}><RecipeDetail /></Suspense>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/buffet-para-festas"><LegacyRoute><BuffetParaFestas /></LegacyRoute></Route>
      <Route path="/bolos-personalizados"><LegacyRoute><BolosPersonalizados /></LegacyRoute></Route>
      <Route path="/doces-para-festas"><LegacyRoute><DocesParaFestas /></LegacyRoute></Route>
      <Route path="/areas-atendidas"><LegacyRoute><AreasAtendidas /></LegacyRoute></Route>
      <Route path="/politicas-e-termos"><LegacyRoute><Legal /></LegacyRoute></Route>
      <Route path="/receitas" component={RecipeListRoute} />
      <Route path="/promocao"><LegacyRoute><Promotion /></LegacyRoute></Route>
      <Route path="/promocoes"><LegacyRoute><Promotion /></LegacyRoute></Route>
      <Route path="/receitas/:slug" component={RecipeDetailRoute} />
      <Route path="/404"><LegacyRoute><NotFound /></LegacyRoute></Route>
      <Route><LegacyRoute><NotFound /></LegacyRoute></Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AreasAtendidas from "./pages/AreasAtendidas";
import BolosPersonalizados from "./pages/BolosPersonalizados";
import BuffetParaFestas from "./pages/BuffetParaFestas";
import DocesParaFestas from "./pages/DocesParaFestas";
import Home from "./pages/Home";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import Recipes from "./pages/Recipes";
import RecipeDetail from "./pages/RecipeDetail";
import Promotion from "./pages/Promotion";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/buffet-para-festas" component={BuffetParaFestas} />
      <Route path="/bolos-personalizados" component={BolosPersonalizados} />
      <Route path="/doces-para-festas" component={DocesParaFestas} />
      <Route path="/areas-atendidas" component={AreasAtendidas} />
      <Route path="/politicas-e-termos" component={Legal} />
      <Route path="/receitas" component={Recipes} />
      <Route path="/promocao" component={Promotion} />
      <Route path="/promocoes" component={Promotion} />
      <Route path="/receitas/:slug" component={RecipeDetail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
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

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/buffet-para-festas" component={BuffetParaFestas} />
      <Route path="/bolos-personalizados" component={BolosPersonalizados} />
      <Route path="/doces-para-festas" component={DocesParaFestas} />
      <Route path="/areas-atendidas" component={AreasAtendidas} />
      <Route path="/politicas-e-termos" component={Legal} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
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

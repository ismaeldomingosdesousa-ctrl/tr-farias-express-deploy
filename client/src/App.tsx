import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Transport from "./pages/Transport";
import WarehousePage from "./pages/Warehouse";
import Quotes from "./pages/Quotes";
import Drivers from "./pages/Drivers";
import Tracking from "./pages/Tracking";
import Financial from "./pages/Financial";
import Fiscal from "./pages/Fiscal";
import Reports from "./pages/Reports";
import Alerts from "./pages/Alerts";
import Clients from "./pages/Clients";
import DriverApp from "./pages/DriverApp";
import ClientPortal from "./pages/ClientPortal";
import AccessManagement from "./pages/AccessManagement";

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/orders" component={Orders} />
        <Route path="/transport" component={Transport} />
        <Route path="/warehouse" component={WarehousePage} />
        <Route path="/quotes" component={Quotes} />
        <Route path="/drivers" component={Drivers} />
        <Route path="/tracking" component={Tracking} />
        <Route path="/financial" component={Financial} />
        <Route path="/fiscal" component={Fiscal} />
        <Route path="/reports" component={Reports} />
        <Route path="/clients" component={Clients} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/access" component={AccessManagement} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Standalone routes — no DashboardLayout */}
      <Route path="/driver" component={DriverApp} />
      <Route path="/track" component={ClientPortal} />
      {/* All other routes go through DashboardLayout */}
      <Route component={DashboardRouter} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import Home from "@/pages/Home";
import AssessmentForm from "@/pages/AssessmentForm";
import Results from "@/pages/Results";
import UserManagement from "@/pages/UserManagement";
import StandardsCompliance from "@/pages/StandardsCompliance";
import Profile from "@/pages/Profile";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <LoginPage />
      </Route>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/assessment/:id?" component={AssessmentForm} />
      <ProtectedRoute path="/results/:id" component={Results} />
      <ProtectedRoute path="/standards/:id" component={StandardsCompliance} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <ProtectedRoute path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

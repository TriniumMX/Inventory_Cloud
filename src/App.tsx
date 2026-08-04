import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import { unlockAudio } from "@/lib/scanUtils";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // iOS PWA bloquea AudioContext hasta el primer gesto del usuario.
    // Este listener lo desbloquea en cuanto el usuario toca/hace click.
    const unlock = () => unlockAudio();
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click",      unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click",      unlock);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login"     element={<Login />} />
              <Route path="/forbidden" element={<Forbidden />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

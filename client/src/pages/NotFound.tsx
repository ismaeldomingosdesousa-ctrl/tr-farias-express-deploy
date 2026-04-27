import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center animate-fade-in max-w-sm px-4">
        <div className="h-20 w-20 mx-auto mb-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-6xl font-black text-foreground tracking-tight mb-2">404</h1>
        <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">
          Página não encontrada
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button onClick={() => setLocation("/dashboard")}>
          <Home className="h-4 w-4" />
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  );
}

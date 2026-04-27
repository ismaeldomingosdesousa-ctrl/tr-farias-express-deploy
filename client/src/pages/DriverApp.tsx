import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MapPin, Truck, Package, AlertTriangle, DollarSign,
  LogOut, Navigation, CheckCircle2, XCircle, Clock,
  ChevronRight, ArrowLeft, Wifi, WifiOff, RefreshCw, Camera,
  Fuel, Utensils, ParkingCircle, Wrench, Wallet,
  TrendingUp, TrendingDown, Receipt, MoreHorizontal, Download,
} from "lucide-react";

type Screen = "login" | "home" | "routes" | "route_detail" | "advance" | "history" | "expenses" | "financial";

interface DriverSession {
  id: number;
  name: string;
  cpf: string;
  status: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

const statusLabels: Record<string, string> = {
  pending: "PENDENTE",
  confirmed: "CONFIRMADO",
  picking: "SEPARANDO",
  packed: "EMBALADO",
  awaiting_pickup: "AGUARD. COLETA",
  in_transit: "EM TRÂNSITO",
  delivered: "ENTREGUE",
  cancelled: "CANCELADO",
  returned: "DEVOLVIDO",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  confirmed: "text-blue-400",
  picking: "text-orange-400",
  packed: "text-purple-400",
  awaiting_pickup: "text-cyan-400",
  in_transit: "text-blue-300",
  delivered: "text-green-400",
  cancelled: "text-red-400",
  returned: "text-gray-400",
};

const EXPENSE_CATEGORIES = [
  { key: "fuel",        label: "Combustível",  Icon: Fuel,          color: "text-orange-400", quick: [50, 100, 150, 200] },
  { key: "toll",        label: "Pedágio",       Icon: Receipt,       color: "text-blue-400",   quick: [5, 10, 20, 50]    },
  { key: "meal",        label: "Refeição",      Icon: Utensils,      color: "text-green-400",  quick: [15, 25, 35, 50]   },
  { key: "parking",     label: "Estacion.",     Icon: ParkingCircle, color: "text-yellow-400", quick: [10, 20, 30, 50]   },
  { key: "maintenance", label: "Manutenção",    Icon: Wrench,        color: "text-red-400",    quick: [50, 100, 200, 500] },
  { key: "other",       label: "Outros",        Icon: MoreHorizontal,color: "text-gray-400",   quick: [20, 50, 100]      },
];

const GPS_ACTIVE_KEY = "trfarias_gps_active";
const DRIVER_SESSION_KEY = "trfarias_driver";

// ── Theme tokens ────────────────────────────────────────────
const BG = "bg-[#080818]";
const CARD = "bg-[#12122A]";
const BORDER = "border-[#1E1E4A]";
const BTN_PRIMARY = "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] hover:from-[#6D28D9] hover:to-[#5B21B6] text-white font-black tracking-widest";
const BTN_DANGER = "bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#B91C1C] hover:to-[#991B1B] text-white font-black tracking-widest";
const BTN_SUCCESS = "bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#065F46] text-white font-black tracking-widest";
const DIVIDER = "h-0.5 w-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899]";

export default function DriverApp() {
  const [screen, setScreen] = useState<Screen>("login");
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [cpf, setCpf] = useState("");
  const [pin, setPin] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsActive, setGpsActive] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const driverRef = useRef<DriverSession | null>(null);
  const selectedRouteRef = useRef<number | null>(null);

  // Advance form
  const [advAmount, setAdvAmount] = useState("");
  const [advReason, setAdvReason] = useState("");

  // Expense form
  const [expCategory, setExpCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  // Financial panel
  const [finPeriod, setFinPeriod] = useState<"today" | "week" | "month">("month");

  // Occurrence form
  const [occOrderId, setOccOrderId] = useState<number | null>(null);
  const [occType, setOccType] = useState("");
  const [occDesc, setOccDesc] = useState("");
  const [showOccForm, setShowOccForm] = useState(false);

  // Update status form
  const [updOrderId, setUpdOrderId] = useState<number | null>(null);
  const [updStatus, setUpdStatus] = useState("");
  const [updNote, setUpdNote] = useState("");
  const [showStatusForm, setShowStatusForm] = useState(false);

  // Photo proof
  const [photoOrderId, setPhotoOrderId] = useState<number | null>(null);
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const utils = trpc.useUtils();

  // Keep refs in sync
  useEffect(() => { driverRef.current = driver; }, [driver]);
  useEffect(() => { selectedRouteRef.current = selectedRouteId; }, [selectedRouteId]);

  // Online/offline detection + GPS queue flush
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      navigator.serviceWorker?.controller?.postMessage("FLUSH_GPS_QUEUE");
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRIVER_SESSION_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setDriver(d);
        driverRef.current = d;
        setScreen("home");
      } catch {
        localStorage.removeItem(DRIVER_SESSION_KEY);
      }
    }
  }, []);

  // Queries
  const { data: myRoutes, isLoading: routesLoading, refetch: refetchRoutes } = trpc.driverApp.myRoutes.useQuery(
    { driverId: driver?.id ?? 0 },
    { enabled: !!driver, refetchInterval: 30000 }
  );

  const { data: routeOrders, isLoading: ordersLoading } = trpc.driverApp.routeOrders.useQuery(
    { routeId: selectedRouteId ?? 0, driverId: driver?.id ?? 0 },
    { enabled: !!selectedRouteId && !!driver }
  );

  const { data: myAdvances, refetch: refetchAdvances } = trpc.driverApp.myAdvances.useQuery(
    { driverId: driver?.id ?? 0 },
    { enabled: !!driver && (screen === "history" || screen === "financial") }
  );

  const { data: myExpenses, refetch: refetchExpenses } = trpc.driverApp.myExpenses.useQuery(
    { driverId: driver?.id ?? 0 },
    { enabled: !!driver && (screen === "expenses" || screen === "financial") }
  );

  // Mutations
  const loginMut = trpc.driverApp.login.useMutation({
    onSuccess: ({ driver: d }) => {
      const session: DriverSession = {
        id: d.id, name: d.name ?? "", cpf: d.cpf,
        status: d.status, phone: d.phone ?? null,
        lat: d.lat ?? null, lng: d.lng ?? null,
      };
      setDriver(session);
      driverRef.current = session;
      localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
      setScreen("home");
      toast.success(`Bem-vindo, ${d.name}!`);
      if (localStorage.getItem(GPS_ACTIVE_KEY) === "1") {
        setTimeout(() => startGPSInternal(session), 500);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const sendLocationMut = trpc.driverApp.sendLocation.useMutation();

  const updateStatusMut = trpc.driverApp.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      utils.driverApp.routeOrders.invalidate();
      setShowStatusForm(false);
      setUpdOrderId(null);
      setUpdStatus("");
      setUpdNote("");
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const occurrenceMut = trpc.driverApp.registerOccurrence.useMutation({
    onSuccess: () => {
      setShowOccForm(false);
      setOccOrderId(null);
      setOccType("");
      setOccDesc("");
      toast.success("Ocorrência registrada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const advanceMut = trpc.driverApp.requestAdvance.useMutation({
    onSuccess: () => {
      setAdvAmount("");
      setAdvReason("");
      toast.success("Solicitação enviada! Aguarde aprovação do gestor.");
      setScreen("home");
    },
    onError: (e) => toast.error(e.message),
  });

  const logExpenseMut = trpc.driverApp.logExpense.useMutation({
    onSuccess: () => {
      setExpCategory("");
      setExpAmount("");
      setExpNote("");
      refetchExpenses();
      toast.success("Despesa registrada!");
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── GPS TRACKING ────────────────────────────────────────────────────────────

  const sendPos = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, speed, heading, accuracy } = pos.coords;
    setCurrentPos({ lat: latitude, lng: longitude });
    const d = driverRef.current;
    if (d) {
      sendLocationMut.mutate({
        driverId: d.id,
        routeId: selectedRouteRef.current ?? undefined,
        lat: latitude,
        lng: longitude,
        speed: speed ?? undefined,
        heading: heading ?? undefined,
        accuracy: accuracy ?? undefined,
      });
    }
  }, [sendLocationMut]);

  const stopGPSInternal = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  }, []);

  const startGPSInternal = useCallback((sessionOverride?: DriverSession) => {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      return;
    }
    stopGPSInternal();
    setGpsActive(true);
    localStorage.setItem(GPS_ACTIVE_KEY, "1");

    watchIdRef.current = navigator.geolocation.watchPosition(sendPos, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });

    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendPos, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      });
    }, 30000);
  }, [sendPos, stopGPSInternal]);

  const startGPS = useCallback(() => {
    startGPSInternal();
    toast.success("GPS ativado — enviando localização a cada 30s");
  }, [startGPSInternal]);

  const stopGPS = useCallback(() => {
    stopGPSInternal();
    setGpsActive(false);
    localStorage.removeItem(GPS_ACTIVE_KEY);
    toast.info("GPS desativado");
  }, [stopGPSInternal]);

  useEffect(() => {
    const savedDriver = localStorage.getItem(DRIVER_SESSION_KEY);
    const gpsWasActive = localStorage.getItem(GPS_ACTIVE_KEY) === "1";
    if (savedDriver && gpsWasActive) {
      try {
        const d = JSON.parse(savedDriver);
        driverRef.current = d;
        startGPSInternal(d);
        setGpsActive(true);
      } catch { /* ignore */ }
    }
    return () => stopGPSInternal();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PHOTO PROOF ─────────────────────────────────────────────────────────────

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo: 5MB");
      return;
    }
    setPhotoMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setPhotoPreview(result);
      (window as any)._photoBase64 = base64;
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (orderId: number) => {
    const base64 = (window as any)._photoBase64;
    if (!base64 || !driver) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/upload/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, driverId: driver.id, imageBase64: base64, mimeType: photoMime }),
      });
      if (!res.ok) throw new Error("Falha no upload");
      await updateStatusMut.mutateAsync({
        orderId, driverId: driver.id, status: "delivered", note: "Entregue com comprovante fotográfico",
      });
      toast.success("Entrega confirmada com foto!");
      setShowPhotoForm(false);
      setPhotoPreview(null);
      setPhotoOrderId(null);
      (window as any)._photoBase64 = null;
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const logout = () => {
    stopGPS();
    setDriver(null);
    driverRef.current = null;
    localStorage.removeItem(DRIVER_SESSION_KEY);
    setScreen("login");
    toast.info("Sessão encerrada");
  };

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // LOGIN SCREEN
  if (screen === "login") {
    return (
      <div className={`min-h-screen ${BG} flex flex-col items-center justify-center p-6`}>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Truck className="h-8 w-8 text-[#7C3AED]" />
              <span className="text-2xl font-black tracking-widest text-white">TR FARIAS</span>
              <span className="text-2xl font-black tracking-widest text-[#7C3AED]">EXPRESS</span>
            </div>
            <div className={DIVIDER + " my-3"} />
            <p className="text-xs text-gray-400 tracking-widest">ÁREA DO MOTORISTA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 tracking-widest block mb-1">CPF</label>
              <Input
                className={`${CARD} border-[#1E1E4A] text-white text-lg h-12 tracking-wider focus:border-[#7C3AED]`}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 tracking-widest block mb-1">PIN (6 dígitos)</label>
              <Input
                className={`${CARD} border-[#1E1E4A] text-white text-lg h-12 tracking-widest text-center focus:border-[#7C3AED]`}
                placeholder="• • • • • •"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button
              className={`w-full h-12 text-base ${BTN_PRIMARY}`}
              disabled={cpf.replace(/\D/g, "").length < 11 || pin.length < 6 || loginMut.isPending}
              onClick={() => loginMut.mutate({ cpf: cpf.replace(/\D/g, ""), pin })}
            >
              {loginMut.isPending ? "ENTRANDO..." : "ENTRAR"}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-600 tracking-wider">
            Solicite seu PIN ao gestor da empresa
          </p>

          {/* iOS install hint */}
          {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window.navigator as any).standalone && (
            <div className={`${CARD} border ${BORDER} rounded-lg p-3 text-center`}>
              <p className="text-xs text-[#7C3AED] font-bold tracking-widest mb-1">INSTALAR APP</p>
              <p className="text-xs text-gray-400">Toque em <strong className="text-white">Compartilhar</strong> e depois <strong className="text-white">Adicionar à Tela de Início</strong></p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SHARED HEADER
  const Header = ({ title, back }: { title: string; back?: () => void }) => (
    <div className={`${BG} border-b ${BORDER} sticky top-0 z-10`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {back && (
            <button onClick={back} className="text-gray-400 hover:text-[#7C3AED]">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <p className="text-xs text-[#7C3AED] font-black tracking-widest">{title}</p>
            {!back && <p className="text-xs text-gray-500 tracking-wider">{driver?.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOnline
            ? <Wifi className="h-4 w-4 text-green-400" />
            : <WifiOff className="h-4 w-4 text-red-400" />}
          {!back && (
            <button onClick={logout} className="text-gray-500 hover:text-red-400 ml-2">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className={DIVIDER} />
    </div>
  );

  // PWA Install Banner
  const InstallBanner = () => showInstallBanner ? (
    <div className={`${CARD} border ${BORDER} mx-4 mt-3 rounded-lg p-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-[#7C3AED]" />
        <div>
          <p className="text-xs font-black tracking-widest text-white">INSTALAR APP</p>
          <p className="text-xs text-gray-400">Funciona offline com GPS</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleInstall} className={`px-3 py-1.5 rounded text-xs font-black tracking-widest bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white`}>
          INSTALAR
        </button>
        <button onClick={() => setShowInstallBanner(false)} className="text-gray-500 hover:text-gray-300">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null;

  // HOME SCREEN
  if (screen === "home") {
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="TR FARIAS EXPRESS" />
        <InstallBanner />
        <div className="p-4 space-y-4">
          {/* GPS Status */}
          <div className={`rounded-lg border p-4 flex items-center justify-between ${gpsActive ? "border-green-500/40 bg-green-500/5" : `${BORDER} ${CARD}`}`}>
            <div className="flex items-center gap-3">
              <Navigation className={`h-5 w-5 ${gpsActive ? "text-green-400 animate-pulse" : "text-gray-500"}`} />
              <div>
                <p className="text-sm font-bold tracking-widest">{gpsActive ? "GPS ATIVO" : "GPS INATIVO"}</p>
                {currentPos && gpsActive && (
                  <p className="text-xs text-gray-400">{currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}</p>
                )}
                {gpsActive && (
                  <p className="text-xs text-green-600 tracking-wider">Persiste após atualizar a página</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className={`text-xs font-bold tracking-widest ${gpsActive ? BTN_DANGER : BTN_SUCCESS}`}
              onClick={gpsActive ? stopGPS : startGPS}
            >
              {gpsActive ? "PARAR" : "ATIVAR"}
            </Button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Truck,         label: "MINHAS ROTAS",  screen: "routes"    as Screen, color: "text-blue-400"   },
              { icon: Fuel,          label: "DESPESAS",      screen: "expenses"  as Screen, color: "text-orange-400" },
              { icon: DollarSign,    label: "ADIANTAMENTO",  screen: "advance"   as Screen, color: "text-green-400"  },
              { icon: Wallet,        label: "FINANCEIRO",    screen: "financial" as Screen, color: "text-[#7C3AED]"  },
              { icon: Clock,         label: "HISTÓRICO",     screen: "history"   as Screen, color: "text-yellow-400" },
              { icon: AlertTriangle, label: "OCORRÊNCIA",    action: () => { setScreen("routes"); toast.info("Selecione uma rota e pedido para registrar ocorrência"); }, color: "text-red-400" },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action ?? (() => setScreen(item.screen!))}
                className={`${CARD} border ${BORDER} rounded-lg p-4 flex flex-col items-center gap-2 hover:border-[#7C3AED] transition-colors active:scale-95`}
              >
                <item.icon className={`h-7 w-7 ${item.color}`} />
                <span className="text-xs font-black tracking-widest text-center">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Active routes summary */}
          <div className={`${CARD} border ${BORDER} rounded-lg p-4`}>
            <p className="text-xs text-gray-400 tracking-widest mb-3">ROTAS ATIVAS</p>
            {routesLoading ? (
              <div className={`animate-pulse h-8 bg-[#1E1E4A] rounded`} />
            ) : !myRoutes?.length ? (
              <p className="text-sm text-gray-500 text-center py-2">Nenhuma rota atribuída</p>
            ) : (
              <div className="space-y-2">
                {myRoutes.slice(0, 3).map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRouteId(r.id); selectedRouteRef.current = r.id; setScreen("route_detail"); }}
                    className="w-full flex items-center justify-between text-left hover:text-[#7C3AED] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold">{r.routeCode}</p>
                      <p className="text-xs text-gray-500">{r.originAddress?.slice(0,25)} → {r.destAddress?.slice(0,25)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ROUTES SCREEN
  if (screen === "routes") {
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="MINHAS ROTAS" back={() => setScreen("home")} />
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => refetchRoutes()} className="text-gray-400 hover:text-[#7C3AED]">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {routesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`animate-pulse h-20 ${CARD} rounded-lg border ${BORDER}`} />
            ))
          ) : !myRoutes?.length ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-[#1E1E4A] mx-auto mb-3" />
              <p className="text-gray-500 tracking-wider">NENHUMA ROTA ATRIBUÍDA</p>
            </div>
          ) : (
            myRoutes.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRouteId(r.id); selectedRouteRef.current = r.id; setScreen("route_detail"); }}
                className={`w-full ${CARD} border ${BORDER} hover:border-[#7C3AED] rounded-lg p-4 text-left transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black tracking-widest text-sm">{r.routeCode}</p>
                    <p className="text-xs text-gray-400 mt-1">{r.originAddress?.slice(0,30)} → {r.destAddress?.slice(0,30)}</p>
                    {r.distanceKm && <p className="text-xs text-gray-500">{r.distanceKm} km</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold tracking-widest ${r.status === "in_progress" ? "text-green-400" : "text-yellow-400"}`}>
                      {r.status === "in_progress" ? "EM ANDAMENTO" : "PLANEJADA"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ROUTE DETAIL / ORDERS SCREEN
  if (screen === "route_detail") {
    const route = myRoutes?.find(r => r.id === selectedRouteId);
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title={route?.routeCode ?? "DETALHES DA ROTA"} back={() => setScreen("routes")} />
        <div className="p-4 space-y-3">
          {route && (
            <div className={`${CARD} border ${BORDER} rounded-lg p-3 text-xs text-gray-400 tracking-wider`}>
              <p>{route.originAddress} → {route.destAddress}</p>
              {route.distanceKm && <p>{route.distanceKm} km estimados</p>}
            </div>
          )}

          <p className="text-xs text-gray-400 tracking-widest">PEDIDOS DESTA ROTA</p>

          {ordersLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`animate-pulse h-24 ${CARD} rounded-lg border ${BORDER}`} />
            ))
          ) : !routeOrders?.length ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-[#1E1E4A] mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum pedido nesta rota</p>
            </div>
          ) : (
            routeOrders.map(o => (
              <div key={o.id} className={`${CARD} border ${BORDER} rounded-lg p-4 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black tracking-widest text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.destAddress}</p>
                    <p className="text-xs text-gray-500">{o.destCity} — {o.destState}</p>
                  </div>
                  <span className={`text-xs font-bold tracking-widest ${statusColors[o.status]}`}>
                    {statusLabels[o.status]}
                  </span>
                </div>

                {o.totalWeight && <p className="text-xs text-gray-500">{o.totalWeight} kg</p>}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className={`text-xs h-8 bg-blue-600 hover:bg-blue-700 font-bold tracking-widest`}
                    onClick={() => { setUpdOrderId(o.id); setShowStatusForm(true); }}
                  >
                    ATUALIZAR STATUS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`border-red-500/40 text-red-400 text-xs font-bold tracking-widest h-8`}
                    onClick={() => { setOccOrderId(o.id); setShowOccForm(true); }}
                  >
                    OCORRÊNCIA
                  </Button>
                  {o.status === "in_transit" && (
                    <>
                      <Button
                        size="sm"
                        className={`text-xs h-8 ${BTN_SUCCESS}`}
                        onClick={() => { setPhotoOrderId(o.id); setShowPhotoForm(true); }}
                      >
                        <Camera className="h-3 w-3 mr-1" /> FOTO + ENTREGUE
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/40 text-green-400 text-xs font-bold tracking-widest h-8"
                        disabled={updateStatusMut.isPending}
                        onClick={() => updateStatusMut.mutate({ orderId: o.id, driverId: driver!.id, status: "delivered", note: "Entregue pelo motorista" })}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> ENTREGUE
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Photo Proof Modal */}
          {showPhotoForm && photoOrderId && (
            <div className="fixed inset-0 bg-black/95 z-50 flex items-end">
              <div className={`w-full ${CARD} border-t ${BORDER} rounded-t-xl p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest text-[#7C3AED]">COMPROVANTE DE ENTREGA</p>
                  <button onClick={() => { setShowPhotoForm(false); setPhotoPreview(null); setPhotoOrderId(null); (window as any)._photoBase64 = null; }}>
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <div className={DIVIDER} />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                {photoPreview ? (
                  <div className="space-y-3">
                    <img src={photoPreview} alt="Comprovante" className={`w-full max-h-48 object-cover rounded-lg border ${BORDER}`} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 border-[#1E1E4A] text-gray-400 text-xs`}
                        onClick={() => { setPhotoPreview(null); (window as any)._photoBase64 = null; }}
                      >
                        TROCAR FOTO
                      </Button>
                      <Button
                        size="sm"
                        className={`flex-1 text-xs ${BTN_SUCCESS}`}
                        disabled={uploadingPhoto}
                        onClick={() => uploadPhoto(photoOrderId)}
                      >
                        {uploadingPhoto ? "ENVIANDO..." : "CONFIRMAR ENTREGA"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 tracking-wider">Tire uma foto do comprovante de entrega (assinatura, local, etc.)</p>
                    <Button
                      className={`w-full h-14 ${BTN_PRIMARY}`}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <Camera className="h-5 w-5 mr-2" /> ABRIR CÂMERA
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Update Status Modal */}
          {showStatusForm && updOrderId && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-end">
              <div className={`w-full ${CARD} border-t ${BORDER} rounded-t-xl p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest text-[#7C3AED]">ATUALIZAR STATUS</p>
                  <button onClick={() => setShowStatusForm(false)}><XCircle className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className={DIVIDER} />
                <Select value={updStatus} onValueChange={setUpdStatus}>
                  <SelectTrigger className={`${CARD} border-[#1E1E4A] text-white`}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className={`${CARD} border-[#1E1E4A]`}>
                    <SelectItem value="in_transit">EM TRÂNSITO</SelectItem>
                    <SelectItem value="delivered">ENTREGUE</SelectItem>
                    <SelectItem value="returned">DEVOLVIDO</SelectItem>
                    <SelectItem value="cancelled">CANCELADO</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className={`${CARD} border-[#1E1E4A] text-white`}
                  placeholder="Observação (opcional)"
                  value={updNote}
                  onChange={e => setUpdNote(e.target.value)}
                />
                <Button
                  className={`w-full ${BTN_PRIMARY}`}
                  disabled={!updStatus || updateStatusMut.isPending}
                  onClick={() => updateStatusMut.mutate({ orderId: updOrderId, driverId: driver!.id, status: updStatus as any, note: updNote })}
                >
                  {updateStatusMut.isPending ? "SALVANDO..." : "CONFIRMAR"}
                </Button>
              </div>
            </div>
          )}

          {/* Occurrence Modal */}
          {showOccForm && occOrderId && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-end">
              <div className={`w-full ${CARD} border-t ${BORDER} rounded-t-xl p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest text-[#7C3AED]">REGISTRAR OCORRÊNCIA</p>
                  <button onClick={() => setShowOccForm(false)}><XCircle className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className={DIVIDER} />
                <Select value={occType} onValueChange={setOccType}>
                  <SelectTrigger className={`${CARD} border-[#1E1E4A] text-white`}>
                    <SelectValue placeholder="Tipo de ocorrência" />
                  </SelectTrigger>
                  <SelectContent className={`${CARD} border-[#1E1E4A]`}>
                    <SelectItem value="damage">AVARIA NA CARGA</SelectItem>
                    <SelectItem value="refusal">RECUSA DO DESTINATÁRIO</SelectItem>
                    <SelectItem value="address_not_found">ENDEREÇO NÃO ENCONTRADO</SelectItem>
                    <SelectItem value="recipient_absent">DESTINATÁRIO AUSENTE</SelectItem>
                    <SelectItem value="delay">ATRASO</SelectItem>
                    <SelectItem value="other">OUTRO</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className={`${CARD} border-[#1E1E4A] text-white`}
                  placeholder="Descreva a ocorrência (mín. 10 caracteres)"
                  value={occDesc}
                  onChange={e => setOccDesc(e.target.value)}
                />
                <Button
                  className={`w-full ${BTN_DANGER}`}
                  disabled={!occType || occDesc.length < 10 || occurrenceMut.isPending}
                  onClick={() => occurrenceMut.mutate({ orderId: occOrderId, driverId: driver!.id, type: occType as any, description: occDesc })}
                >
                  {occurrenceMut.isPending ? "REGISTRANDO..." : "REGISTRAR"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ADVANCE REQUEST SCREEN
  if (screen === "advance") {
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="SOLICITAR ADIANTAMENTO" back={() => setScreen("home")} />
        <div className="p-4 space-y-4">
          <div className={`${CARD} border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400 tracking-wider`}>
            ⚠ Solicitações são analisadas pelo gestor. Máximo: R$ 5.000,00 por solicitação.
          </div>

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">VALOR SOLICITADO (R$)</label>
            <Input
              type="number"
              min="10"
              max="5000"
              step="10"
              className={`${CARD} border-[#1E1E4A] text-white text-xl h-14 font-bold`}
              placeholder="0,00"
              value={advAmount}
              onChange={e => setAdvAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">MOTIVO (mín. 10 caracteres)</label>
            <textarea
              className={`w-full ${CARD} border border-[#1E1E4A] rounded-lg text-white text-sm p-3 min-h-[100px] resize-none focus:outline-none focus:border-[#7C3AED]`}
              placeholder="Descreva o motivo do adiantamento..."
              value={advReason}
              onChange={e => setAdvReason(e.target.value)}
            />
          </div>

          <Button
            className={`w-full h-12 text-base ${BTN_SUCCESS}`}
            disabled={!advAmount || parseFloat(advAmount) < 10 || advReason.length < 10 || advanceMut.isPending}
            onClick={() => advanceMut.mutate({
              driverId: driver!.id,
              routeId: selectedRouteId ?? undefined,
              amount: parseFloat(advAmount),
              reason: advReason,
            })}
          >
            {advanceMut.isPending ? "ENVIANDO..." : "SOLICITAR ADIANTAMENTO"}
          </Button>
        </div>
      </div>
    );
  }

  // HISTORY SCREEN
  if (screen === "history") {
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="HISTÓRICO" back={() => setScreen("home")} />
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => refetchAdvances()} className="text-gray-400 hover:text-[#7C3AED]">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 tracking-widest">ADIANTAMENTOS</p>
          {!myAdvances?.length ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum adiantamento solicitado</p>
          ) : (
            myAdvances.map(a => (
              <div key={a.id} className={`${CARD} border ${BORDER} rounded-lg p-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">R$ {a.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-400 mt-1">{a.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className={`text-xs font-black tracking-widest ${
                    a.status === "approved" || a.status === "paid" ? "text-green-400" :
                    a.status === "rejected" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {a.status === "pending" ? "PENDENTE" : a.status === "approved" ? "APROVADO" : a.status === "paid" ? "PAGO" : "REJEITADO"}
                  </span>
                </div>
                {a.reviewNote && (
                  <p className={`text-xs text-gray-500 mt-2 border-t border-[#1E1E4A] pt-2`}>Nota: {a.reviewNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // EXPENSES SCREEN
  if (screen === "expenses") {
    const selectedCat = EXPENSE_CATEGORIES.find(c => c.key === expCategory);
    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="REGISTRAR DESPESA" back={() => setScreen("home")} />
        <div className="p-4 space-y-5">

          <div>
            <p className="text-xs text-gray-400 tracking-widest mb-2">CATEGORIA</p>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setExpCategory(cat.key); setExpAmount(""); }}
                  className={`${CARD} border rounded-lg p-3 flex flex-col items-center gap-1.5 transition-colors ${
                    expCategory === cat.key ? "border-[#7C3AED] bg-[#7C3AED]/10" : `${BORDER} hover:border-[#7C3AED]/50`
                  }`}
                >
                  <cat.Icon className={`h-6 w-6 ${cat.color}`} />
                  <span className="text-[10px] font-black tracking-widest text-center">{cat.label.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedCat && (
            <div>
              <p className="text-xs text-gray-400 tracking-widest mb-2">VALOR RÁPIDO</p>
              <div className="flex gap-2 flex-wrap">
                {selectedCat.quick.map(v => (
                  <button
                    key={v}
                    onClick={() => setExpAmount(String(v))}
                    className={`px-4 py-2 rounded-lg border text-sm font-bold tracking-widest transition-colors ${
                      expAmount === String(v)
                        ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                        : `${BORDER} ${CARD} text-gray-300 hover:border-[#7C3AED]/50`
                    }`}
                  >
                    R${v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">VALOR (R$)</label>
            <Input
              type="number"
              min="1"
              step="1"
              className={`${CARD} border-[#1E1E4A] text-white text-xl h-14 font-bold`}
              placeholder="0,00"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">OBSERVAÇÃO (opcional)</label>
            <Input
              className={`${CARD} border-[#1E1E4A] text-white`}
              placeholder="Ex: Posto Shell km 142..."
              value={expNote}
              onChange={e => setExpNote(e.target.value)}
            />
          </div>

          <Button
            className={`w-full h-12 text-base ${BTN_PRIMARY}`}
            disabled={!expCategory || !expAmount || parseFloat(expAmount) < 1 || logExpenseMut.isPending}
            onClick={() => logExpenseMut.mutate({
              driverId: driver!.id,
              routeId: selectedRouteId ?? undefined,
              category: expCategory as "fuel" | "toll" | "meal" | "parking" | "maintenance" | "other",
              amount: parseFloat(expAmount),
              note: expNote || undefined,
            })}
          >
            {logExpenseMut.isPending ? "REGISTRANDO..." : "REGISTRAR DESPESA"}
          </Button>

          {myExpenses && myExpenses.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 tracking-widest mb-2">ÚLTIMAS DESPESAS</p>
              <div className="space-y-2">
                {myExpenses.slice(0, 6).map(e => (
                  <div key={e.id} className={`${CARD} border ${BORDER} rounded-lg p-3 flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-gray-300">{e.category.replace("Despesa Motorista - ", "")}</p>
                      {e.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[190px]">{e.description}</p>}
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400 shrink-0">
                      -R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FINANCIAL PANEL SCREEN
  if (screen === "financial") {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = finPeriod === "today" ? startOfToday : finPeriod === "week" ? startOfWeek : startOfMonth;

    const paidAdvances = (myAdvances ?? []).filter(a =>
      a.status === "paid" && new Date(a.paidAt ?? a.createdAt) >= since
    );
    const periodExpenses = (myExpenses ?? []).filter(e => new Date(e.createdAt) >= since);
    const totalAdv = paidAdvances.reduce((s, a) => s + a.amount, 0);
    const totalExp = periodExpenses.reduce((s, e) => s + e.amount, 0);
    const net = totalAdv - totalExp;

    return (
      <div className={`min-h-screen ${BG} text-white`}>
        <Header title="PAINEL FINANCEIRO" back={() => setScreen("home")} />
        <div className="p-4 space-y-4">

          {/* Period tabs */}
          <div className={`flex gap-1 ${CARD} border ${BORDER} rounded-lg p-1`}>
            {(["today", "week", "month"] as const).map(p => (
              <button
                key={p}
                onClick={() => setFinPeriod(p)}
                className={`flex-1 py-2 text-xs font-black tracking-widest rounded-md transition-colors ${
                  finPeriod === p ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                {p === "today" ? "HOJE" : p === "week" ? "SEMANA" : "MÊS"}
              </button>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`${CARD} border border-green-500/20 rounded-lg p-3 text-center`}>
              <TrendingUp className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 tracking-widest leading-tight">ADIANTAM.</p>
              <p className="text-sm font-black text-green-400 mt-1">
                R${totalAdv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`${CARD} border border-red-500/20 rounded-lg p-3 text-center`}>
              <TrendingDown className="h-5 w-5 text-red-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 tracking-widest leading-tight">DESPESAS</p>
              <p className="text-sm font-black text-red-400 mt-1">
                R${totalExp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`${CARD} border rounded-lg p-3 text-center ${net >= 0 ? "border-[#7C3AED]/20" : "border-orange-500/20"}`}>
              <Wallet className={`h-5 w-5 mx-auto mb-1 ${net >= 0 ? "text-[#7C3AED]" : "text-orange-400"}`} />
              <p className="text-[10px] text-gray-400 tracking-widest leading-tight">SALDO</p>
              <p className={`text-sm font-black mt-1 ${net >= 0 ? "text-[#7C3AED]" : "text-orange-400"}`}>
                R${net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {periodExpenses.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 tracking-widest mb-2">DESPESAS DO PERÍODO</p>
              <div className="space-y-2">
                {periodExpenses.map(e => (
                  <div key={e.id} className={`${CARD} border ${BORDER} rounded-lg p-3 flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold tracking-widest">{e.category.replace("Despesa Motorista - ", "")}</p>
                      {e.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[190px]">{e.description}</p>}
                      <p className="text-xs text-gray-600">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400 shrink-0">
                      -R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paidAdvances.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 tracking-widest mb-2">ADIANTAMENTOS RECEBIDOS</p>
              <div className="space-y-2">
                {paidAdvances.map(a => (
                  <div key={a.id} className={`${CARD} border ${BORDER} rounded-lg p-3 flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-bold tracking-widest text-green-400">ADIANTAMENTO #{a.id}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[190px]">{a.reason}</p>
                      <p className="text-xs text-gray-600">{new Date(a.paidAt ?? a.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <p className="text-sm font-bold text-green-400 shrink-0">
                      +R$ {a.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {periodExpenses.length === 0 && paidAdvances.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-[#1E1E4A] mx-auto mb-3" />
              <p className="text-gray-500 tracking-wider text-sm">NENHUM MOVIMENTO NO PERÍODO</p>
              <button onClick={() => setScreen("expenses")} className="mt-4 text-xs text-[#7C3AED] tracking-widest hover:text-[#6D28D9]">
                REGISTRAR DESPESA →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

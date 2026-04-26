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
} from "lucide-react";

type Screen = "login" | "home" | "routes" | "route_detail" | "advance" | "history";

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

const GPS_ACTIVE_KEY = "trfarias_gps_active";
const DRIVER_SESSION_KEY = "trfarias_driver";

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

  const utils = trpc.useUtils();

  // Keep refs in sync so GPS callbacks always have latest values
  useEffect(() => { driverRef.current = driver; }, [driver]);
  useEffect(() => { selectedRouteRef.current = selectedRouteId; }, [selectedRouteId]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
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
    { enabled: !!driver && screen === "history" }
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
      // Auto-resume GPS if it was active before
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

    // watchPosition for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(sendPos, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });

    // Fallback interval every 30s to ensure we keep sending even if watch stalls
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

  // Auto-resume GPS on mount if session + flag present
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
      // Strip data URL prefix to get pure base64
      const base64 = result.split(",")[1];
      setPhotoPreview(result); // keep full data URL for preview
      (window as any)._photoBase64 = base64; // store for upload
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
        body: JSON.stringify({
          orderId,
          driverId: driver.id,
          imageBase64: base64,
          mimeType: photoMime,
        }),
      });
      if (!res.ok) throw new Error("Falha no upload");
      // After photo upload, mark as delivered
      await updateStatusMut.mutateAsync({
        orderId,
        driverId: driver.id,
        status: "delivered",
        note: "Entregue com comprovante fotográfico",
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

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // LOGIN SCREEN
  if (screen === "login") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Truck className="h-8 w-8 text-red-500" />
              <span className="text-2xl font-black tracking-widest text-white">TR FARIAS</span>
              <span className="text-2xl font-black tracking-widest text-red-500">EXPRESS</span>
            </div>
            <div className="h-0.5 bg-red-500 w-full my-3" />
            <p className="text-xs text-gray-400 tracking-widest">ÁREA DO MOTORISTA</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 tracking-widest block mb-1">CPF</label>
              <Input
                className="bg-zinc-900 border-zinc-700 text-white text-lg h-12 tracking-wider"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 tracking-widest block mb-1">PIN (6 dígitos)</label>
              <Input
                className="bg-zinc-900 border-zinc-700 text-white text-lg h-12 tracking-widest text-center"
                placeholder="• • • • • •"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-black tracking-widest text-base"
              disabled={cpf.replace(/\D/g, "").length < 11 || pin.length < 6 || loginMut.isPending}
              onClick={() => loginMut.mutate({ cpf: cpf.replace(/\D/g, ""), pin })}
            >
              {loginMut.isPending ? "ENTRANDO..." : "ENTRAR"}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-600 tracking-wider">
            Solicite seu PIN ao gestor da empresa
          </p>
        </div>
      </div>
    );
  }

  // SHARED HEADER
  const Header = ({ title, back }: { title: string; back?: () => void }) => (
    <div className="bg-black border-b border-zinc-800 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {back && (
            <button onClick={back} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <p className="text-xs text-red-500 font-black tracking-widest">{title}</p>
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
      <div className="h-0.5 bg-red-500" />
    </div>
  );

  // HOME SCREEN
  if (screen === "home") {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header title="TR FARIAS EXPRESS" />
        <div className="p-4 space-y-4">
          {/* GPS Status */}
          <div className={`rounded border p-4 flex items-center justify-between ${gpsActive ? "border-green-500 bg-green-500/10" : "border-zinc-700 bg-zinc-900"}`}>
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
              className={`text-xs font-bold tracking-widest ${gpsActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              onClick={gpsActive ? stopGPS : startGPS}
            >
              {gpsActive ? "PARAR" : "ATIVAR"}
            </Button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Truck, label: "MINHAS ROTAS", screen: "routes" as Screen, color: "text-blue-400" },
              { icon: DollarSign, label: "ADIANTAMENTO", screen: "advance" as Screen, color: "text-green-400" },
              { icon: Clock, label: "HISTÓRICO", screen: "history" as Screen, color: "text-yellow-400" },
              { icon: AlertTriangle, label: "OCORRÊNCIA", action: () => { setScreen("routes"); toast.info("Selecione uma rota e pedido para registrar ocorrência"); }, color: "text-red-400" },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action ?? (() => setScreen(item.screen!))}
                className="bg-zinc-900 border border-zinc-700 rounded p-4 flex flex-col items-center gap-2 hover:border-red-500 transition-colors active:scale-95"
              >
                <item.icon className={`h-7 w-7 ${item.color}`} />
                <span className="text-xs font-black tracking-widest text-center">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Active routes summary */}
          <div className="bg-zinc-900 border border-zinc-700 rounded p-4">
            <p className="text-xs text-gray-400 tracking-widest mb-3">ROTAS ATIVAS</p>
            {routesLoading ? (
              <div className="animate-pulse h-8 bg-zinc-800 rounded" />
            ) : !myRoutes?.length ? (
              <p className="text-sm text-gray-500 text-center py-2">Nenhuma rota atribuída</p>
            ) : (
              <div className="space-y-2">
                {myRoutes.slice(0, 3).map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRouteId(r.id); selectedRouteRef.current = r.id; setScreen("route_detail"); }}
                    className="w-full flex items-center justify-between text-left hover:text-red-400 transition-colors"
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
      <div className="min-h-screen bg-black text-white">
        <Header title="MINHAS ROTAS" back={() => setScreen("home")} />
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => refetchRoutes()} className="text-gray-400 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {routesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-zinc-900 rounded border border-zinc-800" />
            ))
          ) : !myRoutes?.length ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-gray-500 tracking-wider">NENHUMA ROTA ATRIBUÍDA</p>
            </div>
          ) : (
            myRoutes.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRouteId(r.id); selectedRouteRef.current = r.id; setScreen("route_detail"); }}
                className="w-full bg-zinc-900 border border-zinc-700 hover:border-red-500 rounded p-4 text-left transition-colors"
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
      <div className="min-h-screen bg-black text-white">
        <Header title={route?.routeCode ?? "DETALHES DA ROTA"} back={() => setScreen("routes")} />
        <div className="p-4 space-y-3">
          {route && (
            <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs text-gray-400 tracking-wider">
              <p>{route.originAddress} → {route.destAddress}</p>
              {route.distanceKm && <p>{route.distanceKm} km estimados</p>}
            </div>
          )}

          <p className="text-xs text-gray-400 tracking-widest">PEDIDOS DESTA ROTA</p>

          {ordersLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 bg-zinc-900 rounded border border-zinc-800" />
            ))
          ) : !routeOrders?.length ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum pedido nesta rota</p>
            </div>
          ) : (
            routeOrders.map(o => (
              <div key={o.id} className="bg-zinc-900 border border-zinc-700 rounded p-4 space-y-3">
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

                {o.totalWeight && (
                  <p className="text-xs text-gray-500">{o.totalWeight} kg</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold tracking-widest h-8"
                    onClick={() => { setUpdOrderId(o.id); setShowStatusForm(true); }}
                  >
                    ATUALIZAR STATUS
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 text-red-400 text-xs font-bold tracking-widest h-8"
                    onClick={() => { setOccOrderId(o.id); setShowOccForm(true); }}
                  >
                    OCORRÊNCIA
                  </Button>
                  {o.status === "in_transit" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-xs font-bold tracking-widest h-8"
                        onClick={() => { setPhotoOrderId(o.id); setShowPhotoForm(true); }}
                      >
                        <Camera className="h-3 w-3 mr-1" /> FOTO + ENTREGUE
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 text-xs font-bold tracking-widest h-8"
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
              <div className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest">COMPROVANTE DE ENTREGA</p>
                  <button onClick={() => { setShowPhotoForm(false); setPhotoPreview(null); setPhotoOrderId(null); (window as any)._photoBase64 = null; }}>
                    <XCircle className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                <div className="h-0.5 bg-red-500" />

                {/* Camera input */}
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
                    <img src={photoPreview} alt="Comprovante" className="w-full max-h-48 object-cover rounded border border-zinc-700" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-zinc-600 text-gray-400 text-xs"
                        onClick={() => { setPhotoPreview(null); (window as any)._photoBase64 = null; }}
                      >
                        TROCAR FOTO
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 font-black tracking-widest text-xs"
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
                      className="w-full h-14 bg-red-600 hover:bg-red-700 font-black tracking-widest"
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
              <div className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest">ATUALIZAR STATUS</p>
                  <button onClick={() => setShowStatusForm(false)}><XCircle className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className="h-0.5 bg-red-500" />
                <Select value={updStatus} onValueChange={setUpdStatus}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="in_transit">EM TRÂNSITO</SelectItem>
                    <SelectItem value="delivered">ENTREGUE</SelectItem>
                    <SelectItem value="returned">DEVOLVIDO</SelectItem>
                    <SelectItem value="cancelled">CANCELADO</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="bg-zinc-800 border-zinc-600 text-white"
                  placeholder="Observação (opcional)"
                  value={updNote}
                  onChange={e => setUpdNote(e.target.value)}
                />
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 font-black tracking-widest"
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
              <div className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest">REGISTRAR OCORRÊNCIA</p>
                  <button onClick={() => setShowOccForm(false)}><XCircle className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className="h-0.5 bg-red-500" />
                <Select value={occType} onValueChange={setOccType}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 text-white">
                    <SelectValue placeholder="Tipo de ocorrência" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="damage">AVARIA NA CARGA</SelectItem>
                    <SelectItem value="refusal">RECUSA DO DESTINATÁRIO</SelectItem>
                    <SelectItem value="address_not_found">ENDEREÇO NÃO ENCONTRADO</SelectItem>
                    <SelectItem value="recipient_absent">DESTINATÁRIO AUSENTE</SelectItem>
                    <SelectItem value="delay">ATRASO</SelectItem>
                    <SelectItem value="other">OUTRO</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="bg-zinc-800 border-zinc-600 text-white"
                  placeholder="Descreva a ocorrência (mín. 10 caracteres)"
                  value={occDesc}
                  onChange={e => setOccDesc(e.target.value)}
                />
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 font-black tracking-widest"
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
      <div className="min-h-screen bg-black text-white">
        <Header title="SOLICITAR ADIANTAMENTO" back={() => setScreen("home")} />
        <div className="p-4 space-y-4">
          <div className="bg-zinc-900 border border-yellow-500/30 rounded p-3 text-xs text-yellow-400 tracking-wider">
            ⚠ Solicitações são analisadas pelo gestor. Máximo: R$ 5.000,00 por solicitação.
          </div>

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">VALOR SOLICITADO (R$)</label>
            <Input
              type="number"
              min="10"
              max="5000"
              step="10"
              className="bg-zinc-900 border-zinc-700 text-white text-xl h-14 font-bold"
              placeholder="0,00"
              value={advAmount}
              onChange={e => setAdvAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 tracking-widest block mb-1">MOTIVO (mín. 10 caracteres)</label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-700 rounded text-white text-sm p-3 min-h-[100px] resize-none focus:outline-none focus:border-red-500"
              placeholder="Descreva o motivo do adiantamento..."
              value={advReason}
              onChange={e => setAdvReason(e.target.value)}
            />
          </div>

          <Button
            className="w-full h-12 bg-green-600 hover:bg-green-700 font-black tracking-widest text-base"
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
      <div className="min-h-screen bg-black text-white">
        <Header title="HISTÓRICO" back={() => setScreen("home")} />
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button onClick={() => refetchAdvances()} className="text-gray-400 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 tracking-widest">ADIANTAMENTOS</p>
          {!myAdvances?.length ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum adiantamento solicitado</p>
          ) : (
            myAdvances.map(a => (
              <div key={a.id} className="bg-zinc-900 border border-zinc-700 rounded p-4">
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
                  <p className="text-xs text-gray-500 mt-2 border-t border-zinc-800 pt-2">Nota: {a.reviewNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}

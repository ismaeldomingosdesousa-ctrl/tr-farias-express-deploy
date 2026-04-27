import { trpc } from "@/lib/trpc";
import { MapView, type MapMarker } from "@/components/Map";
import { MapPin, Navigation, Truck, Clock, AlertTriangle, Shield } from "lucide-react";
import { useState, useMemo } from "react";

export default function Tracking() {
  const { data: vehicles } = trpc.vehicles.list.useQuery();
  const { data: orders } = trpc.orders.list.useQuery({ status: "in_transit" });
  const { data: routes } = trpc.routes.list.useQuery();
  const { data: driversWithGps } = trpc.drivers.list.useQuery();
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [panTo, setPanTo] = useState<{ lat: number; lng: number } | null>(null);

  const activeVehicles = vehicles?.filter(v => v.status === "in_use" && v.lat && v.lng) ?? [];
  const activeRoutes = useMemo(() => routes?.filter(r => r.status === "in_progress") ?? [], [routes]);
  const activeDrivers = (driversWithGps ?? []).filter(d => d.lat && d.lng && (d.status === "available" || d.status === "on_trip"));

  const selectedRoute = activeRoutes.find(r => r.id === selectedRouteId);
  const vehicleForRoute = selectedRoute?.vehicleId
    ? vehicles?.find(v => v.id === selectedRoute.vehicleId)
    : null;

  const etaQuery = trpc.tracking.calculateETA.useQuery({
    routeId: selectedRouteId!,
    currentLat: vehicleForRoute?.lat ?? -15.77,
    currentLng: vehicleForRoute?.lng ?? -47.92,
    speedKmh: 60,
  }, {
    enabled: !!selectedRouteId && !!vehicleForRoute?.lat,
    refetchInterval: 30000,
  });

  const geofenceQuery = trpc.tracking.checkGeofence.useQuery({
    routeId: selectedRouteId!,
    lat: vehicleForRoute?.lat ?? -15.77,
    lng: vehicleForRoute?.lng ?? -47.92,
    corridorRadiusKm: 15,
  }, {
    enabled: !!selectedRouteId && !!vehicleForRoute?.lat,
    refetchInterval: 30000,
  });

  const mapMarkers = useMemo<MapMarker[]>(() => [
    ...activeVehicles.map(v => ({
      lat: v.lat!,
      lng: v.lng!,
      title: `${v.plate} - ${v.type}`,
      color: "red" as const,
    })),
    ...activeDrivers.map(d => ({
      lat: d.lat!,
      lng: d.lng!,
      title: `${d.name} (Motorista)`,
      color: "green" as const,
    })),
  ], [activeVehicles, activeDrivers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">RASTREAMENTO</h1>
        <div className="brutal-divider mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="brutal-card">
            <h3 className="text-sm font-bold tracking-widest text-foreground mb-3">VEÍCULOS EM ROTA</h3>
            <div className="brutal-divider mb-3" />
            {activeVehicles.length === 0 ? (
              <p className="text-xs text-muted-foreground tracking-wider">NENHUM VEÍCULO EM ROTA</p>
            ) : (
              <div className="space-y-2">
                {activeVehicles.map(v => (
                  <div key={v.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => v.lat && v.lng && setPanTo({ lat: v.lat, lng: v.lng })}>
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-wider truncate">{v.plate}</p>
                      <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="brutal-card">
            <h3 className="text-sm font-bold tracking-widest text-foreground mb-3">ENTREGAS EM TRÂNSITO</h3>
            <div className="brutal-divider mb-3" />
            {!orders?.length ? (
              <p className="text-xs text-muted-foreground tracking-wider">NENHUMA ENTREGA EM TRÂNSITO</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 10).map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-2 hover:bg-accent/30 transition-colors">
                    <Navigation className="h-3 w-3 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wider truncate">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.destCity}/{o.destState}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="brutal-card">
            <h3 className="text-sm font-bold tracking-widest text-foreground mb-3">ROTAS ATIVAS</h3>
            <div className="brutal-divider mb-3" />
            {activeRoutes.length === 0 ? (
              <p className="text-xs text-muted-foreground tracking-wider">NENHUMA ROTA ATIVA</p>
            ) : (
              <div className="space-y-2">
                {activeRoutes.slice(0, 10).map(r => (
                  <div key={r.id}
                    className={`flex items-center gap-2 p-2 hover:bg-accent/30 transition-colors cursor-pointer ${selectedRouteId === r.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                    onClick={() => setSelectedRouteId(r.id === selectedRouteId ? null : r.id)}>
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wider truncate">{r.routeCode}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.distanceKm ? `${r.distanceKm} km` : "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="brutal-card">
            <h3 className="text-sm font-bold tracking-widest text-foreground mb-3">MOTORISTAS COM GPS</h3>
            <div className="brutal-divider mb-3" />
            {activeDrivers.length === 0 ? (
              <p className="text-xs text-muted-foreground tracking-wider">NENHUM MOTORISTA COM GPS ATIVO</p>
            ) : (
              <div className="space-y-2">
                {activeDrivers.map(d => (
                  <div key={d.id}
                    className="flex items-start gap-2 p-2 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => d.lat && d.lng && setPanTo({ lat: d.lat, lng: d.lng })}>
                    <Navigation className="h-3 w-3 text-green-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wider truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.lat?.toFixed(4)}, {d.lng?.toFixed(4)}</p>
                      {d.lastLocationUpdate && (
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(d.lastLocationUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map + ETA/Geofence panels */}
        <div className="lg:col-span-3 space-y-4">
          {selectedRouteId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="brutal-card">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-widest text-foreground">ETA - PREVISÃO DE CHEGADA</h3>
                </div>
                <div className="brutal-divider mb-3" />
                {etaQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground tracking-wider">CALCULANDO...</p>
                ) : etaQuery.data && !("error" in etaQuery.data) ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground tracking-wider">DISTÂNCIA RESTANTE</span>
                      <span className="text-sm font-bold text-foreground">{etaQuery.data.remainingDistanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground tracking-wider">TEMPO ESTIMADO</span>
                      <span className="text-sm font-bold text-foreground">
                        {etaQuery.data.etaMinutes < 60
                          ? `${etaQuery.data.etaMinutes} min`
                          : `${Math.floor(etaQuery.data.etaMinutes / 60)}h ${etaQuery.data.etaMinutes % 60}min`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground tracking-wider">CHEGADA PREVISTA</span>
                      <span className="text-sm font-bold text-primary">
                        {new Date(etaQuery.data.estimatedArrival).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground tracking-wider">
                    {etaQuery.data && "error" in etaQuery.data ? String(etaQuery.data.error) : "SEM DADOS DE ROTA"}
                  </p>
                )}
              </div>

              <div className="brutal-card">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold tracking-widest text-foreground">GEOFENCING</h3>
                </div>
                <div className="brutal-divider mb-3" />
                {geofenceQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground tracking-wider">VERIFICANDO...</p>
                ) : geofenceQuery.data ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {geofenceQuery.data.deviationDetected ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-primary animate-pulse" />
                          <span className="text-sm font-bold text-primary tracking-wider">DESVIO DETECTADO</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-bold text-green-500 tracking-wider">DENTRO DO CORREDOR</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tracking-wider">{geofenceQuery.data.message}</p>
                    <p className="text-xs text-muted-foreground tracking-wider">
                      ROTA: {selectedRoute?.routeCode} | CORREDOR: 15 km
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground tracking-wider">SEM DADOS DISPONÍVEIS</p>
                )}
              </div>
            </div>
          )}

          <div className="brutal-card p-0 overflow-hidden">
            <MapView
              className="w-full h-[600px]"
              initialCenter={{ lat: -15.77, lng: -47.92 }}
              initialZoom={4}
              markers={mapMarkers}
              panTo={panTo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

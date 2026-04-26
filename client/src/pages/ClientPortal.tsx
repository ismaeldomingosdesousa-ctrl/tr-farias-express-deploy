import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, MapPin, Phone, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending", label: "PEDIDO RECEBIDO" },
  { key: "confirmed", label: "CONFIRMADO" },
  { key: "picking", label: "SEPARAÇÃO" },
  { key: "packed", label: "EMBALADO" },
  { key: "awaiting_pickup", label: "AGUARD. COLETA" },
  { key: "in_transit", label: "EM TRÂNSITO" },
  { key: "delivered", label: "ENTREGUE" },
];

const statusIndex = (s: string) => STATUS_STEPS.findIndex(x => x.key === s);

function StatusTimeline({ status }: { status: string }) {
  const current = statusIndex(status);
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <span className="text-red-400 font-bold tracking-widest text-sm">PEDIDO CANCELADO</span>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {STATUS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            i < current ? "bg-green-500" : i === current ? "bg-red-500 animate-pulse" : "bg-zinc-700"
          }`}>
            {i < current && <CheckCircle2 className="h-3 w-3 text-white" />}
            {i === current && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
          <span className={`text-xs tracking-widest ${
            i < current ? "text-green-400" : i === current ? "text-white font-bold" : "text-zinc-600"
          }`}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, token }: { order: any; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = trpc.clientPortal.orderDetail.useQuery(
    { token, orderId: order.order.id },
    { enabled: expanded }
  );

  const o = order.order;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded overflow-hidden">
      <button
        className="w-full p-4 text-left flex items-start justify-between"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="font-black tracking-widest text-sm">{o.orderNumber}</p>
          <p className="text-xs text-gray-400 mt-1">{o.destCity} — {o.destState}</p>
          {o.estimatedDelivery && (
            <p className="text-xs text-gray-500 mt-0.5">
              Previsão: {new Date(o.estimatedDelivery).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-black tracking-widest ${
            o.status === "delivered" ? "text-green-400" :
            o.status === "in_transit" ? "text-blue-400" :
            o.status === "cancelled" ? "text-red-400" : "text-yellow-400"
          }`}>
            {STATUS_STEPS.find(s => s.key === o.status)?.label ?? o.status.toUpperCase()}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          <StatusTimeline status={o.status} />

          {/* Driver info */}
          {order.driverName && (
            <div className="bg-zinc-800 rounded p-3 flex items-center gap-3">
              <Truck className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-bold">{order.driverName}</p>
                {order.driverPhone && (
                  <a href={`tel:${order.driverPhone}`} className="text-xs text-blue-400 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {order.driverPhone}
                  </a>
                )}
                {order.vehiclePlate && <p className="text-xs text-gray-500">Placa: {order.vehiclePlate}</p>}
              </div>
            </div>
          )}

          {/* Live map if in transit */}
          {o.status === "in_transit" && detail?.driverLat && detail?.driverLng && (
            <div className="rounded overflow-hidden h-48">
              <MapView
                onMapReady={(map) => {
                  const driverPos = { lat: detail.driverLat!, lng: detail.driverLng! };
                  new google.maps.Marker({ position: driverPos, map, title: "Motorista" });
                  if (o.destLat && o.destLng) {
                    new google.maps.Marker({
                      position: { lat: o.destLat, lng: o.destLng },
                      map,
                      title: "Destino",
                      icon: { url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }
                    });
                  }
                  map.setCenter(driverPos);
                  map.setZoom(13);
                }}
              />
            </div>
          )}

          {/* Delivery address */}
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{o.destAddress}, {o.destCity} — {o.destState}</span>
          </div>

          {/* Status history */}
          {detail?.history && detail.history.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 tracking-widest mb-2">HISTÓRICO</p>
              <div className="space-y-1">
                {detail.history.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{h.toStatus?.toUpperCase()}</span>
                    <span className="text-gray-600">{new Date(h.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientPortal() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const { data: clientData, isLoading: validating, error } = trpc.clientPortal.validateToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const { data: orders, isLoading: ordersLoading } = trpc.clientPortal.myOrders.useQuery(
    { token },
    { enabled: !!clientData, refetchInterval: 60000 }
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="h-0.5 bg-red-500 w-32 mx-auto" />
          <p className="text-white font-black tracking-widest text-xl">TR FARIAS EXPRESS</p>
          <p className="text-gray-500 text-sm tracking-wider">Link de acesso inválido</p>
          <p className="text-gray-600 text-xs">Solicite um novo link ao responsável pela entrega</p>
        </div>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-3">
          <Truck className="h-10 w-10 text-red-500 mx-auto animate-pulse" />
          <p className="text-white tracking-widest text-sm">VERIFICANDO ACESSO...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-white font-black tracking-widest">ACESSO NEGADO</p>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-black border-b border-zinc-800 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-red-500" />
            <span className="font-black tracking-widest text-sm">TR FARIAS EXPRESS</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 tracking-wider">PORTAL DO CLIENTE — {clientData?.client?.name}</p>
        </div>
        <div className="h-0.5 bg-red-500" />
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "TOTAL", value: orders?.length ?? 0, icon: Package, color: "text-white" },
            { label: "EM ROTA", value: orders?.filter(o => o.order.status === "in_transit").length ?? 0, icon: Truck, color: "text-blue-400" },
            { label: "ENTREGUES", value: orders?.filter(o => o.order.status === "delivered").length ?? 0, icon: CheckCircle2, color: "text-green-400" },
          ].map(item => (
            <div key={item.label} className="bg-zinc-900 border border-zinc-700 rounded p-3 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
              <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 tracking-widest">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Orders list */}
        <p className="text-xs text-gray-400 tracking-widest">SEUS PEDIDOS</p>

        {ordersLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-20 bg-zinc-900 rounded border border-zinc-800" />
          ))
        ) : !orders?.length ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-gray-500 tracking-wider">NENHUM PEDIDO ENCONTRADO</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.order.id} order={order} token={token} />
          ))
        )}

        <div className="text-center pt-4">
          <p className="text-xs text-zinc-700 tracking-wider">
            Atualizado automaticamente a cada 60s
          </p>
        </div>
      </div>
    </div>
  );
}

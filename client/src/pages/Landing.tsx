import { getLoginUrl } from "@/const";
import {
  Package, Warehouse, DollarSign, MapPin, BarChart3,
  CheckCircle2, ArrowRight, Zap, Shield, Clock, Star,
  ChevronRight, Menu, X, Play, Truck,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/Logo";

/* ─── Navbar ────────────────────────────────────────────────── */

function Navbar() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080818]/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Logo size="md" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {["Funcionalidades", "Como Funciona", "Planos"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "-").replace("ç", "c").replace("õ", "o")}`}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-sm font-semibold px-4 py-2 rounded-[50px] hover:scale-[1.03] transition-all shadow-[0_4px_14px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.55)]"
          >
            Começar grátis <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-muted-foreground hover:text-white"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#0D0D2E] px-6 py-4 flex flex-col gap-4 animate-fade-in">
          {["Funcionalidades", "Como Funciona", "Planos"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
              onClick={() => setOpen(false)}
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-sm font-semibold py-2.5 rounded-[50px] hover:scale-[1.03] transition-all"
          >
            Começar grátis
          </button>
        </div>
      )}
    </header>
  );
}

/* ─── Hero ──────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="hero-gradient min-h-screen flex items-center pt-16 relative overflow-hidden">
      {/* Background accent circles */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Label */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="section-label" style={{ fontSize: "0.7rem" }}>
              Plataforma TMS / OMS / WMS All-in-One
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-slide-up"
            style={{ letterSpacing: "-0.03em" }}
          >
            Logística que{" "}
            <span className="text-gradient-red">não para.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up delay-100">
            Gerencie pedidos, frota, armazém e finanças em uma única plataforma.
            Feito para transportadoras que querem escalar sem perder o controle.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up delay-200">
            <button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white font-bold px-8 py-4 rounded-[50px] hover:scale-[1.03] transition-all shadow-[0_6px_24px_rgba(124,58,237,0.45)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.65)] text-base group"
            >
              Começar Gratuitamente
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center gap-2 border border-white/15 text-white font-semibold px-8 py-4 rounded-[50px] hover:bg-white/5 hover:border-white/25 transition-all text-base">
              <Play className="h-4 w-4 text-primary" />
              Ver Demonstração
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto animate-fade-in delay-300">
            {[
              { value: "3.800+", label: "pedidos/mês" },
              { value: "200+",   label: "motoristas" },
              { value: "98%",    label: "satisfação" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-white">{value}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080818] to-transparent pointer-events-none" />
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────── */

const features = [
  {
    icon: Package,
    title: "Gestão de Pedidos (OMS)",
    description:
      "Controle total desde a criação até a entrega. Rastreie status, gerencie exceções e notifique clientes automaticamente.",
  },
  {
    icon: Truck,
    title: "Transporte (TMS)",
    description:
      "Planeje rotas otimizadas, gerencie sua frota e acompanhe motoristas em tempo real via GPS integrado.",
  },
  {
    icon: Warehouse,
    title: "Armazém (WMS)",
    description:
      "Controle de estoque inteligente com movimentações, localizações e inventário em tempo real.",
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    description:
      "Receitas, despesas, fluxo de caixa e relatórios financeiros completos integrados à operação.",
  },
  {
    icon: MapPin,
    title: "Rastreamento ao Vivo",
    description:
      "Mapa em tempo real para clientes e gestores. Comprovante fotográfico de entrega direto do celular.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e BI",
    description:
      "Dashboards analíticos com KPIs operacionais, financeiros e de satisfação para decisões mais inteligentes.",
  },
];

function Features() {
  return (
    <section id="funcionalidades" className="py-24 bg-[#080818]">
      <div className="container">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Funcionalidades</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Tudo que sua operação precisa
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Módulos integrados que se comunicam em tempo real para eliminar retrabalho
            e maximizar eficiência.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="feature-card animate-slide-up"
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both", opacity: 0 }}
            >
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2 tracking-tight">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ──────────────────────────────────────────── */

const steps = [
  {
    num: "01",
    icon: Zap,
    title: "Configure sua operação",
    description:
      "Cadastre motoristas, veículos, clientes e rotas em minutos. Interface intuitiva, sem necessidade de treinamento extenso.",
  },
  {
    num: "02",
    icon: Clock,
    title: "Gerencie em tempo real",
    description:
      "Acompanhe pedidos, posição da frota e alertas críticos em um único dashboard. Decisões mais rápidas, menos ligações.",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "Analise e otimize",
    description:
      "Relatórios automáticos com indicadores de performance. Identifique gargalos e oportunidades de melhoria contínua.",
  },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-[#0D0D2E]">
      <div className="container">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Como Funciona</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Simples de implantar,{" "}
            <span className="text-gradient-red">poderoso na prática</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line on desktop */}
          <div className="hidden md:block absolute top-10 left-[25%] right-[25%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {steps.map(({ num, icon: Icon, title, description }, i) => (
            <div
              key={num}
              className="text-center animate-slide-up"
              style={{ animationDelay: `${i * 0.12}s`, animationFillMode: "both", opacity: 0 }}
            >
              <div className="relative inline-flex mb-6">
                <div className="h-20 w-20 bg-[#12122A] border border-border rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(124,58,237,0.12)]">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 text-xs font-black text-primary bg-[#080818] border border-primary/30 rounded-full h-6 w-6 flex items-center justify-center">
                  {num.slice(1)}
                </span>
              </div>
              <h3 className="font-bold text-white text-xl mb-3 tracking-tight">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Plans ─────────────────────────────────────────────────── */

const plans = [
  {
    name: "Starter",
    price: "R$ 497",
    period: "/mês",
    description: "Ideal para pequenas transportadoras",
    highlight: false,
    features: [
      "Até 500 pedidos/mês",
      "10 motoristas",
      "OMS + TMS básico",
      "Rastreamento ao vivo",
      "Suporte por e-mail",
      "1 usuário admin",
    ],
    cta: "Começar agora",
  },
  {
    name: "Pro",
    price: "R$ 997",
    period: "/mês",
    description: "Para operações em crescimento",
    highlight: true,
    badge: "Mais popular",
    features: [
      "Pedidos ilimitados",
      "Motoristas ilimitados",
      "OMS + TMS + WMS + Fiscal",
      "Módulo Financeiro completo",
      "Notificações automáticas",
      "API + Integrações",
      "Suporte prioritário 8h",
      "5 usuários admin",
    ],
    cta: "Começar grátis por 14 dias",
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes operações",
    highlight: false,
    features: [
      "Tudo do Pro",
      "SLA personalizado",
      "Integração ERP (SAP, TOTVS)",
      "White-label disponível",
      "Gestor de conta dedicado",
      "Treinamento presencial",
      "Usuários ilimitados",
    ],
    cta: "Falar com vendas",
  },
];

function Plans() {
  return (
    <section id="planos" className="py-24 bg-[#080818]">
      <div className="container">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Planos</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Escolha o plano ideal
          </h2>
          <p className="text-muted-foreground text-lg">
            14 dias grátis em todos os planos. Cancele quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map(({ name, price, period, description, highlight, badge, features, cta }) => (
            <div
              key={name}
              className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 ${
                highlight
                  ? "bg-[#12122A] border-primary shadow-[0_0_40px_rgba(124,58,237,0.3)] scale-105"
                  : "bg-[#0D0D2E] border-border hover:border-primary/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.12)]"
              }`}
            >
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white text-xs font-bold px-4 py-1 rounded-full">
                  {badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-black text-white text-2xl tracking-tight mb-1">{name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{price}</span>
                  {period && <span className="text-muted-foreground text-sm">{period}</span>}
                </div>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => { window.location.href = getLoginUrl(); }}
                className={`w-full py-3 rounded-[50px] font-bold text-sm transition-all ${
                  highlight
                    ? "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-[0_4px_14px_rgba(124,58,237,0.45)] hover:scale-[1.03] hover:shadow-[0_6px_20px_rgba(124,58,237,0.6)]"
                    : "border border-border text-white hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/40"
                }`}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ──────────────────────────────────────────── */

const testimonials = [
  {
    quote:
      "Reduzimos o tempo de despacho em 40% após implementar o TR Farias Express. A visibilidade em tempo real mudou completamente nossa operação.",
    name: "Carlos Mendonça",
    role: "Diretor de Operações",
    company: "LogBrasil Transportes",
    stars: 5,
  },
  {
    quote:
      "A capacidade de rastrear pedidos ao vivo transformou nosso relacionamento com os clientes. Zero ligações de 'onde está meu pedido'.",
    name: "Fernanda Costa",
    role: "CEO",
    company: "TransNorte Express",
    stars: 5,
  },
  {
    quote:
      "Integramos com nosso ERP em 2 dias. A equipe de suporte é excepcional e o sistema é extremamente estável.",
    name: "Rafael Almeida",
    role: "CTO",
    company: "Fast Cargo Soluções",
    stars: 5,
  },
];

function Testimonials() {
  return (
    <section className="py-24 bg-[#0D0D2E]">
      <div className="container">
        <div className="text-center mb-16">
          <p className="section-label mb-3">Depoimentos</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Quem usa, confia
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ quote, name, role, company, stars }, i) => (
            <div
              key={name}
              className="glass-card p-7 animate-slide-up"
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both", opacity: 0 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: stars }).map((_, si) => (
                  <Star key={si} className="h-4 w-4 text-primary fill-primary" />
                ))}
              </div>

              <blockquote className="text-foreground text-sm leading-relaxed mb-6">
                "{quote}"
              </blockquote>

              <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                  {name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{name}</p>
                  <p className="text-muted-foreground text-xs">
                    {role} · {company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Final ─────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)" }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }}
      />

      <div className="container relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          Pronto para transformar sua logística?
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
          Experimente gratuitamente por 14 dias. Sem cartão de crédito.
          Cancelamento a qualquer momento.
        </p>
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="inline-flex items-center gap-2 bg-white text-[#7C3AED] font-black px-10 py-5 rounded-[50px] text-lg hover:bg-white/90 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:scale-[1.03] group"
        >
          Começar Agora — É Grátis
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-white/50 text-sm mt-4">
          Mais de 200 transportadoras já escolheram o TR Farias Express
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────── */

const footerLinks = {
  Produto: ["Funcionalidades", "Planos", "Integrações", "Segurança", "Changelog"],
  Empresa: ["Sobre nós", "Blog", "Carreiras", "Imprensa"],
  Suporte: ["Documentação", "Status do Sistema", "Central de Ajuda", "Contato"],
  Legal: ["Privacidade", "Termos de Uso", "Cookies"],
};

function Footer() {
  return (
    <footer className="bg-[#080818] border-t border-border pt-16 pb-8">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Logo size="sm" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Plataforma de gestão logística all-in-one para transportadoras modernas.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">LGPD Compliant</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="font-semibold text-white text-sm mb-4">{section}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground text-sm hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2025 TR Farias Express. Todos os direitos reservados.
          </p>
          <p className="text-muted-foreground text-xs">
            Feito com dedicação para a logística brasileira
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#080818]">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Plans />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

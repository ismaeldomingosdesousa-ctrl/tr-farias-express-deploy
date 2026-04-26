# TR Farias Express - TODO

## Infraestrutura & Design
- [x] Tema brutalista: fundo preto, tipografia branca condensada, linhas vermelhas
- [x] DashboardLayout com sidebar de navegação para todos os módulos
- [x] Sistema de autenticação e controle de acesso (admin/user)

## Banco de Dados
- [x] Schema completo: pedidos, itens, clientes, motoristas, veículos, armazéns, estoque, movimentações, cotações, documentos fiscais, financeiro, alertas, rotas

## Backend (tRPC Routers)
- [x] Router de Dashboard (KPIs em tempo real)
- [x] Router OMS (CRUD pedidos, status, histórico)
- [x] Router TMS (rotas, veículos, alocação, frota)
- [x] Router WMS (armazéns, estoque, movimentações, picking/packing)
- [x] Router de Cotação (precificação dinâmica)
- [x] Router de Agenciamento (motoristas, documentação, disponibilidade)
- [x] Router de Rastreamento (tracking em tempo real)
- [x] Router Financeiro (contas a pagar/receber, fluxo de caixa, faturamento)
- [x] Router Fiscal (CT-e, MDF-e, validação)
- [x] Router de Relatórios (filtros, exportação)
- [x] Router de Alertas (email, in-app)

## Frontend - Páginas
- [x] Dashboard operacional com KPIs, gráficos e alertas
- [x] Página OMS - listagem, criação, detalhes de pedidos
- [x] Página TMS - gestão de rotas, veículos e frota
- [x] Página WMS - armazéns, estoque e movimentações
- [x] Página de Cotação - simulador de preços
- [x] Página de Agenciamento - cadastro e gestão de motoristas
- [x] Página de Rastreamento - mapa em tempo real
- [x] Página Financeiro - contas, fluxo de caixa, faturamento
- [x] Página Fiscal - emissão e consulta de CT-e/MDF-e
- [x] Página de Relatórios - geração e exportação

## Integrações
- [x] Google Maps - rotas, geolocalização, ETA, geofencing
- [x] Sistema de alertas (email + in-app)
- [x] Stripe - pagamento de fretes, adiantamentos, faturas recorrentes

## Testes
- [x] Testes unitários dos routers principais (27 testes passando)

## Melhorias Identificadas
- [x] Controle de acesso admin/user no frontend (rotas protegidas por papel)
- [x] Router backend de relatórios com filtros server-side
- [x] Cálculo de ETA e regras de geofencing com alertas automáticos
- [x] Envio de alertas por email (notificação do owner)
- [x] Fluxo Stripe para faturas recorrentes (subscriptions)

## Integração Frontend & Testes Adicionais
- [x] Integrar ETA e geofencing no frontend (Rastreamento)
- [x] Integrar fluxo de assinatura recorrente Stripe no frontend (Financeiro)
- [x] Testes Vitest para tracking.calculateETA e tracking.checkGeofence
- [x] Testes Vitest para Stripe recorrente (9 testes - createCheckout, createSubscription, listSubscriptions, cancelSubscription, getPaymentHistory)

## Bug Fixes
- [x] Fix: Google Maps JavaScript API carregado múltiplas vezes na página /fiscal
- [x] Criar página dedicada de Clientes com formulário de cadastro, listagem, edição e inativação
- [x] Adicionar link de Clientes na sidebar do DashboardLayout
- [x] Registrar rota /clients no App.tsx
- [x] Backend: procedure quotes.convertToOrder que cria pedido a partir de cotação aprovada
- [x] Frontend: botão "CONVERTER EM PEDIDO" na listagem de cotações aprovadas
- [x] Frontend: feedback visual após conversão (toast + badge "CONVERTIDA")
- [x] Remover integração Stripe do módulo Financeiro (frontend)
- [x] Reescrever página Financeiro com registro manual de lançamentos (receitas/despesas)
- [x] Manter backend financeiro existente (contas a pagar/receber, fluxo de caixa)
- [x] Remover router Stripe da sidebar e rotas (sem excluir o código backend por segurança)
- [x] Criar README.md completo em português com documentação técnica e guia de provisionamento

## PWA Motorista & Portal do Cliente
- [x] Backend: schema para adiantamentos (driver_advances) e tokens de acesso de cliente (client_access_tokens)
- [x] Backend: router driverApp (login por CPF/PIN, rotas atribuídas, envio de GPS, atualização de status, solicitação de adiantamento)
- [x] Backend: router clientPortal (acesso por token, visualização de pedidos do cliente, rastreamento)
- [x] Backend: router advances (aprovação/rejeição de adiantamentos pelo gestor)
- [x] PWA: manifest.json e service worker para instalação no Android
- [x] PWA: tela de login do motorista (CPF + PIN de 6 dígitos)
- [x] PWA: tela de rotas atribuídas ao motorista
- [x] PWA: envio de localização GPS em tempo real
- [x] PWA: atualização de status da entrega (em rota, entregue, ocorrência)
- [x] PWA: solicitação de adiantamento financeiro
- [x] PWA: histórico de viagens e adiantamentos
- [x] Admin: página /access - gestão de adiantamentos (aprovar/rejeitar/marcar pago)
- [x] Admin: página /access - gestão de tokens de cliente (gerar/revogar/copiar link)
- [x] Portal cliente: página pública /track?token=... com timeline de status e mapa ao vivo
- [x] 40 testes automatizados passando (auth, features, stripe)

## Gaps Identificados
- [x] Registrar service worker do PWA no cliente (main.tsx + client/public/sw.js)
- [x] Testes automatizados para driverApp e clientPortal routers (16 testes - pwa.test.ts) — total: 56 testes

## Controle de Status de Rotas
- [x] Backend: procedure routes.update com cascade de status de pedidos
- [x] Frontend: botões INICIAR / CONCLUIR / CANCELAR na listagem de rotas
- [x] Frontend: ao iniciar rota, pedidos do motorista passam para EM TRÂNSITO automaticamente
- [x] Frontend: ao concluir rota, pedidos do motorista passam para ENTREGUE automaticamente

## Vínculo Pedido ↔ Rota (Melhoria de Precisão)
- [x] Adicionar campo routeId na tabela orders para vínculo explícito pedido-rota
- [x] Ajustar cascade de status para usar routeId em vez de driverId
- [x] Adicionar campo routeId no schema e migração aplicada com sucesso
- [x] Adicionar selector de rota e motorista no formulário de pedidos (OMS) para vincular routeId e driverId

## Melhorias Sprint 3
- [x] Backend: ao aprovar/pagar adiantamento, criar lançamento financeiro automático (saída) vinculado ao pedido
- [x] Backend: ao mudar status do pedido para "Em Trânsito" ou "Entregue", enviar email automático ao cliente com link de rastreamento
- [x] Backend: endpoint REST /api/delivery/photo-upload para upload de foto de comprovante (S3)
- [x] Frontend Financeiro: aba "Adiantamentos" mostrando todos os adiantamentos de motoristas com vínculo ao pedido
- [x] PWA: GPS persistente — manter rastreamento ativo mesmo após atualização de página (localStorage + watchPosition com cleanup)
- [x] Frontend: preenchimento automático de endereço via CEP (ViaCEP API) nos formulários de pedido e rota
- [x] Frontend TMS: cálculo automático de distância e tempo de rota via Google Maps ao informar origem e destino
- [x] PWA: funcionalidade de foto de comprovante de entrega com câmera do celular (input capture=environment)
- [x] Frontend: envio automático de email ao cliente ao marcar pedido como entregue (via orders.updateStatus backend)

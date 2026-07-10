# FishMarket Cloud — Frontend del Marketplace (Grupo 1)

Interfaz principal del marketplace de artículos de pesca, construida en React + Vite, que consume el BFF de Grupo 1.

**Producción:** https://fish-market-frontend-g1.vercel.app
**BFF (backend):** https://bff-mock-g1.vercel.app
**Repositorio BFF:** https://github.com/FranKix20/Bff-mock-G1

Cumple los requisitos funcionales pedidos para Grupo 1: iniciar sesión, buscar y paginar el catálogo, agregar productos al carrito, generar un pedido (checkout con idempotencia) y ver el estado del pedido. Además incluye detalle de producto, notificaciones y un widget de chat (Grupo 11), que no eran obligatorios pero ya están conectados en el BFF.

## Cómo está armado el sistema (visión general)

Son **dos proyectos separados**, cada uno con su propio repositorio de GitHub y su propio proyecto en Vercel:

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  FishMarket-Frontend-G1      │  HTTPS │  Bff-mock-G1                  │
│  React + Vite (estático)     │ ─────▶ │  Node/Express (serverless)    │
│  fish-market-frontend-g1     │        │  bff-mock-g1.vercel.app       │
│  .vercel.app                 │ ◀───── │  + Supabase (persistencia)    │
└──────────────────────────────┘        │  + proxys a G2,G3,G4,G5,G9,G11│
                                          └──────────────────────────────┘
```

- El **frontend** no habla directo con los servicios de los otros grupos. Todo pasa por el BFF, que centraliza auth, errores, idempotencia y normaliza los formatos de cada grupo (snake_case/camelCase, etc).
- El **BFF** valida el origen de las peticiones por CORS: solo acepta llamadas del dominio configurado en su variable de entorno `FRONTEND_URL` (hoy apunta a `https://fish-market-frontend-g1.vercel.app`).

Por eso, si alguna vez cambias el dominio del frontend en Vercel, hay que actualizar `FRONTEND_URL` en el proyecto del BFF y hacer redeploy, o el navegador bloqueará las peticiones por CORS.

## Stack

- **React 18 + Vite** — SPA simple, build rápido, ideal para desplegar en Vercel.
- **React Router v6** — rutas del lado del cliente.
- **Sin librería de estado externa** — Context API (`AuthContext`, `CartContext`) es suficiente para el alcance de este proyecto.
- **Sesión en `localStorage`** — persiste entre recargas de página (se pierde solo si el usuario cierra sesión o el token expira).

## Estructura

```
frontend/
├── src/
│   ├── api/client.js          # Cliente central de llamadas al BFF (auth, errores, idempotencia)
│   ├── context/
│   │   ├── AuthContext.jsx    # Login, registro (con auto-login), logout, sesión persistida
│   │   └── CartContext.jsx    # Estado de carrito + workaround del GET-antes-de-POST
│   ├── components/            # Navbar, ProductCard, CategoryPills, Pagination, ErrorBanner, ChatWidget
│   ├── pages/                 # Catálogo, Detalle de producto, Login, Registro, Carrito, Checkout, Pedidos, Detalle de pedido, Notificaciones
│   └── styles/                # tokens.css (paleta/tipografía), global.css, layout.css, chat.css
├── index.html
├── vite.config.js
├── vercel.json                 # Rewrite para que las rutas de React Router funcionen al recargar
└── package.json
```

## Identidad visual

Paleta "FishMarket Cloud": navy (`#0a1a3f`) en el encabezado y elementos de marca, naranja (`#e8590c`) en las acciones principales (agregar al carrito, confirmar compra), azul (`#2454c7`) en el buscador y los enlaces activos.

## Rutas de la aplicación

| Ruta | Página | Protegida |
|---|---|---|
| `/` | Catálogo (categorías, filtros, buscador) | No |
| `/productos/:productId` | Detalle de producto | No |
| `/login`, `/registro` | Autenticación | No |
| `/carro` | Carrito | Sí |
| `/checkout` | Entrega, pago y confirmación (stepper de 3 pasos) | Sí |
| `/pedidos`, `/pedidos/:orderId` | Historial y detalle de pedido | Sí |
| `/notificaciones` | Notificaciones (marcar como leídas) | Sí |

## Decisiones técnicas importantes (por qué el código es así)

Estas decisiones vienen de hallazgos reales probando el BFF y los servicios de los otros grupos, no son detalles arbitrarios:

1. **`register()` hace login automático por dentro** (`AuthContext.jsx`). El BFF persiste sesión en `/api/auth/login`, pero no en `/api/auth/register` — el frontend inicia sesión con las mismas credenciales justo después de registrar.
2. **`CartContext.addItem()` siempre hace un `GET` antes del `POST`.** Grupo 4 no crea el carrito automáticamente en el primer `POST /items` de un usuario nuevo — responde `404 Cart not found`. El `GET` previo lo inicializa.
3. **Toda llamada a `/api/cart/*` y `/api/checkout` reenvía `Authorization: Bearer <token>`**, requisito de Grupo 4.
4. **La `Idempotency-Key` del checkout se genera una sola vez por intento** y solo se renueva tras un pedido confirmado, para que un reintento por error de red no duplique el pedido.
5. **El identificador de usuario para carrito/pedidos es `user.business_user_id`** (ej. `"USR-25"`), no el UUID interno que también devuelve el login.
6. **Los estados de pedido no reconocidos no rompen la UI** — si Grupo 5 agrega un estado nuevo, se muestra tal cual en vez de fallar.
7. **Las categorías del catálogo filtran por búsqueda de texto**, no por parámetro de categoría, porque `GET /api/products` de Grupo 3 no expone ese filtro.
8. **El checkout no controla el resultado del pago.** `POST /api/checkout` no expone un parámetro para forzar aprobado/rechazado, así que la UI no promete algo que el backend no hace.

## Configuración local

```bash
cp .env.example .env
```

```
VITE_API_BASE_URL=https://bff-mock-g1.vercel.app
```

Para probar contra el BFF corriendo en tu máquina, cambia el valor a `http://localhost:3001`.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Despliegue en Vercel

1. Repositorio en GitHub, importado como proyecto nuevo en Vercel (Framework Preset: **Vite**, detectado automático).
2. Variable de entorno `VITE_API_BASE_URL` = `https://bff-mock-g1.vercel.app`.
3. **`vercel.json` con rewrite a `index.html`** — imprescindible para que las rutas de React Router (`/pedidos`, `/checkout`, etc.) no den 404 al recargar la página o entrar directo por URL:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
4. En el proyecto del **BFF** en Vercel, agregar `FRONTEND_URL` = `https://fish-market-frontend-g1.vercel.app` y hacer redeploy, para que el CORS del backend acepte peticiones desde este dominio.

## Problemas resueltos durante el despliegue (para referencia futura)

| Síntoma | Causa | Solución |
|---|---|---|
| `NETWORK_ERROR` / catálogo vacío al entrar por una URL con hash (`...-hsiq0c3yp-....vercel.app`) | Esa URL de preview no coincide con el `FRONTEND_URL` configurado en el BFF, así que CORS la bloquea | Usar siempre el dominio de producción `fish-market-frontend-g1.vercel.app`, no las URLs de deployment individuales |
| `404: NOT_FOUND` al recargar en `/pedidos`, `/checkout`, etc. | Vercel busca un archivo físico en esa ruta; una SPA solo tiene `index.html` | Agregar `vercel.json` con rewrite de todas las rutas a `index.html` |
| CORS bloqueado al llamar al BFF desde el frontend | `FRONTEND_URL` no estaba seteada (o desactualizada) en el proyecto del BFF en Vercel | Configurar `FRONTEND_URL` con el dominio exacto del frontend y hacer redeploy del BFF |

## Qué falta / mejoras futuras

- Refresh automático de token cuando expira (`/api/auth/refresh` ya está implementado en `client.js` pero no se dispara solo todavía).
- Página de perfil / edición de datos del usuario.
- Tests automatizados de UI (las pruebas funcionales documentadas hoy están del lado del BFF).
- Checkout con `Idempotency-Key` y datos de pago sigue sin poder forzar aprobado/rechazado porque el endpoint de Grupo 4/5 no lo soporta aún.


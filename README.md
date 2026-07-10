# FishMarket Cloud — Frontend del Marketplace (Grupo 1)

Interfaz principal del marketplace, construida en React + Vite, que consume el BFF de Grupo 1 (`https://bff-mock-g1.vercel.app`).

Cumple los requisitos funcionales de la actividad de Grupo 1: iniciar sesión, buscar y paginar el catálogo, agregar productos al carrito, generar un pedido (checkout con idempotencia) y ver el estado del pedido. Además suma detalle de producto, notificaciones y el widget de chat (Grupo 11), que no eran obligatorios pero ya están conectados en el BFF.

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
│   ├── components/            # Navbar, ProductCard, CategoryPills, Pagination, ErrorBanner, ChatWidget, Tideline
│   ├── pages/                 # Catálogo, Detalle de producto, Login, Registro, Carrito, Checkout, Pedidos, Detalle de pedido, Notificaciones
│   └── styles/                # tokens.css (paleta/tipografía), global.css, layout.css, chat.css
├── index.html
├── vite.config.js
└── package.json
```

## Identidad visual

Paleta clara "muelle al amanecer": navy (`#0a1a3f`) en el encabezado y elementos de marca, naranja (`#e8590c`) en las acciones principales (agregar al carrito, confirmar compra), azul (`#2454c7`) en el buscador y los enlaces activos. Tipografía Sora para títulos y Inter para el resto de la interfaz.

## Rutas

| Ruta | Página | Protegida |
|---|---|---|
| `/` | Catálogo (categorías, filtros, buscador) | No |
| `/productos/:productId` | Detalle de producto | No |
| `/login`, `/registro` | Autenticación | No |
| `/carro` | Carrito | Sí |
| `/checkout` | Entrega, pago y confirmación (stepper de 3 pasos) | Sí |
| `/pedidos`, `/pedidos/:orderId` | Historial y detalle de pedido | Sí |
| `/notificaciones` | Notificaciones (marcar como leídas) | Sí |

## Decisiones importantes (por qué el código es así)

Estas decisiones vienen directo de los hallazgos que documentaron probando el BFF y los servicios reales — no son detalles arbitrarios:

1. **`register()` hace login automático por dentro** (`AuthContext.jsx`). El BFF persiste sesión en `/api/auth/login`, pero no en `/api/auth/register` — así que después de registrar, el frontend inicia sesión con las mismas credenciales sin pedírselas de nuevo al usuario.

2. **`CartContext.addItem()` siempre hace un `GET` antes del `POST`.** Grupo 4 no crea el carrito automáticamente en el primer `POST /items` de un usuario nuevo — responde `404 Cart not found`. El `GET` previo lo inicializa.

3. **Toda llamada a `/api/cart/*` y `/api/checkout` reenvía `Authorization: Bearer <token>`.** Grupo 4 empezó a exigirlo recientemente en ambos endpoints.

4. **La `Idempotency-Key` del checkout se genera una sola vez por intento** (`crypto.randomUUID()`), y solo se renueva tras un pedido confirmado. Si el usuario reintenta por un error de red, reenvía la misma key — así el BFF puede detectar el reintento y no duplicar el pedido.

5. **El identificador de usuario para carrito/pedidos es `user.business_user_id`** (ej. `"USR-25"`), no el `user_id` interno (UUID) que también devuelve el login. Son campos distintos en la respuesta de Grupo 2, y las URLs de carrito/pedidos usan el primero.

6. **Los estados de pedido no reconocidos no rompen la UI** (`utils/format.js`, `statusLabel`/`statusPillClass`). Si Grupo 5 agrega un estado nuevo que el frontend no anticipó, se muestra tal cual en vez de fallar.

7. **Las categorías del catálogo filtran por búsqueda de texto, no por parámetro de categoría.** `GET /api/products` de Grupo 3 no expone un filtro de categoría, así que cada pill (`CategoryPills.jsx`) dispara `GET /api/products/search?q=<palabra clave>` — es funcional de extremo a extremo, no decorativo.

8. **El precio y el orden en el catálogo se filtran en el cliente**, sobre la página ya cargada, porque el BFF no soporta esos parámetros. Si en el futuro Grupo 3 agrega filtros server-side, conviene mover esta lógica a la llamada API para no depender de traer todo el catálogo.

9. **"Envío gratis sobre $50.000" es una regla puramente visual del frontend** (`CartPage.jsx`, `CheckoutPage.jsx`), no viene del BFF — el checkout real no recibe ni valida ese umbral. Si Grupo 4/5 implementan reglas de envío reales, hay que reemplazar esta constante por lo que devuelva el checkout.

10. **El checkout no controla el resultado del pago.** La sección "Método de pago (simulado)" solo elige `paymentMethod`; no hay forma de forzar que el pago simulado sea aprobado o rechazado, porque `POST /api/checkout` no expone ese parámetro — se documenta así en la UI para no prometer algo que el backend no hace.

## Configuración

```bash
cp .env.example .env
```

```
VITE_API_BASE_URL=https://bff-mock-g1.vercel.app
```

Para probar contra tu BFF corriendo en local, cambia el valor a `http://localhost:3001`.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build y despliegue (Vercel)

```bash
npm run build
```

Genera `dist/`. Para desplegar en Vercel:

1. Sube este proyecto a un repositorio de GitHub (puede ser el mismo repo del BFF, en una carpeta `frontend/`, o uno separado).
2. En Vercel: **New Project → Import** ese repo.
3. **Framework Preset:** Vite (Vercel lo detecta automáticamente).
4. Agrega la variable de entorno `VITE_API_BASE_URL` con la URL de tu BFF en producción.
5. Deploy.

## Qué falta / posibles mejoras futuras

- Refresh automático de token cuando expira (`/api/auth/refresh` ya está implementado en `client.js` pero no se dispara solo todavía — hoy, si el token expira, el usuario simplemente tiene que volver a iniciar sesión).
- Página de perfil / edición de datos del usuario (no estaba en el alcance funcional pedido para Grupo 1).
- Tests automatizados de UI (el proyecto no incluye pruebas E2E; las pruebas funcionales documentadas están del lado del BFF).

# Catalogo de operaciones

Este documento lista todas las operaciones de datos de la app: que recibe cada metodo, que llamada hace a Firebase, que regla de [firestore.rules](../../firestore.rules) la autoriza y que errores puede devolver. Los servicios estan en [`src/app/services`](../../src/app/services).

| Servicio | Responsabilidad | Almacenamiento |
| --- | --- | --- |
| `AuthService` | Registro, inicio y cierre de sesion y lectura del perfil | Firebase Authentication + `users` |
| `OrderService` | Crear, consultar, avanzar y cancelar pedidos | `orders` |
| `SessionService` | Copia local minima de la sesion | Capacitor Preferences |

Todas las lecturas de pedidos son en tiempo real: devuelven un `Observable` alimentado por `onSnapshot`, que emite cada vez que cambia el dato en Firestore. Las escrituras devuelven una `Promise`.

## AuthService

### `register(fullName, email, password)`

| | |
| --- | --- |
| **Recibe** | `fullName: string`, `email: string`, `password: string` (minimo 6 caracteres) |
| **Devuelve** | `Promise<AppSession>` |
| **Llamadas a Firebase** | 1. `createUserWithEmailAndPassword(auth, email, password)` <br> 2. `setDoc(users/{uid}, { fullName, email, role: 'cliente', createdAt: serverTimestamp() })` <br> 3. `getDoc(users/{uid})` para guardar la sesion |
| **Regla** | `users` → `create`: `isOwner(uid) && validNewProfile()`; luego `get`: `isOwner(uid)` |
| **Si falla el paso 2** | Cierra la sesion (`signOut`), borra la sesion local y vuelve a lanzar el error. La cuenta de Authentication ya quedo creada. |
| **Errores** | `auth/email-already-in-use`, `auth/invalid-email`, `auth/weak-password`, `permission-denied` |
| **Usado en** | `RegisterPage` |

### `login(email, password)`

| | |
| --- | --- |
| **Recibe** | `email: string`, `password: string` |
| **Devuelve** | `Promise<AppSession>` |
| **Llamadas a Firebase** | 1. `signInWithEmailAndPassword(auth, email, password)` <br> 2. `getDoc(users/{uid})` |
| **Regla** | `users` → `get`: `isOwner(uid)` |
| **Errores** | `auth/invalid-credential`, `auth/wrong-password`, `PROFILE_NOT_FOUND` (la cuenta existe pero no tiene documento en `users`) |
| **Usado en** | `LoginPage` |

### `logout()`

| | |
| --- | --- |
| **Recibe** | — |
| **Devuelve** | `Promise<void>` |
| **Llamadas a Firebase** | `signOut(auth)`; la sesion local se borra aunque `signOut` falle (`finally`) |
| **Regla** | No accede a Firestore |
| **Usado en** | Menu lateral (`AppComponent`) |

### `initializeSession()` / `activeSession()`

| | |
| --- | --- |
| **Recibe** | — |
| **Devuelve** | `Promise<AppSession \| null>` |
| **Comportamiento** | Espera a que Authentication restaure la sesion (`authStateReady`). Si no hay usuario, borra la sesion local y devuelve `null`. Si la sesion local corresponde al mismo UID, la reutiliza sin consultar Firestore. Si no, vuelve a leer `users/{uid}`. |
| **Regla** | `users` → `get`: `isOwner(uid)` (solo cuando no hay copia local valida) |
| **Usado en** | `authGuard`, `guestGuard` y `roleGuard` (`activeSession` llama a `initializeSession`) |

## OrderService

### `create(order, session)`

| | |
| --- | --- |
| **Recibe** | `order: NewOrder` (`productName`, `quantity`, `deliveryAddress`, `notes`) y `session: AppSession` |
| **Devuelve** | `Promise<string>`, el ID del pedido nuevo |
| **Llamada a Firestore** | `addDoc(orders, { ...order, ownerUid, ownerName, ownerEmail, status: 'pending', createdAt, updatedAt })`; los textos se guardan con `trim()` y las fechas con `serverTimestamp()` |
| **Regla** | `orders` → `create`: `isOwner(ownerUid) && validNewOrder()` |
| **Errores** | `permission-denied` si algun campo no cumple los limites o el correo no coincide con el del token |
| **Usado en** | `OrdersFormPage` (`/orders/new`) |

### `customerOrders(ownerUid)`

| | |
| --- | --- |
| **Recibe** | `ownerUid: string` |
| **Devuelve** | `Observable<Order[]>` en tiempo real |
| **Consulta** | `query(orders, where('ownerUid', '==', ownerUid), orderBy('createdAt', 'desc'))` |
| **Regla** | `orders` → `list`: `isOwner(resource.data.ownerUid)`. El filtro `where` es obligatorio; sin el, la consulta se rechaza. |
| **Indice** | Compuesto `ownerUid` ASC + `createdAt` DESC ([firestore.indexes.json](../../firestore.indexes.json)) |
| **Usado en** | `OrdersPage` (`/orders`) |

### `merchantOrders()`

| | |
| --- | --- |
| **Recibe** | — |
| **Devuelve** | `Observable<Order[]>` en tiempo real |
| **Consulta** | `query(orders, orderBy('createdAt', 'desc'))` |
| **Regla** | `orders` → `list`: `isMerchant()` |
| **Usado en** | `ManageOrdersPage` (`/manage-orders`) |

### `orderById(id)`

| | |
| --- | --- |
| **Recibe** | `id: string` |
| **Devuelve** | `Observable<Order \| null>` en tiempo real; `null` si el documento no existe |
| **Consulta** | `onSnapshot(doc(orders, id))` |
| **Regla** | `orders` → `get`: `isOwner(resource.data.ownerUid) \|\| isMerchant()` |
| **Usado en** | `OrdersDetailPage` (`/orders/:id`) |

### `updateStatus(id, currentStatus, nextStatus)`

| | |
| --- | --- |
| **Recibe** | `id: string`, `currentStatus: OrderStatus`, `nextStatus: OrderStatus` |
| **Devuelve** | `Promise<void>` |
| **Validacion previa** | Comprueba la transicion con `merchantTransitions`; si no es valida, lanza `INVALID_STATUS_TRANSITION` sin llamar a Firestore |
| **Llamada a Firestore** | `updateDoc(orders/{id}, { status: nextStatus, updatedAt: serverTimestamp() })` |
| **Regla** | `orders` → `update`: `isMerchant() && changesOnlyStatus() && merchantTransitionIsValid()` |
| **Errores** | `INVALID_STATUS_TRANSITION`, `permission-denied` |
| **Usado en** | `ManageOrdersPage` |

### `cancel(id, currentStatus)`

| | |
| --- | --- |
| **Recibe** | `id: string`, `currentStatus: OrderStatus` |
| **Devuelve** | `Promise<void>` |
| **Validacion previa** | Si `currentStatus` no es `pending`, lanza `ORDER_CANNOT_BE_CANCELLED` sin llamar a Firestore |
| **Llamada a Firestore** | `updateDoc(orders/{id}, { status: 'cancelled', updatedAt: serverTimestamp() })` (borrado logico) |
| **Regla** | `orders` → `update`: `isOwner(ownerUid) && changesOnlyStatus() && status pending → cancelled` |
| **Errores** | `ORDER_CANNOT_BE_CANCELLED`, `permission-denied` |
| **Usado en** | `OrdersDetailPage`, despues de confirmar con `ion-alert` |

### `nextMerchantStatuses(status)`

| | |
| --- | --- |
| **Recibe** | `status: OrderStatus` |
| **Devuelve** | `OrderStatus[]`, los estados a los que el comerciante puede pasar el pedido |
| **Acceso a datos** | Ninguno; usa la tabla local `merchantTransitions`, que replica `merchantTransitionIsValid()` de las reglas |
| **Usado en** | `ManageOrdersPage`, para mostrar los botones de accion |

## SessionService

No accede a Firebase. Guarda en Capacitor Preferences, con la clave `mercado-vecino-session`, la copia minima de la sesion (`uid`, `fullName`, `email`, `role`) y la publica en `session$`.

| Metodo | Que hace |
| --- | --- |
| `restore()` | Lee la sesion guardada y comprueba que tenga todos sus campos; si esta danada, la borra y devuelve `null`. |
| `save(session)` | Guarda la sesion y la emite en `session$`. |
| `clear()` | Borra la sesion guardada y emite `null`. |
| `snapshot` | Devuelve la sesion actual en memoria. |

## Mensajes de error al usuario

`userMessage()` ([`src/app/core/error-message.ts`](../../src/app/core/error-message.ts)) convierte los errores en mensajes en espanol:

| Codigo o mensaje | Texto que ve el usuario |
| --- | --- |
| `auth/email-already-in-use` | Ese correo ya esta registrado. |
| `auth/invalid-credential`, `auth/wrong-password` | El correo o la contrasena no son correctos. |
| `auth/invalid-email` | Escribe un correo electronico valido. |
| `auth/weak-password` | La contrasena debe tener al menos 6 caracteres. |
| `PROFILE_NOT_FOUND` | La cuenta no tiene un perfil configurado. Contacta al administrador. |
| `ORDER_CANNOT_BE_CANCELLED` | Solo puedes cancelar pedidos que aun estan pendientes. |
| `INVALID_STATUS_TRANSITION` | Ese cambio de estado no esta permitido. |
| Cualquier otro | El mensaje por defecto de cada pantalla. |

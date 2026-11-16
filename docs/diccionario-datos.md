# Diccionario de datos

Descripcion de cada campo de las colecciones `users` y `orders` de Cloud Firestore, tal como los escriben `AuthService` y `OrderService` y como los exige [`firestore.rules`](../firestore.rules). El diagrama esta en [diagrama-er.md](diagrama-er.md).

## Coleccion `users`

Perfil de cada cuenta. El ID del documento es el UID de Firebase Authentication, por lo que hay un perfil por cuenta.

| Campo | Tipo | Obligatorio | Restricciones | Lo escribe | Descripcion |
| --- | --- | --- | --- | --- | --- |
| ID del documento | string | Si | Igual a `request.auth.uid` | `AuthService.register` | UID de la cuenta |
| `fullName` | string | Si | 2 a 80 caracteres | `register` | Nombre que se muestra en la app y se copia a los pedidos |
| `email` | string | Si | Igual al correo del token de autenticacion | `register` | Correo de la cuenta |
| `role` | string | Si | `cliente` o `comerciante`. Al crear solo se acepta `cliente` | `register` | Define las rutas y operaciones permitidas |
| `createdAt` | timestamp | Si | Igual a la hora del servidor (`request.time`) | `register` con `serverTimestamp()` | Fecha de registro |

**Reglas de negocio**

- El usuario solo puede leer y crear su propio perfil.
- Despues de crearlo solo puede cambiar `fullName`. El `role` no lo puede cambiar el usuario.
- Para tener un comerciante se registra la cuenta y luego se cambia `role` a `comerciante` desde la consola de Firebase.
- Los perfiles no se borran.

## Coleccion `orders`

Pedidos de los clientes. El ID lo genera Firestore con `addDoc`.

| Campo | Tipo | Obligatorio | Restricciones | Lo escribe | Descripcion |
| --- | --- | --- | --- | --- | --- |
| ID del documento | string | Si | Automatico | Firestore | Se usa en la ruta `/orders/:id` |
| `productName` | string | Si | 2 a 80 caracteres | `OrderService.create` | Producto solicitado |
| `quantity` | int | Si | Entero de 1 a 99 | `create` | Cantidad |
| `deliveryAddress` | string | Si | 8 a 180 caracteres | `create` | Direccion de entrega |
| `notes` | string | Si | Hasta 300 caracteres, puede ir vacio | `create` | Indicaciones adicionales |
| `ownerUid` | string | Si | Igual a `request.auth.uid` | `create` | Referencia a `users/{uid}` |
| `ownerName` | string | Si | Igual a `fullName` del perfil del cliente | `create` | Nombre del cliente, para que el comerciante no tenga que leer `users` |
| `ownerEmail` | string | Si | Igual al correo del token | `create` | Correo del cliente |
| `status` | string | Si | Al crear: `pending`. Luego solo cambia segun el flujo | `create`, `updateStatus`, `cancel` | Estado del pedido |
| `createdAt` | timestamp | Si | Igual a la hora del servidor | `create` | Fecha de creacion, se usa para ordenar las listas |
| `updatedAt` | timestamp | Si | Igual a la hora del servidor en cada cambio | `create`, `updateStatus`, `cancel` | Fecha del ultimo cambio |

### Valores de `status`

| Valor | Etiqueta en la app | Lo asigna | Desde |
| --- | --- | --- | --- |
| `pending` | Pendiente | Cliente, al crear | - |
| `preparing` | Preparando | Comerciante | `pending` |
| `on_the_way` | En camino | Comerciante | `preparing` |
| `delivered` | Entregado | Comerciante | `on_the_way` |
| `cancelled` | Cancelado | Cliente | `pending` |

`delivered` y `cancelled` son estados finales. Los pedidos no se borran: cancelar es un borrado logico que conserva el historial.

**Reglas de negocio**

- El cliente solo ve sus pedidos. Su consulta debe filtrar por `ownerUid`.
- El comerciante ve todos los pedidos y solo puede avanzar el estado un paso a la vez.
- El cliente solo puede cancelar su pedido mientras esta en `pending`.
- Ningun cambio de estado puede modificar los demas campos del pedido.

## Indices

| Coleccion | Campos | Consulta |
| --- | --- | --- |
| `orders` | `ownerUid` ascendente, `createdAt` descendente | Lista de pedidos del cliente (`customerOrders`) |

Definido en [`firestore.indexes.json`](../firestore.indexes.json).

## Validaciones en la app y en las reglas

Los limites del formulario coinciden con los de las reglas, para que el usuario vea el error antes de enviar los datos.

| Campo | Formulario | Reglas |
| --- | --- | --- |
| `fullName` | Obligatorio, 2 a 80 | 2 a 80 |
| `productName` | Obligatorio, 2 a 80 | 2 a 80 |
| `quantity` | Obligatorio, 1 a 99 | Entero de 1 a 99 |
| `deliveryAddress` | Obligatorio, 8 a 180 | 8 a 180 |
| `notes` | Maximo 300 | Maximo 300 |

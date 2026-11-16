# Seguridad de Firestore

El archivo [firestore.rules](../../firestore.rules) hace cumplir la autorizacion en el servidor. El rol guardado en Capacitor Preferences se usa solo para mejorar la navegacion; nunca da permisos sobre los datos. Aunque alguien modifique la app o llame a Firestore directamente, las reglas siguen decidiendo que se puede leer y escribir.

## Resumen

- Todo acceso exige una sesion de Firebase Authentication.
- Un usuario crea su propio perfil, y solo con el rol `cliente`.
- Un cliente solo lee los pedidos cuyo `ownerUid` coincide con su UID.
- Un cliente solo puede cancelar un pedido propio que todavia este `pending`.
- Un comerciante, identificado por `users/{uid}.role == 'comerciante'`, puede leer todos los pedidos y avanzar su estado sin editar los demas campos.
- Nadie puede borrar perfiles ni pedidos desde la app: la cancelacion es logica.
- Las reglas validan los tipos, los limites y los campos permitidos de los documentos nuevos.

## Matriz de permisos

| Coleccion | Operacion | Visitante | Cliente | Comerciante |
| --- | --- | --- | --- | --- |
| `users/{uid}` | `get` | ❌ | ✅ solo el suyo | ✅ solo el suyo |
| `users/{uid}` | `list` | ❌ | ❌ | ❌ |
| `users/{uid}` | `create` | ❌ | ✅ el suyo, con rol `cliente` | ✅ el suyo, con rol `cliente` |
| `users/{uid}` | `update` | ❌ | ✅ solo `fullName` del suyo | ✅ solo `fullName` del suyo |
| `users/{uid}` | `delete` | ❌ | ❌ | ❌ |
| `orders/{id}` | `get`, `list` | ❌ | ✅ solo los suyos | ✅ todos |
| `orders/{id}` | `create` | ❌ | ✅ a su nombre, en `pending` | ✅ a su nombre, en `pending` |
| `orders/{id}` | `update` | ❌ | ✅ solo `pending → cancelled` de los suyos | ✅ solo avanzar el estado |
| `orders/{id}` | `delete` | ❌ | ❌ | ❌ |

Desde las reglas, un comerciante tambien puede crear pedidos propios. La app no se lo ofrece, porque las rutas `/orders` estan protegidas con `roleGuard('cliente')`.

## Explicacion de las reglas

### Funciones auxiliares

| Funcion | Que comprueba |
| --- | --- |
| `signedIn()` | Que la peticion tenga una sesion de Authentication (`request.auth != null`). |
| `isOwner(uid)` | Que haya sesion y que el UID de la sesion sea el indicado. Se usa para el perfil propio y para el `ownerUid` de los pedidos. |
| `isMerchant()` | Que exista `users/{uid de la sesion}` y que su `role` sea `comerciante`. El rol se lee del documento en Firestore, no del dispositivo, asi que no se puede falsificar. |
| `validNewProfile()` | Que el perfil nuevo tenga solo `fullName`, `email`, `role` y `createdAt`; que `fullName` tenga de 2 a 80 caracteres; que `email` sea igual al correo del token; que `role` sea `cliente` y que `createdAt` sea un timestamp. |
| `validNewOrder()` | Que el pedido nuevo tenga solo los 10 campos del modelo, con sus tipos y limites (ver el [Diccionario de datos](Diccionario-de-datos.md)); que `ownerEmail` sea igual al correo del token y que `status` sea `pending`. |
| `changesOnlyStatus()` | Que la actualizacion modifique solo `status` y `updatedAt`, y que `updatedAt` sea un timestamp. |
| `merchantTransitionIsValid()` | Que el cambio sea uno de `pending → preparing`, `preparing → on_the_way` u `on_the_way → delivered`. |

### `match /users/{uid}`

```
allow get: if isOwner(uid);
```
Cada usuario lee solo su propio perfil. `AuthService.getProfile` lo usa al iniciar sesion. No hay regla `list`, asi que nadie puede consultar la lista de usuarios.

```
allow create: if isOwner(uid) && validNewProfile();
```
El perfil solo se puede crear en el documento cuyo ID es el UID propio, y siempre con el rol `cliente`. Asi nadie puede registrarse como comerciante.

```
allow update: if isOwner(uid) && affectedKeys().hasOnly(['fullName']) && ...;
```
El dueno solo puede cambiar su nombre, respetando los mismos limites que al crearlo. `role`, `email` y `createdAt` quedan fijos.

```
allow delete: if false;
```
Los perfiles no se borran desde la app.

### `match /orders/{orderId}`

```
allow get, list: if isOwner(resource.data.ownerUid) || isMerchant();
```
El cliente solo lee sus pedidos. Como las reglas no son filtros, la consulta del cliente tiene que incluir `where('ownerUid', '==', uid)`, como hace `customerOrders`. Una consulta sin ese filtro se rechaza completa. El comerciante puede leer todos los pedidos (`merchantOrders`).

```
allow create: if isOwner(request.resource.data.ownerUid) && validNewOrder();
```
El pedido solo se puede crear a nombre del usuario de la sesion, en estado `pending` y con datos validos.

```
allow update: if (isMerchant() && changesOnlyStatus() && merchantTransitionIsValid())
  || (isOwner(resource.data.ownerUid) && changesOnlyStatus()
      && resource.data.status == 'pending' && request.resource.data.status == 'cancelled');
```
Hay dos casos posibles, y ninguno permite tocar el producto, la cantidad, la direccion ni el dueno:
1. **El comerciante avanza el estado**, un paso a la vez y sin saltos ni retrocesos (`updateStatus`).
2. **El cliente cancela su propio pedido**, solo mientras este `pending` (`cancel`).

```
allow delete: if false;
```
Los pedidos no se borran, para conservar el historial.

## Pruebas en el Rules Playground

El simulador esta en **Firebase Console → Firestore Database → Reglas → Rules Playground**. Lee los datos reales de la base, asi que antes de probar hay que preparar lo siguiente:

1. Registrar dos cuentas desde la app, por ejemplo `cliente@prueba.com` y `comerciante@prueba.com`, y anotar sus UID desde **Authentication**.
2. En la consola, cambiar el `role` de `users/{UID del comerciante}` a `comerciante`.
3. Crear un pedido desde la app con la cuenta cliente y anotar su ID: `{ID_PEDIDO}`. Quedara en `pending`.

En cada prueba se elige el tipo de simulacion y la ruta. En **Autenticacion** se activa "Autenticado", se elige el proveedor "Correo/contrasena" y se escribe el UID. Para las reglas que comparan el correo, se edita el payload del token para que `email` coincida con el de la cuenta.

### Perfiles (`users`)

| # | Simulacion | Ruta | Autenticacion | Datos del documento | Resultado esperado | Regla que decide |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | get | `users/{UID_CLIENTE}` | Sin autenticar | — | ❌ Denegado | `isOwner`: no hay sesion |
| U2 | get | `users/{UID_CLIENTE}` | `{UID_CLIENTE}` | — | ✅ Permitido | `isOwner(uid)` |
| U3 | get | `users/{UID_COMERCIANTE}` | `{UID_CLIENTE}` | — | ❌ Denegado | Solo el dueno lee su perfil |
| U4 | create | `users/{UID_NUEVO}` | `{UID_NUEVO}`, email `nuevo@prueba.com` | `fullName: "Ana Perez"`, `email: "nuevo@prueba.com"`, `role: "cliente"`, `createdAt: timestamp` | ✅ Permitido | `validNewProfile` |
| U5 | create | `users/{UID_NUEVO}` | `{UID_NUEVO}`, email `nuevo@prueba.com` | Igual que U4, pero con `role: "comerciante"` | ❌ Denegado | `role == 'cliente'` |
| U6 | create | `users/{UID_COMERCIANTE}` | `{UID_CLIENTE}` | Igual que U4 | ❌ Denegado | `isOwner(uid)`: no es su documento |
| U7 | update | `users/{UID_CLIENTE}` | `{UID_CLIENTE}` | Documento actual con `role: "comerciante"` | ❌ Denegado | Solo se permite cambiar `fullName` |
| U8 | update | `users/{UID_CLIENTE}` | `{UID_CLIENTE}` | Documento actual con `fullName: "Nuevo Nombre"` | ✅ Permitido | `affectedKeys().hasOnly(['fullName'])` |
| U9 | delete | `users/{UID_CLIENTE}` | `{UID_CLIENTE}` | — | ❌ Denegado | `allow delete: if false` |

### Pedidos (`orders`)

| # | Simulacion | Ruta | Autenticacion | Datos del documento | Resultado esperado | Regla que decide |
| --- | --- | --- | --- | --- | --- | --- |
| O1 | create | `orders/prueba1` | `{UID_CLIENTE}`, email del cliente | Los 10 campos validos, con `ownerUid: {UID_CLIENTE}` y `status: "pending"` | ✅ Permitido | `validNewOrder` |
| O2 | create | `orders/prueba2` | `{UID_CLIENTE}`, email del cliente | Igual que O1, pero con `ownerUid: {UID_COMERCIANTE}` | ❌ Denegado | `isOwner(ownerUid)` |
| O3 | create | `orders/prueba3` | `{UID_CLIENTE}`, email del cliente | Igual que O1, pero con `status: "delivered"` | ❌ Denegado | `status == 'pending'` |
| O4 | create | `orders/prueba4` | `{UID_CLIENTE}`, email del cliente | Igual que O1, pero con `quantity: 150` | ❌ Denegado | `quantity <= 99` |
| O5 | create | `orders/prueba5` | `{UID_CLIENTE}`, email del cliente | Igual que O1, mas un campo `price: 0` | ❌ Denegado | `keys().hasOnly([...])` |
| O6 | get | `orders/{ID_PEDIDO}` | `{UID_CLIENTE}` | — | ✅ Permitido | `isOwner(ownerUid)` |
| O7 | get | `orders/{ID_PEDIDO}` | Otro cliente | — | ❌ Denegado | No es el dueno ni comerciante |
| O8 | get | `orders/{ID_PEDIDO}` | `{UID_COMERCIANTE}` | — | ✅ Permitido | `isMerchant()` |
| O9 | update | `orders/{ID_PEDIDO}` | `{UID_CLIENTE}` | `status: "preparing"`, `updatedAt: timestamp` | ❌ Denegado | El cliente solo puede cancelar |
| O10 | update | `orders/{ID_PEDIDO}` | `{UID_COMERCIANTE}` | `status: "preparing"`, `updatedAt: timestamp` | ✅ Permitido | `merchantTransitionIsValid` |
| O11 | update | `orders/{ID_PEDIDO}` | `{UID_COMERCIANTE}` | `status: "delivered"`, `updatedAt: timestamp` (con el pedido en `pending`) | ❌ Denegado | No se puede saltar estados |
| O12 | update | `orders/{ID_PEDIDO}` | `{UID_COMERCIANTE}` | `status: "preparing"`, `quantity: 5` | ❌ Denegado | `changesOnlyStatus` |
| O13 | update | `orders/{ID_PEDIDO}` | `{UID_CLIENTE}` | `status: "cancelled"`, `updatedAt: timestamp` (con el pedido en `pending`) | ✅ Permitido | Cancelacion del dueno |
| O14 | update | `orders/{ID_PEDIDO}` | `{UID_CLIENTE}` | `status: "cancelled"` (con el pedido ya en `preparing`) | ❌ Denegado | `resource.data.status == 'pending'` |
| O15 | delete | `orders/{ID_PEDIDO}` | `{UID_CLIENTE}` o `{UID_COMERCIANTE}` | — | ❌ Denegado | `allow delete: if false` |

En una simulacion `update`, el Playground muestra el documento actual y deja editar solo los campos que cambian. Para O11 y O14, el pedido debe estar en el estado indicado antes de simular; por ejemplo, para O14 hay que ejecutar primero O10 desde la app. La evidencia de cada prueba es una captura con el resultado y la linea de la regla marcada.

### Evidencia

Se ejecuto un grupo representativo de 8 pruebas, una por cada regla principal. Las simulaciones se hicieron con las reglas de este repositorio cargadas en el editor del Playground, sin publicarlas.

| Prueba | Que demuestra | Resultado | Captura |
| --- | --- | --- | --- |
| U2 | El usuario lee su propio perfil | Permitido | [U2](img/rules-playground/U2.png) |
| U5 | Nadie puede registrarse como comerciante | Rechazado | [U5](img/rules-playground/U5.png) |
| O2 | No se puede crear un pedido a nombre de otro | Rechazado | [O2](img/rules-playground/O2.png) |
| O6 | El cliente lee su pedido | Permitido | [O6](img/rules-playground/O6.png) |
| O7 | Otro usuario no puede leer el pedido | Rechazado | [O7](img/rules-playground/O7.png) |
| O9 | El cliente no puede avanzar el estado | Rechazado | [O9](img/rules-playground/O9.png) |
| O10 | El comerciante avanza `pending -> preparing` | Permitido | [O10](img/rules-playground/O10-ci.png) |
| O15 | Nadie puede borrar un pedido | Rechazado | [O15](img/rules-playground/O15.png) |

La O10 se verifico con la prueba automatica "el comerciante avanza pending -> preparing" de `firestore-tests/firestore.rules.test.ts`, que corre contra el emulador de Firestore en el CI (`pnpm test:rules`, 30 pruebas en verde).

**Hallazgo:** al abrir el Playground se comprobo que el proyecto de Firebase tenia publicadas unas reglas temporales de desarrollo (`allow read, write: if request.auth != null`), no las de este repositorio. Hay que desplegar `firestore.rules` para que la app use estas reglas.

## Limitaciones conocidas

- **`createdAt` y `updatedAt` no estan atados a la hora del servidor.** Las reglas solo exigen que sean timestamps, asi que una peticion manual podria enviar otra fecha. El PR de la MER-3 lo corrige con `== request.time`, que coincide con `serverTimestamp()`.
- **`ownerName` no se compara con el perfil.** Se valida que sea un string, pero no que sea igual a `users/{uid}.fullName`. El PR de la MER-3 agrega esa comparacion.
- **Un comerciante ve todos los pedidos.** El modelo actual no tiene tiendas, asi que no se puede limitar cada comerciante a los suyos.
- **Las reglas no validan el formato de `notes` ni de `productName`.** Solo validan su longitud.

## Indice requerido

La lista del cliente usa `ownerUid == uid` y `createdAt desc`. El indice compuesto esta definido en [firestore.indexes.json](../../firestore.indexes.json) y se despliega junto con las reglas.

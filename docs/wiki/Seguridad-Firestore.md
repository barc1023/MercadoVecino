# Seguridad de Firestore

El archivo [firestore.rules](../../firestore.rules) hace cumplir la autorización en el servidor. El rol almacenado en Capacitor Preferences se usa solo para mejorar la navegación; nunca concede privilegios de datos.

## Reglas principales

- Todo acceso exige una sesión de Firebase Authentication.
- Un usuario crea su propio perfil y este se crea solamente con el rol `cliente`.
- Un cliente solo lee pedidos cuyo `ownerUid` coincide con su UID.
- Un cliente solo puede cancelar un pedido propio que todavía esté `pending`.
- Un comerciante, identificado por `users/{uid}.role == 'comerciante'`, puede leer pedidos y avanzar el estado sin editar sus demás campos.
- Ningún cliente ni comerciante puede eliminar documentos de pedidos: la cancelación es lógica.
- Las reglas validan tipos, límites y campos permitidos del pedido nuevo.

## Pruebas manuales en Rules Playground

1. Con un cliente autenticado, intenta crear un pedido con `ownerUid` de otra cuenta: debe fallar.
2. Como cliente, intenta consultar todos los pedidos sin filtro `ownerUid`: debe fallar.
3. Como cliente, intenta cambiar `pending` a `preparing`: debe fallar.
4. Como comerciante, avanza `pending → preparing → on_the_way → delivered`: debe permitirlo.
5. Intenta modificar `quantity` mediante una actualización de estado: debe fallar.
6. Intenta borrar un pedido: debe fallar para cualquier rol de la aplicación.

## Índice requerido

La lista de un cliente usa `ownerUid == uid` y `createdAt desc`. El índice compuesto está definido en [firestore.indexes.json](../../firestore.indexes.json) y se despliega junto con las reglas.

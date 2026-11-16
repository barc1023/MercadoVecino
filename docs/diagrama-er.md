# Diagrama entidad-relacion

MercadoVecino usa dos colecciones de Cloud Firestore: `users` y `orders`. Cada usuario puede crear muchos pedidos y cada pedido pertenece a un solo usuario, enlazado por `ownerUid`.

```mermaid
erDiagram
  USERS ||--o{ ORDERS : "crea"
  USERS {
    string uid PK "UID de Firebase Authentication"
    string fullName "2 a 80 caracteres"
    string email "igual al correo del token"
    string role "cliente o comerciante"
    timestamp createdAt "hora del servidor"
  }
  ORDERS {
    string id PK "ID automatico"
    string ownerUid FK "users.uid"
    string ownerName "igual a users.fullName"
    string ownerEmail "igual al correo del token"
    string productName "2 a 80 caracteres"
    int quantity "1 a 99"
    string deliveryAddress "8 a 180 caracteres"
    string notes "hasta 300 caracteres"
    string status "ver flujo de estados"
    timestamp createdAt "hora del servidor"
    timestamp updatedAt "hora del servidor"
  }
```

La fuente editable del diagrama esta en [`diagrams/data-model.mmd`](diagrams/data-model.mmd).

## Relacion

| Desde | Hacia | Cardinalidad | Campo | Regla que la protege |
| --- | --- | --- | --- | --- |
| `users` | `orders` | 1 a muchos (0..n) | `orders.ownerUid` = `users/{uid}` | `isOwner(request.resource.data.ownerUid)` al crear el pedido |

Firestore no tiene llaves foraneas. La relacion se garantiza con las reglas: un pedido solo se puede crear con el `ownerUid` del usuario autenticado y con el `ownerName` de su perfil.

## Flujo de estados de `orders.status`

```mermaid
stateDiagram-v2
  [*] --> pending: cliente crea el pedido
  pending --> preparing: comerciante
  preparing --> on_the_way: comerciante
  on_the_way --> delivered: comerciante
  pending --> cancelled: cliente
  delivered --> [*]
  cancelled --> [*]
```

Ver el detalle de cada campo en el [diccionario de datos](diccionario-datos.md).

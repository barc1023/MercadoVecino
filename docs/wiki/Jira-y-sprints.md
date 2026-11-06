# Jira y sprints

Este es el contenido del tablero de Jira para los sprints 3 y 4. Crear las historias en el proyecto Jira del equipo con los mismos identificadores, criterios y estados.

## Sprint 3 · Autenticación y roles

| Clave | Historia | Responsable | Estado recomendado | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| HU-05 | Como visitante, quiero registrarme para usar la app. | Equipo cliente | Done | Crea una cuenta de Firebase y un perfil cliente en Firestore. |
| HU-06 | Como usuario, quiero iniciar y cerrar sesión. | Equipo cliente | Done | Errores claros; sesión local restaurada y borrada al salir. |
| HU-06a | Como usuario, quiero ver únicamente las opciones de mi rol. | Mi parte | Done | Guards y menú protegen las rutas de cliente y comerciante. |

## Sprint 4 · Pedidos y seguridad

| Clave | Historia | Responsable | Estado recomendado | Criterio de aceptación |
| --- | --- | --- | --- |
| HU-07 | Como cliente, quiero crear un pedido. | Equipo cliente | Done | Se guarda con `ownerUid` y `pending`. |
| HU-08 | Como cliente, quiero ver mis pedidos y el detalle. | Equipo cliente | Done | Solo ve los propios y la lista es en tiempo real. |
| HU-09 | Como comerciante, quiero actualizar el estado. | Mi parte | Done | Solo comerciante puede avanzar el flujo permitido. |
| HU-10 | Como cliente, quiero cancelar un pedido. | Equipo cliente | Done | Confirmación y cancelación lógica solo estando pendiente. |
| HU-11 | Como equipo, queremos proteger y desplegar los datos. | DevOps | Done | Reglas, índice, CI y workflow de Firebase listos. |

## Configuración del tablero

- Tipo de proyecto: Scrum.
- Columnas: **To Do**, **In Progress**, **In Review**, **Done**.
- Definición de terminado: PR aprobado, CI verde, regla o UI probada y documentación wiki actualizada.
- Etiquetas sugeridas: `auth`, `firestore`, `cliente`, `comerciante`, `seguridad`, `docs`, `devops`.

## Evidencias que debe adjuntar el equipo

1. Captura de cada sprint y de las historias en **Done**.
2. Enlaces a los pull requests y commits asociados.
3. Resultado verde de CI.
4. Captura de las pruebas de Firestore Rules Playground.

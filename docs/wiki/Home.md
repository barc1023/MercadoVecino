# MercadoVecino · Fase 2

Esta carpeta contiene el contenido listo para publicar en la wiki del repositorio. Copia cada archivo como una página del wiki y enlázalo desde esta portada.

## Índice

- [Arquitectura y datos](Arquitectura-y-datos.md)
- [Seguridad de Firestore](Seguridad-Firestore.md)
- [Manual de usuario](Manual-de-usuario.md)
- [Jira y sprints](Jira-y-sprints.md)

## Alcance entregado

- Registro e inicio/cierre de sesión con Firebase Authentication.
- Perfil con rol en `users/{uid}`, caché de sesión mediante Capacitor Preferences y guards de Angular.
- Pedidos con creación, lista en tiempo real, detalle, actualización de estado y cancelación lógica.
- Reglas, índice, CI y despliegue a Firebase Hosting definidos en el repositorio.

Los diagramas fuente Mermaid están en [`docs/diagrams`](../diagrams). GitHub los renderiza automáticamente al incluir sus bloques en una página Markdown.

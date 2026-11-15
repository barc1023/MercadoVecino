# MercadoVecino

Aplicación móvil de pedidos de tiendas de barrio para **Frescos del Istmo S.A.**, desarrollada como proyecto integrador de *Desarrollo de Aplicaciones Móviles* (EID 1022), ITSE Panamá.

## Tecnologías

- Ionic + Angular (componentes **standalone**, sin módulos)
- Capacitor
- Firebase Web SDK: Authentication (correo y contraseña) y Cloud Firestore
- pnpm como gestor de paquetes

La app no tiene backend propio: toda la lógica de datos y seguridad vive en Firebase y en [`firestore.rules`](firestore.rules).

## Requisitos

- Node.js 24 o superior
- pnpm 12 (`npm install -g pnpm`)
- Ionic CLI (`npm install -g @ionic/cli`)
- Git

## Instalación

```
git clone https://github.com/barc1023/MercadoVecino.git
cd MercadoVecino
pnpm install
```

Si pnpm avisa de scripts de compilación bloqueados, ejecuta `pnpm approve-builds`, marca todos y confirma.

## Configuración del entorno

Los archivos de entorno reales **no se suben al repositorio**. Créalos una sola vez desde las plantillas:

```
copy src\environments\environment.example.ts src\environments\environment.ts
copy src\environments\environment.prod.example.ts src\environments\environment.prod.ts
```

Luego abre ambos archivos y reemplaza los valores de `firebase` con la configuración del proyecto (Firebase Console → Project settings → Your apps → Config). Pide los valores al líder del equipo.

En Firebase Console activa **Authentication → Email/Password**, crea Cloud Firestore y publica las reglas e índice:

```
pnpm dlx firebase-tools login
pnpm dlx firebase-tools deploy --only firestore --project TU_PROYECTO
```

El registro público crea únicamente perfiles `cliente`. Para habilitar un comerciante, crea primero la cuenta mediante Firebase Authentication y después crea su documento `users/{uid}` con `role: "comerciante"` desde un entorno administrativo seguro o durante la configuración inicial del proyecto.

## Ejecutar la app

```
ionic serve
```

Se abre en `http://localhost:8100`.

## Compilar

```
pnpm build
```

## Automatización y despliegue

- [CI](.github/workflows/ci.yml) instala dependencias, valida estilo, ejecuta pruebas unitarias y compila cada PR y cada cambio a `main`.
- [Deploy Firebase](.github/workflows/deploy-firebase.yml) compila y publica Hosting, reglas e índices desde `main` o ejecución manual.

Antes de activar el despliegue configura las variables de GitHub `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` y el secreto `FIREBASE_TOKEN`.

## Documentación

El contenido listo para el wiki está en [`docs/wiki`](docs/wiki/Home.md), y los diagramas Mermaid editables están en [`docs/diagrams`](docs/diagrams). El backlog de Jira para los sprints 3 y 4 está en [Jira y sprints](docs/wiki/Jira-y-sprints.md).

## Estructura principal

```
src/
  app/
    core/            conexión con Firebase
    folder/          página base del menú
    app.routes.ts    rutas
  environments/      plantillas de configuración (*.example.ts)
docs/                diagrama ER y diccionario de datos
firestore.rules      reglas de seguridad de Firestore
.github/workflows/   pipeline de compilación
```

## Flujo de trabajo

- `main` está protegida: no se sube código directo.
- Cada historia de usuario se trabaja en una rama `feature/...` o `docs/...`.
- Los cambios llegan a `main` por pull request.
- Los commits siguen Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

## Integrantes

- Bryan Rodríguez 
- Oliver
- Joao
- Integrante 4

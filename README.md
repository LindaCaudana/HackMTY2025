# HackMTY2025 — Smart Execution Hub

Este repositorio contiene la solución desarrollada para HackMTY 2025: un pequeño prototipo de un "Smart Execution Hub" que incluye un backend (API REST) en Node/Express y un frontend en React + TypeScript.

## Contenido

- `backend/` — API Express que expone endpoints para:
	- Decisiones sobre botellas (evaluación automática según reglas)
	- Detección de errores (procesamiento de lecturas de sensores y alertas)
	- Métricas de eficiencia de empleados (dashboard, ranking, simulador)
- `frontend/` — Aplicación React + TypeScript que consume la API y muestra dashboards.
- `powerBI/` — (vacío en esta versión)

## Requisitos

- Node.js 16+ (recomendado). NPM o Yarn.
- Windows / macOS / Linux — las instrucciones de shell están orientadas a PowerShell en Windows.

## Instalación (rápido)

1. Clonar el repositorio o abrir la carpeta en tu máquina.
2. Instalar dependencias del backend y frontend por separado.

Desde la raíz del proyecto (PowerShell):

```powershell
# Backend
cd backend; npm install; cd ..

# Frontend
cd frontend; npm install; cd ..
```

## Ejecutar en desarrollo

1) Backend

```powershell
cd backend
# Desarrollo con recarga (recomendado si instalaste nodemon)
npm run dev

# O bien arrancar normalmente
npm start
```

El servidor backend se ejecuta por defecto en el puerto 5000 (http://localhost:5000).

2) Frontend

```powershell
cd frontend
npm start
```

La app React por defecto arranca en http://localhost:3000 y consumirá la API del backend en `http://localhost:5000`.

## Endpoints principales (Backend)

El backend expone varias rutas útiles para desarrollo y pruebas. A continuación se listan las más relevantes:

- GET `/` — Ruta de prueba; devuelve un JSON indicando que la API está corriendo.

- Bottle Decision (módulo de decisiones sobre botellas):
	- POST `/api/bottles/evaluate` — Evaluar una botella con reglas por cliente. Body: JSON con campos como `customerCode`, `sealStatus`, `fillLevel`, `labelStatus`, `cleanliness`.
		- Ejemplo mínimo (PowerShell/curl):

```powershell
curl -Method POST -Uri http://localhost:5000/api/bottles/evaluate -ContentType 'application/json' -Body (
	'{"customerCode":"EK","sealStatus":"Sealed","fillLevel":95,"labelStatus":"Good","cleanliness":"Good"}'
)
```

	- GET `/api/bottles/history` — Devuelve el historial (en memoria) de las últimas decisiones.

- Error Detection (procesamiento de lecturas / alertas):
	- GET `/api/error-detection/metrics` — Métricas del dashboard de detección de errores.
	- POST `/api/error-detection/sensor-reading` — Enviar una lectura de sensor (JSON). Devuelve si se generó una alerta.
	- GET `/api/error-detection/alerts` — Lista de alertas recientes.
	- POST `/api/error-detection/simulate` — Inicia la simulación de datos en tiempo real (dev).

- Efficiency (métricas y simulador de empacado):
	- GET `/api/efficiency/metrics` — Métricas del dashboard de eficiencia.
	- GET `/api/efficiency/ranking` — Ranking de empleados.
	- GET `/api/efficiency/training-recommendations` — Recomendaciones de entrenamiento.
	- POST `/api/efficiency/packing-record` — Añadir un registro de packing (JSON).
	- POST `/api/efficiency/simulate-record` — Simula y añade un registro de packing de ejemplo.

Nota: Las rutas del backend usan datos y almacenamiento en memoria apropiados para prototipado. No hay base de datos persistente configurada.

## Cómo funciona (resumen técnico)

- Decisiones sobre botellas: el servidor contiene un motor de reglas simple en `server.js`. Según `customerCode` (por ejemplo `EK`, `BA`, `LX`) aplica condiciones sobre propiedades de la botella (`sealStatus`, `fillLevel`, `labelStatus`, `cleanliness`) y devuelve una acción (`Keep`, `Refill`, `Replace`, `Discard`) con razón y color. También mantiene un historial en memoria.

- Detección de errores: dentro de `backend/routes/errorDetection.js` y `backend/services/ErrorDetectionService.js` hay lógica para procesar lecturas de sensores, generar alertas y devolver métricas/mock-data para el frontend.

- Eficiencia: `backend/services/EfficiencyService.js` implementa métricas del dashboard, ranking y operaciones para añadir registros de packing; las rutas en `backend/routes/efficiency.js` exponen estas funcionalidades y también ofrecen endpoints para simular registros.

## Desarrollo y pruebas

- Para desarrollo rápido, ejecuta ambos servidores (backend y frontend) en terminales separados.
- Las APIs del backend devuelven JSON y están listas para ser consumidas por el frontend. No hay tests automáticos incluidos en esta versión, pero hay scripts `npm test` por defecto en ambos paquetes (no implementados).

## Siguientes mejoras sugeridas

- Añadir persistencia (base de datos) para historial y métricas.
- Añadir variables de entorno (p. ej. PORT) y fichero `.env` (el backend ya tiene `dotenv` en dependencias aunque no se usa activamente).
- Añadir pruebas unitarias/integración para servicios y rutas.
- Documentar contrato JSON de cada endpoint con ejemplos más detallados (OpenAPI/Swagger).

## Contribuir

Si quieres contribuir, crea un fork, añade tus cambios y abre un PR. Mantén los cambios pequeños y enfocados.

---
Creado automáticamente: instrucciones para ejecutar y comprender el prototipo (frontend + backend). Si quieres que añada ejemplos más concretos de cuerpos JSON para cada endpoint o que traduzca esto al inglés, dímelo y lo actualizo.


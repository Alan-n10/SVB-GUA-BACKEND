# SVB-GUA Backend

API para venta de boletos en puntos fisicos. Node.js, Express, Sequelize y PostgreSQL.

## Inicio

1. Ejecutar `npm install` al clonar el proyecto.
2. Copiar `.env.example` a `.env` y completar los datos de PostgreSQL. No compartir ni subir `.env`.
3. Ejecutar `npm run dev` durante el desarrollo o `npm start` para iniciar normalmente.
4. Abrir `http://localhost:8081/` para comprobar el servidor.
5. Abrir `http://localhost:8081/api/salud/bd` para comprobar PostgreSQL.

El servidor puede iniciar sin una base configurada. La ruta de base de datos devuelve 503 hasta completar la configuracion. No se crean ni modifican tablas automaticamente.

## Estructura

- `server.js`: carga variables de entorno e inicia el servidor.
- `app/app.js`: configura Express y registra rutas.
- `app/config/db.config.js`: lee la configuracion de PostgreSQL.
- `app/models/index.js`: conexion Sequelize, futuros modelos y relaciones.
- `app/models/`: tablas y relaciones.
- `app/controllers/`: validaciones y operaciones de cada modulo.
- `app/routes/`: endpoints de cada modulo.
- `app/middlewares/`: autenticacion y permisos.

## Reparto sugerido para dos integrantes

- Integrante 1: usuarios, login, roles y artistas.
- Integrante 2: conciertos, localidades e inventario.
- Ambos: ventas, detalle de ventas, reportes e integracion.

Antes de trabajar en paralelo, acordar nombres de campos del documento, endpoints y respuestas JSON. Coordinar cambios en `app/app.js` y `app/models/index.js`, porque ambos registraran modulos en esos archivos.

## Proximos pasos

Crear los siete modelos del documento y sus relaciones. Implementar primero artistas como CRUD de referencia. Despues integrar autenticacion y permisos antes de habilitar operaciones de administracion y ventas.

Las ventas deben calcular precios y totales en el servidor y registrar venta, detalles y descuento de inventario dentro de una transaccion con control de concurrencia.

## Modulo de usuarios: prueba paso a paso

1. Mantener los datos de Neon en `.env`. No se necesita ninguna clave JWT.
2. Ejecutar `npm.cmd run db:usuarios` si todavia no existe la tabla.
3. Ejecutar `npm.cmd run db:admin`. Pedira nombre de usuario y nombre completo, creara el primer administrador y mostrara una contrasena aleatoria. Guardarla para iniciar sesion. El comando no reemplaza usuarios existentes ni crea otro administrador si ya hay uno.
4. Reiniciar el servidor con `npm.cmd run dev`.
5. En EchoAPI o Postman usar la URL completa `http://localhost:8081/api/usuarios/login`, metodo POST y Body raw JSON.
6. Para las otras rutas, abrir Auth, seleccionar Basic Auth y escribir el usuario y la contrasena del administrador. No configurar Bearer.

| Metodo | Endpoint | Acceso |
| --- | --- | --- |
| POST | `/api/usuarios/login` | Publico, requiere credenciales |
| GET | `/api/usuarios/me` | Usuario autenticado |
| POST | `/api/usuarios/create` | Administrador |
| GET | `/api/usuarios/` | Administrador |
| GET | `/api/usuarios/?nombre_usuario=texto` | Administrador |
| GET | `/api/usuarios/:id` | Administrador |
| PUT | `/api/usuarios/update/:id` | Administrador |
| DELETE | `/api/usuarios/delete/:id` | Administrador |

### Login desde EchoAPI, Postman o Java

Enviar JSON con `nombre_usuario` y `contrasena` a `POST /api/usuarios/login`. La respuesta es `{ message: "Login correcto.", usuario }`, con ID, nombre y rol. El login comprueba los datos y no crea una sesion en el servidor.

Para cada peticion protegida, en EchoAPI abrir **Auth > Basic Auth** y completar Username y Password. La herramienta construye la cabecera automaticamente. El usuario y la contrasena se verifican en cada peticion y no se necesitan tokens.

En Java conservar las credenciales solo en memoria mientras se usa la aplicacion. Al cerrar sesion, eliminarlas de la memoria. Construir la cabecera usando UTF-8:

```java
String credenciales = nombreUsuario + ":" + contrasena;
String authorization = "Basic " + java.util.Base64.getEncoder()
    .encodeToString(credenciales.getBytes(java.nio.charset.StandardCharsets.UTF_8));
// Agregar authorization al header Authorization de cada peticion protegida.
```

Usar la URL HTTPS de Render al publicar, porque Basic Auth envia las credenciales en cada peticion. Base64 es una codificacion, no cifrado. Un vendedor puede consultar `/me`, pero no administrar usuarios (403). Al cambiar una contrasena, usar la nueva en Basic Auth.

### Crear un usuario

```json
{
  "nombre_usuario": "vendedor_prueba",
  "nombre_completo": "Vendedor de Prueba",
  "contrasena": "PruebaVenta123",
  "rol": "vendedor"
}
```

No enviar `id_usuario`, `fecha_creacion` ni `contrasena_hash`: los administra el servidor. Crear devuelve 201 con los datos publicos del usuario. PUT acepta uno o mas de los mismos cuatro campos; enviar `contrasena` para cambiarla. Los hashes nunca se incluyen en las respuestas.

Codigos principales: 400 datos invalidos, 401 credenciales invalidas, 403 sin permisos, 404 usuario inexistente, 409 nombre duplicado o eliminacion incompatible. Un administrador no puede eliminarse ni quitarse su propio rol. Cuando existan ventas relacionadas, no se debe eliminar su vendedor.

### Verificacion automatica

`npm.cmd test` comprueba el flujo HTTP de login y CRUD, permisos, exclusiones del hash, cambio de contrasena, duplicados, validaciones y Basic Auth. Usa persistencia simulada y no se conecta a Neon. Probar despues en EchoAPI permite verificar la conexion y persistencia reales.


## Artistas: probar en EchoAPI

Reiniciar con `npm.cmd run dev`. Si falta la tabla, ejecutar `npm.cmd run db:artistas`.
En cada peticion seleccionar Auth > Basic Auth y escribir usuario y contrasena.
Administradores y vendedores consultan; solo administradores crean, actualizan y eliminan.

| Metodo | URL local | Funcion |
| --- | --- | --- |
| POST | `http://localhost:8081/api/artistas/create` | Crear |
| GET | `http://localhost:8081/api/artistas/` | Listar |
| GET | `http://localhost:8081/api/artistas/?nombre_artistico=Ricardo` | Filtrar por nombre |
| GET | `http://localhost:8081/api/artistas/1` | Consultar por ID |
| PUT | `http://localhost:8081/api/artistas/update/1` | Actualizar |
| DELETE | `http://localhost:8081/api/artistas/delete/1` | Eliminar |

Para POST y PUT usar Body > raw > JSON:

```json
{
  "nombre_artistico": "Ricardo Arjona",
  "genero_musical": "Pop latino",
  "pais_origen": "Guatemala"
}
```

PUT requiere nombre_artistico y genero_musical. pais_origen es opcional y se guarda como null si se omite. Usar en las URLs el id_artista que devuelve POST, no asumir que sera 1.
POST devuelve 201; consultas, cambios y eliminacion devuelven 200. Datos invalidos: 400; credenciales incorrectas: 401; sin permisos: 403; artista inexistente: 404; artista asociado a conciertos: 409.

## Conciertos: probar en EchoAPI

1. Crear primero al menos un artista y anotar su `id_artista`.
2. Si la tabla todavia no existe, ejecutar `npm.cmd run db:conciertos`. El comando crea la tabla y su relacion con artistas sin borrar tablas.
3. Reiniciar el servidor. Usar Auth > Basic Auth con el administrador para POST, PUT y DELETE. Un vendedor autenticado puede hacer GET.

| Metodo | URL local | Funcion |
| --- | --- | --- |
| POST | `http://localhost:8081/api/conciertos/create` | Crear |
| GET | `http://localhost:8081/api/conciertos/` | Listar |
| GET | `http://localhost:8081/api/conciertos/?estado=programado` | Filtrar por estado |
| GET | `http://localhost:8081/api/conciertos/?id_artista=1` | Filtrar por artista |
| GET | `http://localhost:8081/api/conciertos/?titulo_evento=gira` | Filtrar por titulo |
| GET | `http://localhost:8081/api/conciertos/1` | Consultar por ID |
| PUT | `http://localhost:8081/api/conciertos/update/1` | Actualizar |
| DELETE | `http://localhost:8081/api/conciertos/delete/1` | Eliminar |

Para POST y PUT usar Body > raw > JSON. `fecha_concierto` debe incluir fecha, hora y zona horaria:

```json
{
  "id_artista": 1,
  "titulo_evento": "Gira de ejemplo",
  "fecha_concierto": "2026-12-20T20:00:00-06:00",
  "recinto": "Ciudad de Guatemala",
  "estado": "programado"
}
```

`estado` puede ser `programado`, `activo` o `finalizado`; si se omite, empieza como `programado`. Un concierto necesita un artista que ya exista. Si ya hay tablas de inventario o ventas relacionadas, PostgreSQL impedira eliminar el concierto.

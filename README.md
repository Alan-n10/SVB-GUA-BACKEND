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

1. Mantener los datos de Neon en `.env`. `JWT_SECRET` debe ser una clave aleatoria de al menos 32 caracteres; ya se genero una clave local durante la implementacion. Tu companero debe configurar su propia clave en su `.env`.
2. Ejecutar `npm.cmd run db:usuarios` si todavia no existe la tabla.
3. Ejecutar `npm.cmd run db:admin`. Pedira nombre de usuario y nombre completo, creara el primer administrador y mostrara una contrasena aleatoria. Guardarla para iniciar sesion. El comando no reemplaza usuarios existentes ni crea otro administrador si ya hay uno.
4. Reiniciar el servidor con `npm.cmd run dev`.
5. Importar `postman/SVB-GUA-Usuarios.postman_collection.json` en Postman. En las variables de la coleccion completar `adminUsuario` y `adminContrasena` localmente. No exportar ni subir credenciales reales.
6. Ejecutar las peticiones en orden. Login guarda `token` y crear vendedor guarda `usuarioId`. La ultima peticion elimina al vendedor de prueba.

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

### Login desde Postman o Java

Enviar JSON con `nombre_usuario` y `contrasena` a `POST /api/usuarios/login`. La respuesta tiene `{ token, usuario }`. Conservar el token en memoria y enviarlo en las siguientes peticiones:

```text
Authorization: Bearer TOKEN_RECIBIDO
Content-Type: application/json
```

El token expira en dos horas. Volver a iniciar sesion cuando el servidor devuelva 401. El endpoint `/me` permite consultar el usuario actual. Un vendedor puede iniciar sesion y consultar `/me`, pero no administrar usuarios (403).

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

Codigos principales: 400 datos invalidos, 401 sesion o credenciales invalidas, 403 sin permisos, 404 usuario inexistente, 409 nombre duplicado o eliminacion incompatible. Un administrador no puede eliminarse ni quitarse su propio rol. Cuando existan ventas relacionadas, no se debe eliminar su vendedor.

### Verificacion automatica

`npm.cmd test` comprueba el flujo HTTP de login y CRUD, permisos, exclusiones del hash, cambio de contrasena, duplicados, validaciones y tokens expirados. Usa persistencia simulada y no se conecta a Neon. La coleccion Postman permite verificar posteriormente la conexion y persistencia reales.

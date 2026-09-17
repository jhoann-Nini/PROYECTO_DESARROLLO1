# API REST de TecnoReview

## 1. Información general

**Proyecto:** TecnoReview  
**Tipo de API:** REST  
**Backend:** Spring Boot / Java  
**Frontend:** Next.js + TypeScript  
**Base de datos:** PostgreSQL  
**Proveedor de base de datos:** Supabase  
**Formato de intercambio:** JSON  
**Protocolo:** HTTP/HTTPS  
**Estado:** En desarrollo

---

# 2. Objetivo

La API REST de TecnoReview permite la comunicación entre el frontend y el backend del sistema.

El frontend desarrollado con Next.js realiza solicitudes HTTP al backend desarrollado con Spring Boot.

El backend se encarga de:

- Recibir las solicitudes.
- Validar los datos.
- Aplicar las reglas de negocio.
- Consultar o modificar la base de datos.
- Controlar permisos.
- Devolver respuestas al frontend.

El flujo general es:

```text
Usuario
   ↓
Next.js + TypeScript
   ↓
HTTP/HTTPS
   ↓
Spring Boot REST API
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL / Supabase
```
---

# Organización propuesta del backend

La estructura del backend puede organizarse de la siguiente manera:

backend/
└── src/
    └── main/
        └── java/
            └── ...
                ├── controller/
                ├── service/
                ├── repository/
                ├── entity/
                ├── dto/
                ├── exception/
                └── config/
```
| Recurso          | Método | Endpoint                           | Acceso             |  
| Productos        | GET    | `/api/productos`                   | Público            |
| Producto         | GET    | `/api/productos/{id}`              | Público            |
| Productos        | POST   | `/api/productos`                   | Autorizado         |
| Producto         | PUT    | `/api/productos/{id}`              | Autorizado         |
| Producto         | DELETE | `/api/productos/{id}`              | Autorizado         |
| Búsqueda         | GET    | `/api/productos/buscar`            | Público            |
| Categorías       | GET    | `/api/categorias`                  | Público            |
| Categoría        | POST   | `/api/categorias`                  | Autorizado         |
| Categoría        | PUT    | `/api/categorias/{id}`             | Autorizado         |
| Categoría        | DELETE | `/api/categorias/{id}`             | Autorizado         |
| Marcas           | GET    | `/api/marcas`                      | Público            |
| Marca            | POST   | `/api/marcas`                      | Autorizado         |
| Marca            | PUT    | `/api/marcas/{id}`                 | Autorizado         |
| Marca            | DELETE | `/api/marcas/{id}`                 | Autorizado         |
| Registro         | POST   | `/api/auth/register`               | Público            |
| Login            | POST   | `/api/auth/login`                  | Público            |
| Reseñas          | GET    | `/api/productos/{id}/resenas`      | Público            |
| Reseña           | POST   | `/api/productos/{id}/resenas`      | Usuario            |
| Reseña           | PUT    | `/api/resenas/{id}`                | Usuario autorizado |
| Reseña           | DELETE | `/api/resenas/{id}`                | Usuario autorizado |
| Valoración       | POST   | `/api/productos/{id}/valoraciones` | Usuario            |
| Comparación      | GET    | `/api/comparador`                  | Público            |
| Establecimientos | GET    | `/api/establecimientos`            | Público            |
| Establecimiento  | GET    | `/api/establecimientos/{id}`       | Público            |
| Establecimiento  | POST   | `/api/establecimientos`            | Autorizado         |
| Establecimiento  | PUT    | `/api/establecimientos/{id}`       | Autorizado         |
| Establecimiento  | DELETE | `/api/establecimientos/{id}`       | Autorizado         |

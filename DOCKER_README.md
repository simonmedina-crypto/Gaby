# Licorera Gaby - Docker Deployment

## Arquitectura Completa Dockerizada

### Servicios:
- **Frontend**: React + Nginx (Puerto 80)
- **Backend**: FastAPI + Python (Puerto 8000)
- **Base de Datos**: PostgreSQL (Puerto 5432)

## Requisitos Previos

1. **Docker** instalado
2. **Docker Compose** instalado
3. **Git** (para clonar el repositorio)

## Despliegue Rápido

### Opción 1: Script Automático
```bash
# Ejecutar el script de despliegue
./deploy.sh
```

### Opción 2: Manual
```bash
# 1. Limpiar contenedores anteriores
docker-compose down -v

# 2. Construir imágenes
docker-compose build

# 3. Iniciar servicios
docker-compose up -d

# 4. Verificar estado
docker-compose ps
```

# 🐕 LICORERA GABY - ACCESO DIRECTO Y SIMPLE

## 🚀 INICIO RÁPIDO

### **Opción 1: Script de Acceso Directo (Recomendado)**
```bash
# Ejecutar este archivo y listo
.\acceso-directo.bat
```

### **Opción 2: Docker Manual**
```bash
docker-compose up -d
```

## 📱 ENLACES DE ACCESO

### **✅ Desde tu computadora:**
```
http://localhost:8080
```

### **✅ Desde celular o cualquier dispositivo en tu red:**
```
http://licorera-gaby.local:8080
```

### **✅ Acceso por IP (si lo prefieres):**
```bash
# Obtener tu IP actual
ipconfig

# Usar tu IP en el navegador
http://[TU-IP]:8080
```

## 🌍 ACCESO GLOBAL (DESDE INTERNET)

1. **Configura tu router**:
   - Redirige puerto **8080** → tu computadora
   - Redirige puerto **8000** → tu computadora

2. **Obtén tu IP pública**:
   - Visita: https://whatismyip.com

3. **Acceso global**:
   ```
   http://[TU-IP-PÚBLICA]:8080
   ```

## ✅ ESTADO ACTUAL

- ✅ **Frontend**: Corriendo en puerto 8080
- ✅ **Backend**: Corriendo en puerto 8000  
- ✅ **Base de Datos**: Corriendo en puerto 5433
- ✅ **API**: Conectada y funcionando
- ✅ **Creación de productos**: Habilitada
- ✅ **Acceso por nombre**: `licorera-gaby.local`

## �️ SI CAMBIA TU IP

### **Automático (Recomendado)**:
```bash
.\actualizar-ip.bat
```

### **Manual**:
1. Ejecuta `.\acceso-directo.bat`
2. El script mostrará tu IP actual
3. Si cambió, el script te ayudará a actualizar

## 🎯 TODO FUNCIONA

La aplicación ahora está configurada para:
- ✅ **Acceso simple**: Sin complicaciones de IPs
- ✅ **Acceso por nombre**: `licorera-gaby.local`
- ✅ **Acceso por IP**: Directo sin problemas
- ✅ **API conectada**: Frontend y backend comunicándose
- ✅ **Acceso global**: Con configuración de router

**¡Listo para usar! Ejecuta `.\acceso-directo.bat` y accede fácilmente.** 🐕✨docker-compose logs -f backend
docker-compose logs -f db
```

### Reiniciar Servicios
```bash
# Reiniciar todo
docker-compose restart

# Reiniciar un servicio específico
docker-compose restart backend
```

### Detener Todo
```bash
# Detener y eliminar contenedores
docker-compose down

# Detener y eliminar volúmenes (cuidado: pierdes datos)
docker-compose down -v
```

### Actualizar la Aplicación
```bash
# Reconstruir y desplegar cambios
docker-compose up -d --build
```

## Configuración

### Variables de Entorno

#### Backend
- `DATABASE_URL`: Conexión a PostgreSQL (configurada automáticamente)

#### Frontend
- `VITE_API_URL`: URL de la API (configurada para Docker)

### Base de Datos
- **Usuario**: postgres
- **Password**: admin123
- **Base de Datos**: licorera_gaby
- **Host**: localhost:5432

## Estructura de Archivos

```
.
|-- docker-compose.yml          # Configuración Docker Compose
|-- deploy.sh                   # Script de despliegue
|-- tienda_Gaby/
|   |-- backend/
|   |   |-- Dockerfile          # Configuración Docker Backend
|   |   |-- requirements.txt    # Dependencias Python
|   |   |-- main.py            # Código FastAPI
|   |-- frontend/
|   |   |-- Dockerfile          # Configuración Docker Frontend
|   |   |-- nginx.conf          # Configuración Nginx
|   |   |-- .env                # Variables de entorno
|   |   |-- package.json        # Dependencias Node
|   |   |-- src/                # Código React
```

## Solución de Problemas

### Problemas Comunes

1. **Error de conexión a base de datos**
   ```bash
   # Esperar a que la base de datos esté lista
   docker-compose logs db
   ```

2. **Error de puerto ocupado**
   ```bash
   # Ver qué usa el puerto
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8000
   netstat -tulpn | grep :5432
   ```

3. **Error de permisos**
   ```bash
   # Dar permisos al script
   chmod +x deploy.sh
   ```

4. **Error de construcción**
   ```bash
   # Limpiar caché y reconstruir
   docker-compose down
   docker system prune -f
   docker-compose build --no-cache
   ```

### Verificación del Despliegue

1. **Verificar contenedores corriendo**:
   ```bash
   docker-compose ps
   ```

2. **Verificar health checks**:
   ```bash
   curl http://localhost:8000/health
   ```

3. **Verificar frontend**:
   - Abrir http://localhost:80 en el navegador
   - Debería cargar la aplicación completa

## Desarrollo Local

Para desarrollo sin Docker:

```bash
# Backend
cd tienda_Gaby/backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd tienda_Gaby/frontend
npm install
npm run dev
```

## Producción

Para producción:

1. Cambiar `allow_origins=["*"]` a tu dominio específico
2. Usar HTTPS en lugar de HTTP
3. Configurar variables de entorno seguras
4. Usar volúmenes persistentes para la base de datos
5. Configurar backups automáticos

## Soporte

Si tienes problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica que Docker esté corriendo: `docker version`
3. Asegúrate de que los puertos estén libres
4. Reinicia todo: `docker-compose down && docker-compose up -d`

---

**¡Tu aplicación Licorera Gaby 100% funcional con Docker!**

import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, or_
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import multiprocessing
from sqlalchemy import inspect, text
import os

# --- CONFIGURACIÓN BASE DE DATOS ---
# Por defecto en desarrollo local usamos SQLite.
# En Docker Compose, define DATABASE_URL con el servicio 'db'.
DEFAULT_DATABASE_URL = 'sqlite:///./tienda_gaby.db'
DATABASE_URL = os.environ.get('DATABASE_URL', DEFAULT_DATABASE_URL)

connect_args = {}
if DATABASE_URL.startswith('sqlite'):
    connect_args = {'check_same_thread': False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- APLICACIÓN FASTAPI ---
app = FastAPI(title="Licorera Gaby API", version="1.0.0")

# --- MIDDLEWARE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción pon aquí la URL de tu frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HEALTH CHECK ---
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Licorera Gaby API"}

# --- ENDPOINT RAIZ ---
@app.get("/")
async def root():
    return {"message": "Licorera Gaby API", "version": "1.0.0"}

# Modelo de Producto (Inventario) con columna BARCODE
class Producto(Base):
    __tablename__ = "productos"
    id = Column(String, primary_key=True, index=True)
    barcode = Column(String, index=True, nullable=True) # <-- NUEVA COLUMNA
    name = Column(String)
    cant = Column(Integer)
    costo = Column(Float)
    venta = Column(Float)

# Modelo de Ventas
class Venta(Base):
    __tablename__ = "ventas"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    producto_id = Column(String)
    nombre_producto = Column(String)
    precio_venta = Column(Float)
    precio_costo = Column(Float)
    fecha = Column(DateTime, default=datetime.datetime.now)
    vendedor = Column(String, nullable=True)  # NUEVO: quién realizó la venta

# Modelo de Fiados
class Fiado(Base):
    __tablename__ = "fiados"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cliente_nombre = Column(String, nullable=False)
    fecha_fiado = Column(DateTime, default=datetime.datetime.now)
    productos = Column(String, nullable=False)  # JSON con productos y cantidades
    total_fiado = Column(Float, nullable=False)
    estado = Column(String, default="pendiente")  # "pendiente" o "realizado"
    vendedor = Column(String, nullable=True)
    fecha_pago = Column(DateTime, nullable=True)  # Fecha cuando se pagó el fiado

# Crea las tablas (esto agregará la columna si no existe, o puedes borrar la tabla y recrearla)
Base.metadata.create_all(bind=engine)

# Esquemas de Validación
class ItemFactura(BaseModel):
    id: str
    cantidad: int

class FacturaSchema(BaseModel):
    items: List[ItemFactura]
    vendedor: Optional[str] = None  # NUEVO: vendedor que atenderá la venta

# Esquemas para Fiados
class ItemFiado(BaseModel):
    id: str
    cantidad: int
    nombre: str
    precio: float

class FiadoSchema(BaseModel):
    cliente_nombre: str
    productos: List[ItemFiado]
    total_fiado: float
    vendedor: Optional[str] = None

class FiadoCobroSchema(BaseModel):
    id: int
    vendedor: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Intento simple de migración para añadir columna 'vendedor' si la tabla ya existía
with engine.connect() as conn:
    insp = inspect(engine)
    if "ventas" in insp.get_table_names():
        cols = [c["name"] for c in insp.get_columns("ventas")]
        if "vendedor" not in cols:
            try:
                conn.execute(text("ALTER TABLE ventas ADD COLUMN vendedor VARCHAR"))
            except Exception:
                pass

# --- RUTAS DE INVENTARIO ---

@app.get("/productos")
def listar(db: Session = Depends(get_db)):
    return db.query(Producto).order_by(Producto.name).all()

@app.post("/inventory/create")
async def crear(data: dict, db: Session = Depends(get_db)):
    # 1. Validaciones básicas de campos requeridos y numéricos
    prod_id = str(data.get('id', '')).strip()
    nombre = str(data.get('name', '')).strip()
    if not prod_id:
        raise HTTPException(status_code=400, detail="El ID del producto es obligatorio")
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre del producto es obligatorio")

    try:
        cant = int(data.get('cant', 0))
        costo = float(data.get('costo', 0))
        venta = float(data.get('venta', 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Stock y precios deben ser numéricos")

    if cant < 0 or costo < 0 or venta < 0:
        raise HTTPException(status_code=400, detail="Stock y precios no pueden ser negativos")

    # 2. Verificar duplicados (ID o Barcode)
    id_existe = db.query(Producto).filter(Producto.id == prod_id).first()
    if id_existe:
        raise HTTPException(status_code=400, detail="El ID ya existe")
    
    if data.get('barcode'):
        bar_existe = db.query(Producto).filter(Producto.barcode == str(data['barcode'])).first()
        if bar_existe:
            raise HTTPException(status_code=400, detail="El Código de Barras ya existe")
    
    # 2. Extraer solo los campos que pertenecen al modelo Producto
    # Esto evita que campos extra de React rompan la consulta
    campos_validos = {k: v for k, v in data.items() if k in Producto.__table__.columns.keys()}
    campos_validos['id'] = prod_id
    campos_validos['name'] = nombre
    campos_validos['cant'] = cant
    campos_validos['costo'] = costo
    campos_validos['venta'] = venta
    
    nuevo = Producto(**campos_validos)
    db.add(nuevo)
    db.commit()
    return {"status": "ok"}


@app.put("/inventory/update/{prod_id}")
async def actualizar(prod_id: str, data: dict, db: Session = Depends(get_db)):
    prod = db.query(Producto).filter(Producto.id == prod_id).first()
    if not prod: 
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Validaciones de negocio al actualizar
    if 'barcode' in data and data.get('barcode'):
        # Verificar que el nuevo código de barras no esté usado por otro producto
        bar_existe = (
            db.query(Producto)
            .filter(Producto.barcode == str(data['barcode']), Producto.id != prod_id)
            .first()
        )
        if bar_existe:
            raise HTTPException(status_code=400, detail="El Código de Barras ya existe en otro producto")

    # Validar numéricos si vienen en el payload
    for campo in ('cant', 'costo', 'venta'):
        if campo in data and data[campo] is not None:
            try:
                valor = float(data[campo])
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail=f"El campo {campo} debe ser numérico")
            if valor < 0:
                raise HTTPException(status_code=400, detail=f"El campo {campo} no puede ser negativo")

    for key, value in data.items():
        if hasattr(prod, key):
            setattr(prod, key, value)
    
    db.commit()
    return {"status": "ok"}

@app.delete("/inventory/{prod_id}")
def eliminar(prod_id: str, db: Session = Depends(get_db)):
    db.query(Producto).filter(Producto.id == prod_id).delete()
    db.commit()
    return {"status": "ok"}

@app.get("/inventory/barcode/{barcode}")
def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    prod = db.query(Producto).filter(Producto.barcode == barcode).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return prod

@app.get("/inventory/{prod_id}")
def get_product_by_id(prod_id: str, db: Session = Depends(get_db)):
    prod = db.query(Producto).filter(Producto.id == prod_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return prod

# --- RUTAS DE VENTAS (MODIFICADA PARA BUSCAR POR BARCODE) ---
@app.post("/facturar")
def facturar(factura: FacturaSchema, db: Session = Depends(get_db)):
    if not factura.items:
        raise HTTPException(status_code=400, detail="La factura debe contener al menos un producto")

    for item in factura.items:
        if item.cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"La cantidad del producto {item.id} debe ser mayor que cero")
        # BUSQUEDA INTELIGENTE: Busca por ID O por Barcode
        p = db.query(Producto).filter(
            or_(Producto.id == item.id, Producto.barcode == item.id)
        ).first()

        if p and p.cant >= item.cantidad:
            p.cant -= item.cantidad
            db.add(Venta(
                producto_id=p.id, 
                nombre_producto=p.name, 
                precio_venta=p.venta * item.cantidad, 
                precio_costo=p.costo * item.cantidad,
                vendedor=factura.vendedor or "Sistema"
            ))
        else:
            raise HTTPException(status_code=400, detail=f"Error en producto {item.id}: Stock insuficiente o no existe")
            
    db.commit()
    return {"status": "ok"}

@app.get("/historial-ventas")
def historial(db: Session = Depends(get_db)):
    return db.query(Venta).all()

# --- RUTAS DE FIADOS ---

@app.post("/fiados/crear")
def crear_fiado(fiado: FiadoSchema, db: Session = Depends(get_db)):
    import json
    
    if not fiado.productos:
        raise HTTPException(status_code=400, detail="El fiado debe contener al menos un producto")

    # Verificar stock disponible
    for item in fiado.productos:
        if item.cantidad <= 0:
            raise HTTPException(status_code=400, detail=f"La cantidad del producto {item.id} debe ser mayor que cero")
        
        p = db.query(Producto).filter(
            or_(Producto.id == item.id, Producto.barcode == item.id)
        ).first()

        if not p or p.cant < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Error en producto {item.id}: Stock insuficiente o no existe")

    # Crear el fiado y descontar stock
    productos_json = json.dumps([{"id": item.id, "nombre": item.nombre, "cantidad": item.cantidad, "precio": item.precio} for item in fiado.productos])
    
    nuevo_fiado = Fiado(
        cliente_nombre=fiado.cliente_nombre,
        productos=productos_json,
        total_fiado=fiado.total_fiado,
        vendedor=fiado.vendedor or "Sistema"
    )
    
    db.add(nuevo_fiado)

    # Descontar stock
    for item in fiado.productos:
        p = db.query(Producto).filter(
            or_(Producto.id == item.id, Producto.barcode == item.id)
        ).first()
        p.cant -= item.cantidad

    db.commit()
    return {"status": "ok", "id": nuevo_fiado.id}

@app.get("/fiados")
def listar_fiados(db: Session = Depends(get_db)):
    return db.query(Fiado).order_by(Fiado.fecha_fiado.desc()).all()

@app.get("/fiados/pendientes")
def listar_fiados_pendientes(db: Session = Depends(get_db)):
    return db.query(Fiado).filter(Fiado.estado == "pendiente").order_by(Fiado.fecha_fiado.desc()).all()

@app.post("/fiados/cobrar")
def cobrar_fiado(cobro: FiadoCobroSchema, db: Session = Depends(get_db)):
    import json
    
    fiado = db.query(Fiado).filter(Fiado.id == cobro.id).first()
    if not fiado:
        raise HTTPException(status_code=404, detail="Fiado no encontrado")
    
    if fiado.estado == "realizado":
        raise HTTPException(status_code=400, detail="Este fiado ya fue cobrado")

    # Actualizar estado del fiado
    fiado.estado = "realizado"
    fiado.fecha_pago = datetime.datetime.now()
    fiado.vendedor = cobro.vendedor or fiado.vendedor

    # Convertir productos del fiado a ventas
    productos_fiado = json.loads(fiado.productos)
    
    for producto_data in productos_fiado:
        db.add(Venta(
            producto_id=producto_data["id"],
            nombre_producto=producto_data["nombre"],
            precio_venta=producto_data["precio"] * producto_data["cantidad"],
            precio_costo=0,  # Ya fue descontado cuando se hizo el fiado
            vendedor=fiado.vendedor,
            fecha=fiado.fecha_pago
        ))

    db.commit()
    return {"status": "ok", "mensaje": "Fiado cobrado exitosamente"}

@app.delete("/fiados/{fiado_id}")
def eliminar_fiado(fiado_id: int, db: Session = Depends(get_db)):
    fiado = db.query(Fiado).filter(Fiado.id == fiado_id).first()
    if not fiado:
        raise HTTPException(status_code=404, detail="Fiado no encontrado")
    
    if fiado.estado == "realizado":
        raise HTTPException(status_code=400, detail="No se puede eliminar un fiado ya cobrado")

    # Devolver stock al inventario
    import json
    productos_fiado = json.loads(fiado.productos)
    
    for producto_data in productos_fiado:
        p = db.query(Producto).filter(
            or_(Producto.id == producto_data["id"], Producto.barcode == producto_data["id"])
        ).first()
        if p:
            p.cant += producto_data["cantidad"]

    db.delete(fiado)
    db.commit()
    return {"status": "ok", "mensaje": "Fiado eliminado y stock devuelto"}

if __name__ == "__main__":
    import uvicorn
    try:
        multiprocessing.set_start_method('spawn', force=True)
    except RuntimeError:
        pass
        
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

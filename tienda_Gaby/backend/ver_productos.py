from main import SessionLocal, Producto

db = SessionLocal()
productos = db.query(Producto).all()

print('=== PRODUCTOS EN BASE DE DATOS ===')
print(f'Total: {len(productos)} productos\n')

for p in productos:
    print(f'ID: {p.id}')
    print(f'Nombre: {p.name}')
    print(f'Stock: {p.cant} unidades')
    print(f'Costo: ${p.costo:,}')
    print(f'Venta: ${p.venta:,}')
    barcode = p.barcode if p.barcode else "No asignado"
    print(f'Codigo de barras: {barcode}')
    print('-' * 40)

db.close()

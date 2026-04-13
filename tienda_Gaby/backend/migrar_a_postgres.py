import sqlite3
import requests
import json

# Conectar a SQLite para obtener los datos
conn_sqlite = sqlite3.connect('licorera_gaby.db')
cursor_sqlite = conn_sqlite.cursor()

# Obtener productos de SQLite
cursor_sqlite.execute("SELECT * FROM productos")
productos_sqlite = cursor_sqlite.fetchall()

# Obtener nombres de columnas
columnas = [description[0] for description in cursor_sqlite.description]

print(f'Encontrados {len(productos_sqlite)} productos en SQLite')
print('Columnas:', columnas)

# Migrar a PostgreSQL via API
for i, producto in enumerate(productos_sqlite):
    producto_dict = dict(zip(columnas, producto))
    
    # Convertir valores a tipos correctos
    producto_dict['cant'] = int(producto_dict.get('cant', 0))
    producto_dict['costo'] = float(producto_dict.get('costo', 0))
    producto_dict['venta'] = float(producto_dict.get('venta', 0))
    
    try:
        response = requests.post('http://localhost:8000/inventory/create', json=producto_dict)
        if response.status_code == 200:
            print(f'✅ Producto {producto_dict["name"]} migrado exitosamente')
        else:
            print(f'❌ Error migrando {producto_dict["name"]}: {response.text}')
    except Exception as e:
        print(f'❌ Error de conexion: {e}')

conn_sqlite.close()
print('\nMigración completada')

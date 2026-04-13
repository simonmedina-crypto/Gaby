import requests
import json

# Productos de ejemplo
productos_ejemplo = [
    {'id': '001', 'name': 'AGUARDIENTE ANTIOQUENO', 'cant': 50, 'costo': 25000, 'venta': 35000, 'barcode': '770000000001'},
    {'id': '002', 'name': 'RON CALDAS', 'cant': 30, 'costo': 18000, 'venta': 25000, 'barcode': '770000000002'},
    {'id': '003', 'name': 'WHISKY OLD PAR', 'cant': 15, 'costo': 45000, 'venta': 65000, 'barcode': '770000000003'},
    {'id': '004', 'name': 'VINO TINTO CASILLERO', 'cant': 25, 'costo': 35000, 'venta': 48000, 'barcode': '770000000004'},
    {'id': '005', 'name': 'CERVEZA ÁGUILA', 'cant': 100, 'costo': 2000, 'venta': 3000, 'barcode': '770000000005'},
    {'id': '006', 'name': 'TEQUILA JOSE CUERVO', 'cant': 20, 'costo': 55000, 'venta': 75000, 'barcode': '770000000006'},
    {'id': '007', 'name': 'GIN BOMBAY SAPPHIRE', 'cant': 12, 'costo': 65000, 'venta': 85000, 'barcode': '770000000007'},
    {'id': '008', 'name': 'VODKA ABSOLUT', 'cant': 18, 'costo': 40000, 'venta': 55000, 'barcode': '770000000008'}
]

# Crear productos
for producto in productos_ejemplo:
    try:
        response = requests.post('http://localhost:8000/inventory/create', json=producto)
        if response.status_code == 200:
            print(f'Producto {producto["name"]} creado exitosamente')
        else:
            print(f'Error creando {producto["name"]}: {response.text}')
    except Exception as e:
        print(f'Error de conexion: {e}')

print('\nProceso completado')

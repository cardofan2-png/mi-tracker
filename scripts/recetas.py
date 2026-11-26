#!/usr/bin/env python3
"""Genera www/recetas.json (reducido y minificado) desde el recetario completo de MokiFit.

Uso: python3 scripts/recetas.py [ruta/recetas_mokifit.json]
  - Sin ruta busca ./recetas_mokifit.json y luego /home/claude/recetas/recetas_mokifit.json.
  - Si existe /home/claude/recetas/traducciones.json o scripts/traducciones.json, agrega en/pt:
    {"D01":{"en":{"nombre"?,"descripcion","pasos":[...],"medidas":[...]},"pt":{...}},
     "_ingredientes":{k:{en,pt}},"_etiquetas":{...},"_regiones":{...}}
    Sin ese archivo la app muestra el español como respaldo.
Formato de salida (claves cortas): ver function rcN() en www/index.html.
"""
import json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
src = sys.argv[1] if len(sys.argv) > 1 else next(
    (p for p in [os.path.join(RAIZ, 'recetas_mokifit.json'), '/home/claude/recetas/recetas_mokifit.json'] if os.path.exists(p)), None)
if not src:
    sys.exit('No encontré recetas_mokifit.json (pásalo como argumento).')
d = json.load(open(src, encoding='utf-8'))
tr = {}
for p in ['/home/claude/recetas/traducciones.json', os.path.join(AQUI, 'traducciones.json')]:
    if os.path.exists(p):
        tr = json.load(open(p, encoding='utf-8')); print('Traducciones:', p); break

PL = ['Déficit', 'Mantenimiento', 'Volumen']
r1 = lambda v: int(round(v)) if abs(v - round(v)) < 0.05 else round(v, 1)
def par(dic):  # {"en":..,"pt":..} -> [en, pt]
    return [dic.get('en') or '', dic.get('pt') or '']

out = {'v': d.get('version', 1),
       't': {c: {'n': x['pais'], 's': x['super'], 'f': x['fresco'], 'e': x['especial']} for c, x in d['tiendas'].items()},
       'r': []}
for r in d['recetas']:
    x = {'id': r['id'], 'n': r['nombre'], 'ne': r.get('nombre_en', ''), 'np': r.get('nombre_pt', ''),
         'de': r['descripcion'], 'ro': r['region_origen'],
         'in': [[i['k'], r1(i['g']), i['medida']] + ([i['nombre']] if i['nombre'] != i['k'] else []) for i in r['ingredientes']],
         'pa': r['pasos'], 'tm': r['tiempo_min'], 'pr': r['preparacion'], 'co': r['costo'], 'pi': r['plan_ideal'],
         'et': r['etiquetas'], 'ps': r['paises'], 'di': r['disponibilidad'], 'ca': r['canales'],
         # kcal, proteína, carbos, grasas, fibra, factor — en orden Déficit, Mantenimiento, Volumen
         'pl': [[round(r['planes'][p]['kcal']), r1(r['planes'][p]['p']), r1(r['planes'][p]['c']), r1(r['planes'][p]['g']),
                 r1(r['planes'][p]['fib']), r['planes'][p]['factor']] for p in PL]}
    t = tr.get(r['id']) or {}
    for lg in ['en', 'pt']:
        if t.get(lg):
            y = t[lg]; z = {}
            if y.get('nombre'): z['n'] = y['nombre']
            if y.get('descripcion'): z['de'] = y['descripcion']
            if y.get('pasos'): z['pa'] = y['pasos']
            if y.get('medidas'): z['me'] = y['medidas']
            if z: x[lg] = z
    out['r'].append(x)
L = {}
for clave, corta in [('_ingredientes', 'ing'), ('_etiquetas', 'et'), ('_regiones', 'rg')]:
    if tr.get(clave): L[corta] = {k: par(v) for k, v in tr[clave].items()}
if L: out['L'] = L
dst = os.path.join(RAIZ, 'www', 'recetas.json')
json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('Listo:', dst, len(out['r']), 'recetas,', os.path.getsize(dst), 'bytes')

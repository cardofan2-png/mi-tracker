// Candado de regresión: cada mejora ya aprobada deja aquí una marca que debe seguir existiendo.
// Si una versión nueva borra alguna, la compilación del APK se detiene antes de publicarse.
// Al aprobar una mejora nueva, agrega su marca a la lista.
import { readFileSync } from 'node:fs';
const f = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = f('www/index.html'), main = f('android/app/src/main/java/com/ricardo/mitracker/MainActivity.java'),
  man = f('android/app/src/main/AndroidManifest.xml'), pkg = f('package.json'), wk = f('worker/worker.js'), wt = f('worker/wrangler.toml');
const marcas = [
  ['✕ en todas las ventanas', app, 'class="mx" data-close="1"'],
  ['Guía de medidas con Mochi', app, 'function measGuide'],
  ['Silueta con cinta métrica', app, 'var MSIL='],
  ['Báscula de baño en Peso', app, "['weight',BASC,'Peso']"],
  ['Horas en un renglón (solo horarios)', app, '.hor .ht{flex:0 0 auto'],
  ['Diseño adaptable', app, 'Adaptable'],
  ['Tope de letra grande 115%', main, 'setTextZoom(115)'],
  ['Dictado por voz', pkg, 'capacitor-speech-recognition'],
  ['Botón Hablar', app, 'data-voz'],
  ['Cámara nativa', pkg, '"@capacitor/camera"'],
  ['Cámara/galería con pick()', app, 'function pick(id)'],
  ['Foto: estado que sobrevive al redibujo', app, 'function phShow'],
  ['Foto: tiempo límite', app, 'La foto está tardando demasiado'],
  ['Autorizar Health Connect siempre visible', app, "'Autorizar y traer mis datos'"],
  ['Volver a autorizar con datos importados', app, "'Volver a autorizar y actualizar'"],
  ['Conectar dispositivos (sueño)', app, "'Conectar mis dispositivos'"],
  ['Nota de Google Fit', app, '¿Usas Google Fit?'],
  ['Aviso fuera de Android', app, 'solo funciona en la app instalada en Android'],
  ['Objetivo bajar/ganar/mantener', app, "['keep','↔️','Mantener mi peso'"],
  ['Ganar: superávit máximo 500 kcal', app, 'Math.min(pr.rate*1100,500)'],
  ['Mantener ±2 kg', app, 'var KEEPB=2'],
  ['Peso sano según estatura al mantener', app, 'function keepCheck'],
  ['Pasar a mantenimiento al llegar a la meta', app, 'data-act="tokeep"'],
  ['Tarjeta de mantenimiento', app, 'function keepCard'],
  ['IA gratis: aviso de fotos agotadas', app, 'LIMIT_FOTO'],
  ['Tabla Gratis vs Premium', app, 'class="pwt"'],
  ['Fotos restantes junto a la cámara', app, 'fotos gratis hoy'],
  ['Servidor: 2 fotos gratis', wt, 'FREE_PHOTOS = "2"'],
  ['Servidor: contador de fotos aparte', wk, "':foto'"],
  ['Servidor de IA conectado', app, "MS_AI='https://michi-salud-ia.cardofan2.workers.dev/'"],
  ['iPhone: pantalla de inicio', app, 'apple-mobile-web-app-capable'],
  ['Android: cámara y voz visibles', man, 'android.media.action.IMAGE_CAPTURE'],
  ['Lector tolerante de la IA', app, 'function aiObj(t)'],
  ['Nutrientes con nombres en ES/EN y listas', app, 'function normMeal(o)'],
  ['Instrucción de solo JSON a la IA', app, 'Respondes ÚNICAMENTE con un objeto JSON válido'],
  ['Versión visible en Perfil', app, '<span>Versión</span> __VERSION__'],
];
const faltan = marcas.filter(([, src, m]) => !src.includes(m));
if (faltan.length) { console.error('✘ Se perdieron mejoras ya aprobadas:\n' + faltan.map(x => '  - ' + x[0]).join('\n')); process.exit(1); }
console.log('✔ Regresión: las ' + marcas.length + ' mejoras aprobadas siguen en su lugar.');

// Prueba de diseño de Michi Salud: recorre la bienvenida, las 6 pestañas y todas las ventanas
// en varios tamaños de pantalla e idiomas. Falla (y no se compila el APK) si algo se sale de la
// pantalla o si una ventana no tiene ✕ para cerrarse.
// Uso: node tests/diseno.mjs   (requiere playwright con chromium)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const APP = pathToFileURL(new URL('../www/index.html', import.meta.url).pathname).href;
const OUT = new URL('../diseno-fallas/', import.meta.url).pathname;
// 320 px ≈ teléfono pequeño o letra grande de Android; 412 = Galaxy S25; tabletas y escritorio
const SIZES = [[320, 640], [360, 760], [412, 915], [768, 1024], [1280, 800]];
const fallas = [];

// Elementos con texto, botones o imágenes que quedan cortados por el borde de la pantalla
const MEDIR = `(()=>{const W=document.documentElement.clientWidth,out=[];
  const desc=e=>(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).join('.'):'')+' "'+(e.innerText||e.value||e.alt||'').trim().slice(0,30)+'"');
  for(const e of document.querySelectorAll('body *')){
    const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) continue;
    if(r.right<=W+1&&r.left>=-1) continue;
    const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.opacity==='0') continue;
    const visible=/^(BUTTON|INPUT|SELECT|TEXTAREA|IMG|SVG|CANVAS)$/i.test(e.tagName)||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(!visible) continue;
    let p=e.parentElement,enScroll=false;
    while(p&&p!==document.body){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'){enScroll=true;break;}p=p.parentElement;}
    if(enScroll) continue; // carruseles y reglas que se desplazan a propósito
    out.push(desc(e)+' se sale '+Math.round(Math.max(r.right-W,-r.left))+' px');
  }
  return [...new Set(out)].slice(0,6);})()`;

async function revisar(pg, donde) {
  const m = await pg.evaluate(MEDIR);
  if (m.length) {
    const f = `${OUT}${fallas.length}.png`; await pg.screenshot({ path: f });
    fallas.push(`[${donde}] ${m.join(' | ')}  (captura: ${f})`);
  }
}

const btns = pg => pg.evaluate(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>({t:b.innerText.trim().replace(/\\s+/g,' '),d:b.disabled}))`);
const tocar = (pg, t) => pg.evaluate(t => { const b = [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.innerText.trim().replace(/\s+/g, ' ') === t)[0]; if (b) b.click(); }, t);
const LLENAR = `(()=>{document.querySelectorAll('input,select').forEach(x=>{if(!x.offsetParent)return;
  if(x.type==='checkbox'){if(!x.checked)x.click();return}
  if(x.tagName==='SELECT'){if(x.selectedIndex<1&&x.options.length>1){x.selectedIndex=1;x.dispatchEvent(new Event('change',{bubbles:true}))}return}
  if(x.value||/email|password|range/.test(x.type))return;
  x.value=x.type==='number'?'80':x.type==='time'?'08:00':x.type==='date'?'2026-11-10':'Pepper';
  x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}))});})()`;
const SIG = /^(Responder|Comenzar|Continuar|Siguiente|Listo|Guardar|Aceptar|Confirmar|Finalizar|Answer|Start|Continue|Next|Começar|Avançar)/i;

// Recorre la bienvenida revisando cada pantalla; devuelve el estado guardado al terminar
async function bienvenida(pg, donde) {
  let ultimo = '', igual = 0;
  for (let i = 0; i < 120; i++) {
    if (await pg.evaluate(`(()=>{try{return JSON.parse(localStorage.getItem('mt-state')||'{}').onb}catch(e){return false}})()`)) return pg.evaluate(`localStorage.getItem('mt-state')`);
    const txt = await pg.evaluate(`document.body.innerText.slice(0,120)`);
    if (txt !== ultimo) { await revisar(pg, `${donde} bienvenida paso ${i}`); igual = 0; } else igual++;
    ultimo = txt;
    await pg.evaluate(LLENAR);
    let b = await btns(pg), sig = b.filter(x => SIG.test(x.t));
    const opc = b.filter(x => x.t && !SIG.test(x.t) && !x.t.includes('▾') && !['‹', '✕'].includes(x.t) && !/cuenta|account|conta|dispositivos|devices|Health/i.test(x.t));
    if ((!sig.length || sig.at(-1).d || igual) && opc.length) { await tocar(pg, opc[Math.min(igual, opc.length - 1)].t); await pg.waitForTimeout(150); b = await btns(pg); sig = b.filter(x => SIG.test(x.t)); }
    if (sig.length) await tocar(pg, sig.at(-1).t);
    await pg.waitForTimeout(220);
    if (igual > 8) { fallas.push(`[${donde}] la bienvenida se quedó atascada en: ${txt}`); return null; }
  }
  fallas.push(`[${donde}] la bienvenida no terminó`); return null;
}

async function app(pg, donde) {
  for (const t of ['inicio', 'tratamiento', 'ayuno', 'ia', 'progreso', 'perfil']) {
    const ir = () => pg.evaluate(t => { const b = document.querySelector('nav button[data-tab=' + t + ']'); if (b) b.click(); }, t);
    await ir(); await pg.waitForTimeout(250);
    await revisar(pg, `${donde} pestaña ${t}`);
    const ms = await pg.evaluate(`[...new Set([...document.querySelectorAll('[data-m]')].map(x=>x.dataset.m))]`);
    for (const m of ms) {
      await pg.evaluate(m => { const x = document.querySelector('[data-m="' + m + '"]'); if (x) x.click(); }, m);
      await pg.waitForTimeout(200);
      if (await pg.$('.sheet')) {
        await revisar(pg, `${donde} ventana ${m}`);
        if (!await pg.$('.sheet .mx')) fallas.push(`[${donde}] la ventana "${m}" no tiene ✕ para cerrar`);
        else { await pg.click('.sheet .mx'); await pg.waitForTimeout(150); if (await pg.$('.sheet')) fallas.push(`[${donde}] la ✕ de la ventana "${m}" no la cierra`); }
      }
      await ir(); await pg.waitForTimeout(120);
    }
  }
}

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
let estado = null;
for (const [w, h] of SIZES) {
  for (const lang of w === 320 ? ['es', 'en', 'pt'] : ['es']) {
    const donde = `${w}px ${lang}`;
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    const errores = [];
    pg.on('pageerror', e => errores.push(e.message));
    await pg.goto(APP); await pg.waitForTimeout(600);
    if (lang === 'es' && w <= 412) estado = await bienvenida(pg, donde) || estado;
    if (estado) {
      const s = JSON.parse(estado); s.lang = lang;
      await pg.evaluate(s => localStorage.setItem('mt-state', s), JSON.stringify(s));
      await pg.reload(); await pg.waitForTimeout(600);
      await app(pg, donde);
    }
    if (errores.length) fallas.push(`[${donde}] errores de la app: ${errores.slice(0, 3).join(' | ')}`);
    await pg.close();
  }
}
await b.close();
if (fallas.length) { console.error(`✘ ${fallas.length} problemas de diseño:\n` + fallas.join('\n')); process.exit(1); }
console.log(`✔ Diseño correcto en ${SIZES.map(s => s[0] + 'px').join(', ')} (es/en/pt en 320 px): nada se sale de la pantalla y todas las ventanas cierran con ✕.`);

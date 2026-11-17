// Prueba del lector de respuestas de la IA (foto y texto de comidas): formatos reales que debe entender
import fs from 'node:fs'; import assert from 'node:assert/strict';
const s=fs.readFileSync(new URL('../www/index.html', import.meta.url),'utf8');
const grab=n=>{const i=s.indexOf('function '+n+'(');let d=0,j=s.indexOf('{',i);for(;j<s.length;j++){if(s[j]==='{')d++;else if(s[j]==='}'&&--d===0)break;}return s.slice(i,j+1);};
const a=s.indexOf('function aiObj('),b=s.indexOf('function mealFrom('),e=s.indexOf('\nfunction ',b+5);
const code=grab('num')+"\nfunction today(){return 'x'}function nowT(){return 'x'}\n"+s.slice(a,e);
const f=new Function(code+';return {aiObj,mealFrom};')();
const M=t=>f.mealFrom(f.aiObj(t),'Comida');
const C=[
 ['JSON limpio','{"nombre":"Filete con puré","kcal":780,"proteina_g":48,"carbohidratos_g":40,"grasas_g":45,"fibra_g":3,"azucar_g":4,"sodio_mg":900}',780,48],
 ['Con ```json','```json\n{"nombre":"Filete","kcal":780,"proteina_g":48,"carbohidratos_g":40,"grasas_g":45,"fibra_g":3}\n```',780,48],
 ['Texto antes y después','Claro, aquí está el análisis: {"nombre":"Filete","kcal":"780 kcal","proteina_g":"48 g","carbohidratos_g":40,"grasas_g":45,"fibra_g":3} Espero que te sirva.',780,48],
 ['Rangos','{"nombre":"Filete","kcal":"700-860","proteina_g":"45-51","carbohidratos_g":40,"grasas_g":45,"fibra_g":3}',780,48],
 ['Claves en inglés','{"name":"Steak","calories":780,"protein":48,"carbs":40,"fat":45,"fiber":3}',780,48],
 ['Lista de alimentos sin total','{"alimentos":[{"nombre":"Filete 180 g","kcal":450,"proteina_g":45,"grasas_g":28},{"nombre":"Puré 150 g","kcal":220,"proteina_g":3,"carbohidratos_g":30},{"nombre":"Tocineta","kcal":110,"grasas_g":9}]}',780,48],
 ['Total anidado','{"alimentos":[{"nombre":"Filete","kcal":450}],"total":{"kcal":780,"proteina_g":48,"carbohidratos_g":40,"grasas_g":45}}',780,48],
 ['Ejemplo + respuesta','Formato: {"kcal":0} Respuesta: {"nombre":"Filete","kcal":780,"proteina_g":48}',780,48],
 ['Coma decimal','{"nombre":"Filete","kcal":780,"proteina_g":"48,4","carbohidratos_g":40}',780,48],
 ['Respuesta cortada','{"nombre":"Filete con puré","kcal":780,"proteina_g":48,"carbohidratos_g":40,"grasas_g":45',780,48],
 ['Mayúsculas y tildes','{"Nombre":"Filete","Calorías":780,"Proteína":48}',780,48],
];
for(const [n,t,k,pr] of C){const m=M(t);assert.equal(m.k,k,n+' kcal '+JSON.stringify(m));assert.equal(m.p,pr,n+' prot');console.log('✔',n,'→',m.k,'kcal',m.p,'g prot ·',m.n);}
assert.throws(()=>f.aiObj('Lo siento, no puedo ver comida en esta imagen.'));console.log('✔ Sin JSON → error claro');
assert.equal(M('{"kcal":0}').k,0);console.log('✔ Sin comida → kcal 0');

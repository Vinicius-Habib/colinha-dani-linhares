import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "data", "tse-cache");
const OUT = path.join(ROOT, "data", "candidates.json");
const PHOTO_OUT = path.join(ROOT, "public", "photos");

const URLS = {
  candidates: "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip",
  MGPhotos: "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_MG_div.zip",
  BRPhotos: "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip"
};

await fs.mkdir(CACHE,{recursive:true});
await fs.mkdir(PHOTO_OUT,{recursive:true});

async function download(url,target){
  const r=await fetch(url,{headers:{"User-Agent":"Colinha-Dani/2.0"}});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  await fs.writeFile(target,Buffer.from(await r.arrayBuffer()));
}

function parseCSV(text){
  const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"' && text[i+1]==='"'){f+='"';i++}
      else if(ch==='"') q=false;
      else f+=ch;
    }else if(ch==='"') q=true;
    else if(ch===";"){row.push(f);f=""}
    else if(ch==="\n"){row.push(f);rows.push(row);row=[];f=""}
    else if(ch!=="\r")f+=ch;
  }
  if(f||row.length){row.push(f);rows.push(row)}
  if(!rows.length)return[];
  const headers=rows.shift().map(x=>x.trim().toUpperCase());
  return rows.filter(r=>r.some(x=>x.trim())).map(r=>{
    const o={}; headers.forEach((h,i)=>o[h]=(r[i]??"").trim().replace(/^"|"$/g,"")); return o;
  });
}
const digits=v=>String(v??"").replace(/\D/g,"");
function role(c){
  const x=(c.DS_CARGO||"").toUpperCase();
  return ["DEPUTADO FEDERAL","DEPUTADO ESTADUAL","SENADOR","GOVERNADOR","PRESIDENTE"].includes(x)?x:null;
}
function mapCandidate(r){
  const cargo=role(r), uf=(r.SG_UF||"").toUpperCase();
  if(!cargo || !["MG","BR"].includes(uf)) return null;
  return {
    id:r.SQ_CANDIDATO,
    number:digits(r.NR_CANDIDATO),
    role:cargo,
    uf,
    ballotName:r.NM_URNA_CANDIDATO||r.NM_CANDIDATO,
    fullName:r.NM_CANDIDATO,
    party:r.SG_PARTIDO,
    partyName:r.NM_PARTIDO,
    status:r.DS_SITUACAO_CANDIDATURA,
    photo:null
  };
}

const candZip=path.join(CACHE,"consulta_cand_2026.zip");
await download(URLS.candidates,candZip);
const zip=new AdmZip(candZip);
let all=[];
for(const e of zip.getEntries()){
  if(e.isDirectory || !/consulta_cand_2026_(MG|BR)\.csv$/i.test(path.basename(e.entryName))) continue;
  const text=iconv.decode(e.getData(),"latin1");
  all.push(...parseCSV(text).map(mapCandidate).filter(Boolean));
}
const unique=new Map();
for(const c of all) unique.set(`${c.role}|${c.uf}|${c.number}`,c);
const candidates=[...unique.values()];

async function photosFor(uf,url){
  const target=path.join(CACHE,`foto_${uf}.zip`);
  try{await download(url,target)}catch(e){console.warn(`Fotos ${uf}: ${e.message}`);return null}
  return new AdmZip(target);
}
const zips={MG:await photosFor("MG",URLS.MGPhotos),BR:await photosFor("BR",URLS.BRPhotos)};

for(const c of candidates){
  const z=zips[c.uf]; if(!z)continue;
  const id=digits(c.id);
  const e=z.getEntries().find(x=>!x.isDirectory && digits(path.basename(x.entryName)).includes(id));
  if(e){
    const ext=path.extname(e.entryName).toLowerCase()||".jpg";
    const name=`${id}${ext}`;
    await fs.writeFile(path.join(PHOTO_OUT,name),e.getData());
    c.photo=`/photos/${name}`;
  }
}
await fs.writeFile(OUT,JSON.stringify({
  generatedAt:new Date().toISOString(),
  source:"TSE — Candidatos 2026 / Portal de Dados Abertos",
  electionYear:2026,
  candidates
},null,2));

console.log(`Sincronizados ${candidates.length} registros.`);
console.log(`Base: ${OUT}`);

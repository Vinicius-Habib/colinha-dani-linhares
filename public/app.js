const defs=[
{id:"federal",role:"DEPUTADO FEDERAL",info:"federalInfo",max:4},
{id:"estadual",role:"DEPUTADO ESTADUAL",info:"estadualInfo",max:5},
{id:"senador1",role:"SENADOR",info:"senador1Info",max:3},
{id:"senador2",role:"SENADOR",info:"senador2Info",max:3},
{id:"governador",role:"GOVERNADOR",info:"governadorInfo",max:2},
{id:"presidente",role:"PRESIDENTE",info:"presidenteInfo",max:2}
];
const state=new Map();
const digits=v=>String(v||"").replace(/\D/g,"");
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function lookup(d){
 const el=document.getElementById(d.id), info=document.getElementById(d.info);
 el.value=digits(el.value).slice(0,d.max); info.innerHTML=""; el.classList.remove("ok","bad"); state.delete(d.id);
 if(el.value.length!==d.max)return;
 try{
  const r=await fetch(`/api/candidate/${encodeURIComponent(d.role)}/${el.value}`);
  if(!r.ok)throw 0;
  const c=await r.json(); state.set(d.id,c); el.classList.add("ok");
  info.innerHTML=`<div class="candidate">${c.photo?`<img src="${esc(c.photo)}" alt="">`:""}<div><strong>${esc(c.ballotName)}</strong><small>${esc(c.party||"")} · ${esc(c.status||"")}</small></div></div>`;
 }catch{
  el.classList.add("bad");info.innerHTML='<div class="msg">Número não localizado na base sincronizada.</div>';
 }
}
defs.forEach(d=>document.getElementById(d.id).addEventListener("input",()=>lookup(d)));
function url(){
 const p=new URLSearchParams();
 defs.forEach(d=>{const v=digits(document.getElementById(d.id).value);if(v)p.set(d.id,v)});
 return `${location.origin}${location.pathname}?${p}`;
}
function loadUrl(){
 const p=new URLSearchParams(location.search);
 defs.forEach(d=>{const v=p.get(d.id);if(v){document.getElementById(d.id).value=digits(v).slice(0,d.max);lookup(d)}});
}
document.getElementById("form").addEventListener("submit",e=>{
 e.preventDefault();const rows=document.getElementById("rows");rows.innerHTML="";
 defs.forEach(d=>{const v=digits(document.getElementById(d.id).value);if(!v)return;const c=state.get(d.id);rows.insertAdjacentHTML("beforeend",`<div class="row"><span class="role">${d.role}</span><span class="name">${esc(c?.ballotName||"Não localizado")}</span><span class="num">${esc(v)}</span></div>`)});
 document.getElementById("preview").classList.remove("hidden");history.replaceState(null,"",url());document.getElementById("preview").scrollIntoView({behavior:"smooth"});
});
document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText(url());document.getElementById("copy").textContent="LINK COPIADO";setTimeout(()=>document.getElementById("copy").textContent="COPIAR LINK",1600)};
document.getElementById("share").onclick=async()=>{if(navigator.share)await navigator.share({title:"Minha Colinha — Eleições 2026",url:url()});else await navigator.clipboard.writeText(url())};
document.getElementById("edit").onclick=()=>document.getElementById("preview").classList.add("hidden");
(async()=>{try{const h=await fetch("/api/health").then(r=>r.json());document.getElementById("status").textContent=h.generatedAt?`Dados sincronizados: ${new Date(h.generatedAt).toLocaleString("pt-BR")}`:"Base inicial — sincronize com o TSE";}catch{document.getElementById("status").textContent="Servidor indisponível"}loadUrl();lookup(defs[0])})();

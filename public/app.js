const defs=[
{id:"federal",role:"DEPUTADO FEDERAL",info:"federalInfo",max:4},
{id:"estadual",role:"DEPUTADO ESTADUAL",info:"estadualInfo",max:5},
{id:"senador1",role:"SENADOR",info:"senador1Info",max:3},
{id:"senador2",role:"SENADOR",info:"senador2Info",max:3},
{id:"governador",role:"GOVERNADOR",info:"governadorInfo",max:2},
{id:"presidente",role:"PRESIDENTE",info:"presidenteInfo",max:2}
];
const STORAGE_KEY="colinha-dani-linhares-v9";
const state=new Map(); let currentSearchId=null; let searchTimer=null; let lastImage=null;
const digits=v=>String(v||"").replace(/\D/g,"");
const normalize=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const $=id=>document.getElementById(id);
function showAlert(message,focusId){ $("alertMessage").textContent=message; $("alertModal").classList.remove("hidden"); if(focusId) $("closeAlert").dataset.focus=focusId; }
$("closeAlert").onclick=()=>{const id=$("closeAlert").dataset.focus;$("alertModal").classList.add("hidden");if(id)$(id).focus()};

async function lookup(d){
 const el=$(d.id), info=$(d.info); el.value=digits(el.value).slice(0,d.max); info.innerHTML=""; el.classList.remove("ok","bad"); state.delete(d.id);
 if(el.value.length!==d.max){saveDraft();return}
 if((d.id==="senador1"||d.id==="senador2")){
  const otherId=d.id==="senador1"?"senador2":"senador1", other=digits($(otherId).value);
  if(other&&other===el.value){el.classList.add("bad");info.innerHTML='<div class="msg">Escolha um número diferente do outro senador.</div>';saveDraft();return}
 }
 try{
  const r=await fetch(`/api/candidate/${encodeURIComponent(d.role)}/${el.value}`); if(!r.ok)throw 0; const c=await r.json();
  state.set(d.id,c);el.classList.add("ok");
  info.innerHTML=`<div class="candidate">${c.photo?`<img src="${esc(c.photo)}" alt="">`:""}<div><strong>${esc(c.ballotName)}</strong><small>${esc(c.party||"")} · ${esc(c.status||"")}</small></div></div>`;
 }catch{el.classList.add("bad");info.innerHTML='<div class="msg">Número não localizado na base sincronizada.</div>';}
 saveDraft();
}

defs.forEach(d=>$(d.id).addEventListener("input",()=>{
 lookup(d); if(d.id==="senador1"||d.id==="senador2"){
  const otherId=d.id==="senador1"?"senador2":"senador1", otherDef=defs.find(x=>x.id===otherId);
  if(otherDef&&digits($(otherId).value)===digits($(d.id).value)&&digits($(d.id).value).length===d.max)lookup(otherDef);
 }
}));
$("federal").addEventListener("keydown",e=>e.preventDefault());$("federal").addEventListener("paste",e=>e.preventDefault());$("federal").addEventListener("drop",e=>e.preventDefault());

function saveDraft(){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify({federal:"1023",estadual:$('estadual').value,senador1:$('senador1').value,senador2:$('senador2').value,governador:$('governador').value,presidente:$('presidente').value,savedAt:new Date().toISOString()}));$("saveNote").textContent="✓ Colinha salva automaticamente neste dispositivo.";}catch{}
}
function restoreDraft(){
 try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;const d=JSON.parse(raw);let any=false;defs.forEach(x=>{if(x.id!=="federal"&&d[x.id]){$(x.id).value=digits(d[x.id]).slice(0,x.max);any=true;}});if(any){$("saveNote").textContent="✓ Última colinha recuperada deste dispositivo.";defs.filter(x=>x.id!=="federal").forEach(x=>{if($(x.id).value)lookup(x)});}return any;}catch{return false}}
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveDraft()});

function url(){const p=new URLSearchParams();p.set("federal","1023");defs.forEach(d=>{if(d.id!=="federal"){const v=digits($(d.id).value);if(v)p.set(d.id,v)}});return `${location.origin}${location.pathname}?${p}`}
function loadUrl(){const p=new URLSearchParams(location.search);let found=false;defs.forEach(d=>{if(d.id==="federal"){$("federal").value="1023";return}const v=p.get(d.id);if(v){$(d.id).value=digits(v).slice(0,d.max);lookup(d);found=true}});return found}
function allCandidatesReady(){return defs.every(d=>digits($(d.id).value).length===d.max&&state.has(d.id))}

function renderPreview(){
 if(!allCandidatesReady()){const first=defs.find(d=>!state.has(d.id)||digits($(d.id).value).length!==d.max);showAlert("Preencha todos os campos com números válidos antes de conferir sua colinha.",first?.id);return false;}
 const rows=$("rows");rows.innerHTML="";
 defs.forEach(d=>{const v=digits($(d.id).value),c=state.get(d.id);rows.insertAdjacentHTML("beforeend",`<article class="review-row"><div class="review-role">${esc(d.role)}</div><div class="review-main">${c.photo?`<img src="${esc(c.photo)}" alt="">`:""}<div><strong>${esc(c.ballotName)}</strong><span>${esc(c.party||"")}</span></div></div><div class="review-number">${esc(v)}</div></article>`)});
 buildPrintSheet();$("preview").classList.remove("hidden");$("step2").classList.add("active");history.replaceState(null,"",url());saveDraft();$("preview").scrollIntoView({behavior:"smooth",block:"start"});return true;
}
function buildPrintSheet(){const out=$("printRows");out.innerHTML="";defs.forEach(d=>{const c=state.get(d.id),v=digits($(d.id).value);out.insertAdjacentHTML("beforeend",`<div class="print-row"><div><b>${esc(d.role)}</b><strong>${esc(c.ballotName)}</strong><span>${esc(c.party||"")}</span></div><em>${esc(v)}</em></div>`)});}

function roundedRect(ctx,x,y,w,h,r,fill,stroke,strokeWidth=0){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=strokeWidth;ctx.stroke()}}
function fitText(ctx,text,maxWidth,fontSize,fontFamily="Inter"){let size=fontSize;while(size>18){ctx.font=`700 ${size}px ${fontFamily}`;if(ctx.measureText(text).width<=maxWidth)return size;size--}return size}
function loadImage(src){return new Promise(resolve=>{if(!src){resolve(null);return}const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src})}
function drawCover(ctx,img,x,y,w,h,r=28){if(!img){roundedRect(ctx,x,y,w,h,r,"#eef2f7");return}ctx.save();roundedRect(ctx,x,y,w,h,r);ctx.clip();const scale=Math.max(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore()}
async function generateBallotImage(){
 if(!allCandidatesReady())return null;await document.fonts?.ready;const W=1080,H=1920,canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);roundedRect(ctx,10,10,W-20,H-20,48,null,"#B7FF00",18);ctx.fillStyle="#0A2850";ctx.font='800 46px "Inter",Arial,sans-serif';ctx.fillText("MINHA COLINHA",52,92);ctx.fillStyle="#123DFF";ctx.font='700 35px "Inter",Arial,sans-serif';ctx.textAlign="right";ctx.fillText("ELEIÇÕES 2026",1028,92);ctx.textAlign="left";
 const candidates=await Promise.all(defs.map(async d=>({def:d,number:digits($(d.id).value),candidate:state.get(d.id),image:await loadImage(state.get(d.id)?.photo)})));let y=250;const rowH=232,photoX=52,photoW=138,photoH=168,textX=218,numberRight=1008;
 for(const item of candidates){const {def,number,candidate,image}=item;drawCover(ctx,image,photoX,y,photoW,photoH,28);ctx.fillStyle="#7A8BA3";ctx.font='700 24px "Inter",Arial,sans-serif';ctx.fillText(def.role,textX,y+35);const name=candidate.ballotName||"Candidato",nameSize=fitText(ctx,name,430,36);ctx.fillStyle="#09264C";ctx.font=`800 ${nameSize}px "Inter",Arial,sans-serif`;ctx.fillText(name,textX,y+83);ctx.fillStyle="#7A8BA3";ctx.font='500 29px "Inter",Arial,sans-serif';ctx.fillText(candidate.party||"",textX,y+124);const box=66,gap=11,total=number.length*box+(number.length-1)*gap;let bx=numberRight-total;for(const digit of number){roundedRect(ctx,bx,y+35,box,66,16,"#F3F6FA","#DCE4ED",2);ctx.fillStyle="#09264C";ctx.textAlign="center";ctx.font='800 40px "Inter",Arial,sans-serif';ctx.fillText(digit,bx+box/2,y+80);bx+=box+gap}ctx.textAlign="left";y+=rowH}
 ctx.strokeStyle="#DDE4EC";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(52,1605);ctx.lineTo(1028,1605);ctx.stroke();ctx.fillStyle="#09264C";ctx.font='800 23px "Inter",Arial,sans-serif';ctx.fillText("PROPAGANDA ELEITORAL | DANIELA LINHARES",52,1670);ctx.font='700 23px "Inter",Arial,sans-serif';ctx.fillText("CNPJ: 68.403.629/0001-16",52,1712);ctx.fillStyle="#7A8BA3";ctx.font='500 19px "Inter",Arial,sans-serif';ctx.fillText("Confira sempre o número do candidato na urna.",52,1765);ctx.fillStyle="#B7FF00";ctx.beginPath();ctx.arc(965,1740,52,0,Math.PI*2);ctx.fill();ctx.fillStyle="#09264C";ctx.font='900 42px Arial';ctx.textAlign="center";ctx.fillText("✓",965,1754);ctx.textAlign="left";
 return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob?{blob,imageUrl:URL.createObjectURL(blob),canvas}:null),"image/png"));
}
async function showGeneratedImage(){const result=await generateBallotImage();if(!result)return null;if(lastImage?.imageUrl)URL.revokeObjectURL(lastImage.imageUrl);lastImage=result;$("generatedImage").src=result.imageUrl;$("imageResult").classList.remove("hidden");$("step3").classList.add("active");$("imageResult").scrollIntoView({behavior:"smooth",block:"center"});return result}
async function shareImage(){if(!renderPreview())return;const result=await showGeneratedImage();if(!result)return;const file=new File([result.blob],"minha-colinha-2026.png",{type:"image/png"});try{if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({title:"Minha Colinha — Eleições 2026",text:"Minha colinha de votação.",files:[file]})}else if(navigator.share){await navigator.share({title:"Minha Colinha — Eleições 2026",url:url()})}else{showAlert("A função de compartilhamento do navegador não está disponível. Use BAIXAR PNG ou COPIAR LINK.")}}catch(e){}}
async function downloadImage(){if(!renderPreview())return;const result=await showGeneratedImage();if(!result)return;const a=document.createElement("a");a.href=result.imageUrl;a.download="minha-colinha-2026.png";a.click()}
function printPdf(){if(!renderPreview())return;window.print()}

$("form").addEventListener("submit",e=>{e.preventDefault();renderPreview()});$("confirmGenerate").onclick=showGeneratedImage;$("share").onclick=shareImage;$("downloadImage").onclick=downloadImage;$("printPdf").onclick=printPdf;
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(url());$("copy").textContent="LINK COPIADO";setTimeout(()=>$("copy").textContent="COPIAR LINK",1600)}catch{showAlert("Não foi possível copiar automaticamente. Você pode copiar o endereço da página manualmente.")}};
$("edit").onclick=()=>{$("preview").classList.add("hidden");$("imageResult").classList.add("hidden");window.scrollTo({top:0,behavior:"smooth"})};

async function searchCandidates(){if(!currentSearchId)return;const d=defs.find(x=>x.id===currentSearchId),q=$("searchInput").value.trim(),box=$("searchResults");if(q.length<2){box.innerHTML='<span class="empty-search">Digite pelo menos 2 caracteres.</span>';return}box.innerHTML='<span class="empty-search">Buscando…</span>';clearTimeout(searchTimer);searchTimer=setTimeout(async()=>{try{const r=await fetch(`/api/candidates/search?role=${encodeURIComponent(d.role)}&q=${encodeURIComponent(q)}`);const list=await r.json();if(!list.length){box.innerHTML='<span class="empty-search">Nenhum candidato encontrado.</span>';return}box.innerHTML=list.map(c=>`<button class="search-result" data-id="${esc(c.id)}" data-number="${esc(c.number)}"><div>${c.photo?`<img src="${esc(c.photo)}" alt="">`:''}<span><strong>${esc(c.ballotName)}</strong><small>${esc(c.party||"")} · Nº ${esc(c.number)}</small></span></div><b>SELECIONAR</b></button>`).join('');box.querySelectorAll('.search-result').forEach(btn=>btn.onclick=()=>selectSearchResult(btn.dataset.number));}catch{box.innerHTML='<span class="empty-search">Não foi possível consultar a base agora.</span>'}},180)}
function selectSearchResult(number){const d=defs.find(x=>x.id===currentSearchId);if(!d)return;$(d.id).value=digits(number).slice(0,d.max);$("searchModal").classList.add("hidden");lookup(d);$(d.id).focus()}
document.querySelectorAll("[data-search]").forEach(btn=>btn.onclick=()=>{currentSearchId=btn.dataset.search;const d=defs.find(x=>x.id===currentSearchId);$("searchRole").textContent=`${d.role}. Pesquise pelo nome, partido ou número.`;$("searchTitle").textContent=`Encontrar ${d.role.toLowerCase()}`;$("searchInput").value="";$("searchResults").innerHTML='<span class="empty-search">Digite pelo menos 2 caracteres.</span>';$('searchModal').classList.remove('hidden');setTimeout(()=>$('searchInput').focus(),50)});
$("searchInput").addEventListener("input",searchCandidates);$("closeSearch").onclick=()=>$("searchModal").classList.add("hidden");$("searchModal").addEventListener("click",e=>{if(e.target.id==="searchModal")$("searchModal").classList.add("hidden")});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("searchModal").classList.add("hidden");$("alertModal").classList.add("hidden")}});

const hasUrl=loadUrl();if(!hasUrl)restoreDraft();fetch('/api/health').then(r=>r.json()).then(d=>{$("status").textContent=d.generatedAt?`Dados oficiais do TSE · ${new Date(d.generatedAt).toLocaleString('pt-BR')}`:"Dados do TSE"}).catch(()=>$("status").textContent="Dados do TSE");

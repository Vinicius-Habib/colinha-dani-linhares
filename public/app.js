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
const $=id=>document.getElementById(id);

async function lookup(d){
 const el=$(d.id), info=$(d.info);
 el.value=digits(el.value).slice(0,d.max);
 info.innerHTML=""; el.classList.remove("ok","bad"); state.delete(d.id);
 if(el.value.length!==d.max)return;
 try{
  const r=await fetch(`/api/candidate/${encodeURIComponent(d.role)}/${el.value}`);
  if(!r.ok)throw 0;
  const c=await r.json();
  state.set(d.id,c); el.classList.add("ok");
  info.innerHTML=`<div class="candidate">${c.photo?`<img src="${esc(c.photo)}" alt="">`:""}<div><strong>${esc(c.ballotName)}</strong><small>${esc(c.party||"")} · ${esc(c.status||"")}</small></div></div>`;
 }catch{
  el.classList.add("bad");
  info.innerHTML='<div class="msg">Número não localizado na base sincronizada.</div>';
 }
}

defs.forEach(d=>{
 $(d.id).addEventListener("input",()=>lookup(d));
});

// Deputada Federal: sempre fixa em 1023.
$("federal").addEventListener("keydown",e=>e.preventDefault());
$("federal").addEventListener("paste",e=>e.preventDefault());
$("federal").addEventListener("drop",e=>e.preventDefault());

function url(){
 const p=new URLSearchParams();
 p.set("federal","1023");
 defs.forEach(d=>{
  if(d.id==="federal")return;
  const v=digits($(d.id).value);
  if(v)p.set(d.id,v);
 });
 return `${location.origin}${location.pathname}?${p}`;
}

function loadUrl(){
 const p=new URLSearchParams(location.search);
 defs.forEach(d=>{
  if(d.id==="federal"){
   $("federal").value="1023";
   return;
  }
  const v=p.get(d.id);
  if(v){
   $(d.id).value=digits(v).slice(0,d.max);
   lookup(d);
  }
 });
}

function allCandidatesReady(){
 return defs.every(d=>{
  const v=digits($(d.id).value);
  return v.length===d.max && state.has(d.id);
 });
}

function renderPreview(){
 if(!allCandidatesReady()){
  alert("Preencha todos os campos com números válidos antes de gerar e compartilhar a colinha.");
  const first=defs.find(d=>!state.has(d.id) || digits($(d.id).value).length!==d.max);
  if(first)$(first.id).focus();
  return false;
 }
 const rows=$("rows");
 rows.innerHTML="";
 defs.forEach(d=>{
  const v=digits($(d.id).value), c=state.get(d.id);
  rows.insertAdjacentHTML("beforeend",`
   <div class="row">
    <span class="role">${d.role}</span>
    <span class="name">${esc(c.ballotName)}</span>
    <span class="num">${esc(v)}</span>
   </div>`);
 });
 $("preview").classList.remove("hidden");
 history.replaceState(null,"",url());
 return true;
}

function roundedRect(ctx,x,y,w,h,r,fill,stroke,strokeWidth=0){
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);
 ctx.arcTo(x,y,x+w,y,r);
 ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=strokeWidth;ctx.stroke()}
}

function fitText(ctx,text,maxWidth,fontSize,fontFamily="Inter"){
 let size=fontSize;
 while(size>18){
  ctx.font=`700 ${size}px ${fontFamily}`;
  if(ctx.measureText(text).width<=maxWidth)return size;
  size--;
 }
 return size;
}

function loadImage(src){
 return new Promise(resolve=>{
  if(!src){resolve(null);return}
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>resolve(null);
  img.src=src;
 });
}

function drawCover(ctx,img,x,y,w,h,r=28){
 if(!img){
  roundedRect(ctx,x,y,w,h,r,"#eef2f7");
  return;
 }
 ctx.save();
 roundedRect(ctx,x,y,w,h,r);
 ctx.clip();
 const scale=Math.max(w/img.width,h/img.height);
 const dw=img.width*scale, dh=img.height*scale;
 ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
 ctx.restore();
}

async function generateBallotImage(){
 if(!allCandidatesReady())return null;

 await document.fonts?.ready;
 const W=1080,H=1920;
 const canvas=document.createElement("canvas");
 canvas.width=W; canvas.height=H;
 const ctx=canvas.getContext("2d");
 ctx.imageSmoothingEnabled=true;
 ctx.imageSmoothingQuality="high";

 // Fundo e moldura inspirados na referência enviada.
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
 roundedRect(ctx,10,10,W-20,H-20,48,null,"#B7FF00",18);

 // Cabeçalho — sem logo da Dani.
 ctx.fillStyle="#0A2850";
 ctx.font='800 46px "Inter", Arial, sans-serif';
 ctx.fillText("MINHA COLINHA",52,92);
 ctx.fillStyle="#123DFF";
 ctx.font='700 35px "Inter", Arial, sans-serif';
 ctx.textAlign="right";
 ctx.fillText("ELEIÇÕES 2026",1028,92);
 ctx.textAlign="left";

 const candidates=await Promise.all(defs.map(async d=>({
  def:d,
  number:digits($(d.id).value),
  candidate:state.get(d.id),
  image:await loadImage(state.get(d.id)?.photo)
 })));

 let y=250;
 const rowH=232;
 const photoX=52,photoW=138,photoH=168;
 const textX=218;
 const numberRight=1008;

 for(const item of candidates){
  const {def,number,candidate,image}=item;
  drawCover(ctx,image,photoX,y,photoW,photoH,28);

  ctx.fillStyle="#7A8BA3";
  ctx.font='700 24px "Inter", Arial, sans-serif';
  ctx.letterSpacing="1px";
  ctx.fillText(def.role,y===250?"DEPUTADA FEDERAL":def.role,textX,y+35);

  const name=candidate.ballotName || "Candidato";
  const nameSize=fitText(ctx,name,430,36);
  ctx.fillStyle="#09264C";
  ctx.font=`800 ${nameSize}px "Inter", Arial, sans-serif`;
  ctx.fillText(name,textX,y+83);

  ctx.fillStyle="#7A8BA3";
  ctx.font='500 29px "Inter", Arial, sans-serif';
  ctx.fillText(candidate.party || "",textX,y+124);

  // Número em caixas individuais.
  const box=66,gap=11;
  const total=number.length*box+(number.length-1)*gap;
  let bx=numberRight-total;
  for(const digit of number){
    roundedRect(ctx,bx,y+35,box,66,16,"#F3F6FA","#DCE4ED",2);
    ctx.fillStyle="#09264C";
    ctx.textAlign="center";
    ctx.font='800 40px "Inter", Arial, sans-serif';
    ctx.fillText(digit,bx+box/2,y+80);
    bx+=box+gap;
  }
  ctx.textAlign="left";
  y+=rowH;
 }

 // Linha de separação.
 ctx.strokeStyle="#DDE4EC";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(52,1605);ctx.lineTo(1028,1605);ctx.stroke();

 // Rodapé legal solicitado.
 ctx.fillStyle="#09264C";
 ctx.font='800 23px "Inter", Arial, sans-serif';
 ctx.fillText("PROPAGANDA ELEITORAL | DANIELA LINHARES",52,1670);
 ctx.font='700 23px "Inter", Arial, sans-serif';
 ctx.fillText("CNPJ: 68.403.629/0001-16",52,1712);

 ctx.fillStyle="#7A8BA3";
 ctx.font='500 19px "Inter", Arial, sans-serif';
 ctx.fillText("Confira sempre o número do candidato na urna.",52,1765);

 ctx.fillStyle="#B7FF00";
 ctx.beginPath();ctx.arc(965,1740,52,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#09264C";ctx.font='900 42px Arial';ctx.textAlign="center";ctx.fillText("✓",965,1754);ctx.textAlign="left";

 return new Promise(resolve=>canvas.toBlob(blob=>{
  if(!blob){resolve(null);return}
  const imageUrl=URL.createObjectURL(blob);
  resolve({blob,imageUrl,canvas});
 },"image/png"));
}

async function showGeneratedImage(){
 const result=await generateBallotImage();
 if(!result)return null;
 $("generatedImage").src=result.imageUrl;
 $("imageResult").classList.remove("hidden");
 $("imageResult").scrollIntoView({behavior:"smooth",block:"center"});
 return result;
}

async function shareImage(){
 if(!renderPreview())return;
 const result=await showGeneratedImage();
 if(!result)return;
 const file=new File([result.blob],"minha-colinha-2026.png",{type:"image/png"});
 try{
  if(navigator.canShare?.({files:[file]}) && navigator.share){
   await navigator.share({
    title:"Minha Colinha — Eleições 2026",
    text:"Minha colinha de votação.",
    files:[file]
   });
  }else if(navigator.share){
   await navigator.share({title:"Minha Colinha — Eleições 2026",url:url()});
  }else{
   $("share").textContent="IMAGEM GERADA";
  }
 }catch(e){
  // Cancelamento do compartilhamento não é erro para o usuário.
 }
}

$("form").addEventListener("submit",e=>{
 e.preventDefault();
 renderPreview();
});

$("share").onclick=shareImage;

$("downloadImage").onclick=async()=>{
 if(!allCandidatesReady()){
  renderPreview();
  return;
 }
 const result=await showGeneratedImage();
 if(!result)return;
 const a=document.createElement("a");
 a.href=result.imageUrl;
 a.download="minha-colinha-2026.png";
 a.click();
};

$("copy").onclick=async()=>{
 await navigator.clipboard.writeText(url());
 $("copy").textContent="LINK COPIADO";
 setTimeout(()=>$("copy").textContent="COPIAR LINK",1600);
};

$("edit").onclick=()=>{
 $("preview").classList.add("hidden");
 $("imageResult").classList.add("hidden");
 window.scrollTo({top:0,behavior:"smooth"});
};

(async()=>{
 try{
  const h=await fetch("/api/health").then(r=>r.json());
  $("status").textContent=h.generatedAt?`Dados sincronizados: ${new Date(h.generatedAt).toLocaleString("pt-BR")}`:"Base inicial — sincronize com o TSE";
 }catch{
  $("status").textContent="Servidor indisponível";
 }
 loadUrl();
 lookup(defs[0]);
})();

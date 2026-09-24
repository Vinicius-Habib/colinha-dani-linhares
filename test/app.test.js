import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const root=process.cwd();
test("1023 está configurado para a Deputada Federal",async()=>{
 const d=JSON.parse(await fs.readFile(path.join(root,"data/candidates.json"),"utf8"));
 const c=d.candidates.find(x=>x.role==="DEPUTADO FEDERAL"&&x.number==="1023");
 assert.ok(c); assert.equal(c.uf,"MG");
});
test("senadores começam sem valor",async()=>{
 const h=await fs.readFile(path.join(root,"public/index.html"),"utf8");
 assert.doesNotMatch(h,/id="senador1"[^>]*value="/);
 assert.doesNotMatch(h,/id="senador2"[^>]*value="/);
});
test("catch-all usa sintaxe compatível com Express 5",async()=>{
 const s=await fs.readFile(path.join(root,"server.js"),"utf8");
 assert.match(s,/app\.get\("\/\{\*splat\}"/);
});

test("campo federal é somente leitura e fixo em 1023", async()=>{
 const h=await fs.readFile(path.join(root,"public/index.html"),"utf8");
 assert.match(h,/id="federal"[^>]*value="1023"[^>]*readonly/);
 const js=await fs.readFile(path.join(root,"public/app.js"),"utf8");
 assert.match(js,/p\.set\("federal","1023"\)/);
});

test("compartilhar usa imagem PNG e tamanho alvo 1080x1920", async()=>{
 const js=await fs.readFile(path.join(root,"public/app.js"),"utf8");
 assert.match(js,/canvas\.width=W; canvas\.height=H/);
 assert.match(js,/const W=1080,H=1920/);
 assert.match(js,/canvas\.toBlob/);
 assert.match(js,/minha-colinha-2026\.png/);
 assert.match(js,/navigator\.canShare/);
});
test("rodapé usa o texto eleitoral e CNPJ fornecidos", async()=>{
 const js=await fs.readFile(path.join(root,"public/app.js"),"utf8");
 assert.match(js,/PROPAGANDA ELEITORAL \| DANIELA LINHARES/);
 assert.match(js,/68\.403\.629\/0001-16/);
});


test("senadores não podem usar o mesmo número", async()=>{
 const js=await fs.readFile(path.join(root,"public/app.js"),"utf8");
 assert.match(js,/Escolha um número diferente do outro senador/);
 assert.match(js,/otherId=d\.id==="senador1" \? "senador2" : "senador1"/);
});

test("favicon usa arquivo quadrado sem achatamento", async()=>{
 const h=await fs.readFile(path.join(root,"public/index.html"),"utf8");
 assert.match(h,/assets\/1023-favicon\.png/);
 const stat=await fs.stat(path.join(root,"public/assets/1023-favicon.png"));
 assert.ok(stat.size>1000);
});

test("cabeçalho usa azul escuro", async()=>{
 const css=await fs.readFile(path.join(root,"public/styles.css"),"utf8");
 assert.match(css,/\.topbar\{min-height:104px;background:#063777/);
});

test("preview do WhatsApp usa imagem externa ao layout do site", async()=>{
 const h=await fs.readFile(path.join(root,"public/index.html"),"utf8");
 assert.match(h,/property="og:image" content="https:\/\/colinha-dani-linhares\.onrender\.com\/assets\/whatsapp-preview\.jpg\?v=8"/);
 assert.match(h,/property="og:image:width" content="1200"/);
 assert.match(h,/property="og:image:height" content="630"/);
 const stat=await fs.stat(path.join(root,"public/assets/whatsapp-preview.jpg"));
 assert.ok(stat.size>10000);
});

test("hero usa o novo texto da colinha de votação", async()=>{
 const h=await fs.readFile(path.join(root,"public/index.html"),"utf8");
 assert.match(h,/COLINHA DE VOTAÇÃO/);
 assert.match(h,/PREENCHA COM O NÚMERO DOS SEUS CANDIDATOS/);
 assert.doesNotMatch(h,/CRIE SUA FOTO DE APOIO/);
 assert.doesNotMatch(h,/ESCOLHA SUA COLINHA/);
});

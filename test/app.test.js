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

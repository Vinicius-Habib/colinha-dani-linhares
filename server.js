import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data", "candidates.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function load() {
  try { return JSON.parse(await fs.readFile(DATA, "utf8")); }
  catch { return {generatedAt:null,source:"TSE",candidates:[]}; }
}
const clean = v => String(v ?? "").replace(/\D/g, "");
const roles = new Set(["DEPUTADO FEDERAL","DEPUTADO ESTADUAL","SENADOR","GOVERNADOR","PRESIDENTE"]);

app.get("/api/health", async (_req,res) => {
  const d=await load();
  res.json({ok:true,source:d.source,generatedAt:d.generatedAt,count:d.candidates.length});
});

app.get("/api/candidate/:role/:number", async (req,res) => {
  const role=decodeURIComponent(req.params.role).toUpperCase();
  const number=clean(req.params.number);
  if(!roles.has(role)) return res.status(400).json({error:"Cargo inválido"});
  const d=await load();
  const c=d.candidates.find(x=>x.role===role && x.number===number);
  if(!c) return res.status(404).json({error:"Candidatura não encontrada na base sincronizada."});
  res.json(c);
});

// Express 5: sintaxe catch-all compatível com path-to-regexp atual.
app.get("/{*splat}", (_req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,()=>console.log(`http://localhost:${PORT}`));

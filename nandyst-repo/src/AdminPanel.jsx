import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";

const C = { navy:"#1B2E4B", orange:"#E07A20", cream:"#EDE8C8", white:"#FFFFFF", gray:"#F4F6F8", muted:"#8A97A8", red:"#E53E3E", green:"#2F855A" };
const fmt = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const STATUS_COR = {
  aguardando_pagamento: { bg:"#FEF3C7", text:"#92400E" },
  pago:                 { bg:"#D1FAE5", text:"#065F46" },
  em_producao:          { bg:"#DBEAFE", text:"#1E40AF" },
  enviado:              { bg:"#EDE9FE", text:"#5B21B6" },
  entregue:             { bg:"#D1FAE5", text:"#065F46" },
  cancelado:            { bg:"#FEE2E2", text:"#991B1B" },
};

function Badge({ s }) {
  const cor = STATUS_COR[s] || { bg:"#eee", text:"#333" };
  return <span style={{ background:cor.bg, color:cor.text, fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s?.replace(/_/g," ")}</span>;
}

function Sidebar({ aba, setAba, onLogout }) {
  const itens = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"pedidos",   icon:"📦", label:"Pedidos"   },
    { id:"produtos",  icon:"🖼️",  label:"Produtos"  },
    { id:"clientes",  icon:"👥", label:"Clientes"  },
  ];
  return (
    <div style={{ width:220, background:C.navy, minHeight:"100vh", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:"28px 20px 20px", borderBottom:`1px solid rgba(255,255,255,.1)` }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:C.cream }}>NANDY</span>
        <span style={{ fontFamily:"'Caveat',cursive", fontSize:20, color:C.orange }}> Govi</span>
        <p style={{ fontSize:10, color:`${C.cream}66`, marginTop:4, letterSpacing:"0.1em" }}>PAINEL ADMIN</p>
      </div>
      <nav style={{ flex:1, padding:"16px 0" }}>
        {itens.map(i => (
          <button key={i.id} onClick={() => setAba(i.id)}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 20px", background:aba===i.id?`rgba(255,255,255,.1)`:"none", border:"none", color:aba===i.id?C.cream:`${C.cream}88`, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:aba===i.id?600:400, textAlign:"left" }}>
            <span>{i.icon}</span>{i.label}
          </button>
        ))}
      </nav>
      <button onClick={onLogout}
        style={{ margin:"0 16px 20px", background:"none", border:`1px solid rgba(255,255,255,.2)`, color:`${C.cream}88`, padding:"10px", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
        Sair
      </button>
    </div>
  );
}

/* ── DASHBOARD ───────────────────────────────────────────────── */
function Dashboard() {
  const [stats, setStats] = useState({ pedidos:0, receita:0, clientes:0, produtos:0 });

  useEffect(() => {
    async function load() {
      const [{ count: pedidos }, { count: clientes }, { count: produtos }, { data: receita }] = await Promise.all([
        supabase.from("pedidos").select("*", { count:"exact", head:true }),
        supabase.from("usuarios").select("*", { count:"exact", head:true }).eq("role","cliente"),
        supabase.from("produtos").select("*", { count:"exact", head:true }).eq("ativo",true),
        supabase.from("pedidos").select("total").eq("status_pagamento","aprovado"),
      ]);
      const total = (receita||[]).reduce((s,p) => s + Number(p.total), 0);
      setStats({ pedidos: pedidos||0, clientes: clientes||0, produtos: produtos||0, receita: total });
    }
    load();
  }, []);

  const cards = [
    { icon:"📦", label:"Pedidos",  valor: stats.pedidos,           fmt: v => v },
    { icon:"💰", label:"Receita",  valor: stats.receita,           fmt: v => fmt(v) },
    { icon:"👥", label:"Clientes", valor: stats.clientes,          fmt: v => v },
    { icon:"🖼️",  label:"Produtos", valor: stats.produtos,          fmt: v => v },
  ];

  return (
    <div>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:C.navy, marginBottom:24 }}>Dashboard</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:C.white, padding:24, border:`1px solid #E2E8F0` }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700, color:C.navy }}>{c.fmt(c.valor)}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PEDIDOS ─────────────────────────────────────────────────── */
function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [load,    setLoad]    = useState(true);

  useEffect(() => {
    supabase.from("pedidos").select("*, usuarios(nome,email)").order("created_at",{ascending:false})
      .then(({ data }) => { setPedidos(data||[]); setLoad(false); });
  }, []);

  if (load) return <p style={{ color:C.muted }}>Carregando...</p>;

  return (
    <div>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:C.navy, marginBottom:24 }}>Pedidos</h2>
      <div style={{ background:C.white, border:`1px solid #E2E8F0`, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid #E2E8F0` }}>
              {["Número","Cliente","Total","Status","Data"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map(p => (
              <tr key={p.id} style={{ borderBottom:`1px solid #F1F5F9` }}>
                <td style={{ padding:"12px 16px", fontWeight:600, color:C.navy }}>{p.numero}</td>
                <td style={{ padding:"12px 16px", color:C.muted }}>{p.usuarios?.nome || "—"}</td>
                <td style={{ padding:"12px 16px", fontWeight:600 }}>{fmt(p.total)}</td>
                <td style={{ padding:"12px 16px" }}><Badge s={p.status}/></td>
                <td style={{ padding:"12px 16px", color:C.muted }}>{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {!pedidos.length && (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", color:C.muted }}>Nenhum pedido ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── PRODUTOS ────────────────────────────────────────────────── */
function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [form,     setForm]     = useState({ titulo:"", descricao:"", preco_base:"", imagem_url:"", ativo:true, destaque:false });
  const [editId,   setEditId]   = useState(null);
  const [load,     setLoad]     = useState(true);
  const [saving,   setSaving]   = useState(false);

  async function carregar() {
    const { data } = await supabase.from("produtos").select("*").order("created_at",{ascending:false});
    setProdutos(data||[]); setLoad(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!form.titulo || !form.preco_base) return;
    setSaving(true);
    const payload = { ...form, preco_base: Number(form.preco_base) };
    if (editId) {
      await supabase.from("produtos").update(payload).eq("id", editId);
    } else {
      await supabase.from("produtos").insert(payload);
    }
    setForm({ titulo:"", descricao:"", preco_base:"", imagem_url:"", ativo:true, destaque:false });
    setEditId(null); setSaving(false); carregar();
  }

  async function toggleAtivo(id, ativo) {
    await supabase.from("produtos").update({ ativo: !ativo }).eq("id", id);
    carregar();
  }

  function editar(p) {
    setForm({ titulo:p.titulo, descricao:p.descricao||"", preco_base:p.preco_base, imagem_url:p.imagem_url||"", ativo:p.ativo, destaque:p.destaque });
    setEditId(p.id);
  }

  const inp = { width:"100%", border:`1px solid #E2E8F0`, padding:"10px 12px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", marginBottom:10 };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:C.navy, marginBottom:24 }}>Produtos</h2>
        {load ? <p style={{ color:C.muted }}>Carregando...</p> : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {produtos.map(p => (
              <div key={p.id} style={{ background:C.white, border:`1px solid #E2E8F0`, overflow:"hidden", opacity:p.ativo?1:0.5 }}>
                <div style={{ height:120, background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                  {p.imagem_url
                    ? <img src={p.imagem_url} alt={p.titulo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:32 }}>🖼️</span>}
                </div>
                <div style={{ padding:12 }}>
                  <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 4px" }}>{p.titulo}</p>
                  <p style={{ fontSize:13, color:C.orange, fontWeight:700, margin:"0 0 8px" }}>{fmt(p.preco_base)}</p>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => editar(p)}
                      style={{ flex:1, background:C.navy, color:"#fff", border:"none", padding:"6px", fontSize:11, cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600 }}>
                      Editar
                    </button>
                    <button onClick={() => toggleAtivo(p.id, p.ativo)}
                      style={{ flex:1, background:p.ativo?"#FEE2E2":"#D1FAE5", color:p.ativo?C.red:C.green, border:"none", padding:"6px", fontSize:11, cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600 }}>
                      {p.ativo ? "Ocultar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background:C.white, padding:20, border:`1px solid #E2E8F0`, position:"sticky", top:20 }}>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:16, marginTop:0 }}>
          {editId ? "Editar produto" : "Novo produto"}
        </h3>
        <input placeholder="Título *" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} style={inp}/>
        <textarea placeholder="Descrição" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} style={{ ...inp, resize:"vertical" }}/>
        <input placeholder="Preço base (ex: 89.90) *" value={form.preco_base} onChange={e=>setForm(f=>({...f,preco_base:e.target.value}))} type="number" step="0.01" style={inp}/>
        <input placeholder="URL da imagem" value={form.imagem_url} onChange={e=>setForm(f=>({...f,imagem_url:e.target.value}))} style={inp}/>
        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, fontSize:13, cursor:"pointer" }}>
          <input type="checkbox" checked={form.destaque} onChange={e=>setForm(f=>({...f,destaque:e.target.checked}))}/>
          Produto em destaque
        </label>
        <div style={{ display:"flex", gap:8 }}>
          {editId && (
            <button onClick={() => { setForm({ titulo:"", descricao:"", preco_base:"", imagem_url:"", ativo:true, destaque:false }); setEditId(null); }}
              style={{ flex:1, background:"none", border:`1px solid #E2E8F0`, padding:11, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              Cancelar
            </button>
          )}
          <button onClick={salvar} disabled={saving}
            style={{ flex:2, background:C.orange, color:"#fff", border:"none", padding:12, cursor:"pointer", fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, opacity:saving?0.7:1 }}>
            {saving ? "Salvando..." : editId ? "Salvar alterações" : "Adicionar produto"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CLIENTES ────────────────────────────────────────────────── */
function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [load,     setLoad]     = useState(true);

  useEffect(() => {
    supabase.from("usuarios").select("*").eq("role","cliente").order("created_at",{ascending:false})
      .then(({ data }) => { setClientes(data||[]); setLoad(false); });
  }, []);

  if (load) return <p style={{ color:C.muted }}>Carregando...</p>;

  return (
    <div>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:C.navy, marginBottom:24 }}>Clientes</h2>
      <div style={{ background:C.white, border:`1px solid #E2E8F0`, overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid #E2E8F0` }}>
              {["Nome","E-mail","Desde"].map(h => (
                <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} style={{ borderBottom:`1px solid #F1F5F9` }}>
                <td style={{ padding:"12px 16px", fontWeight:600, color:C.navy }}>{c.nome}</td>
                <td style={{ padding:"12px 16px", color:C.muted }}>{c.email}</td>
                <td style={{ padding:"12px 16px", color:C.muted }}>{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {!clientes.length && (
              <tr><td colSpan={3} style={{ padding:32, textAlign:"center", color:C.muted }}>Nenhum cliente ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── APP PRINCIPAL ───────────────────────────────────────────── */
export default function AdminPanel({ onLogout }) {
  const [aba, setAba] = useState("dashboard");

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.gray, fontFamily:"'DM Sans',sans-serif" }}>
      <Sidebar aba={aba} setAba={setAba} onLogout={onLogout}/>
      <main style={{ flex:1, padding:"clamp(20px,3vw,36px)", overflow:"auto" }}>
        {aba === "dashboard" && <Dashboard/>}
        {aba === "pedidos"   && <Pedidos/>}
        {aba === "produtos"  && <Produtos/>}
        {aba === "clientes"  && <Clientes/>}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3001/api";

const C = {
  navy:   "#1B2E4B",
  orange: "#E07A20",
  cream:  "#EDE8C8",
  white:  "#FFFFFF",
  gray:   "#F4F6F8",
  muted:  "#8A97A8",
  red:    "#E53E3E",
  green:  "#2F855A",
};

const STATUS_COLOR = {
  pendente:     { bg:"#FEF3C7", text:"#92400E" },
  pago:         { bg:"#D1FAE5", text:"#065F46" },
  em_producao:  { bg:"#DBEAFE", text:"#1E40AF" },
  enviado:      { bg:"#EDE9FE", text:"#5B21B6" },
  entregue:     { bg:"#D1FAE5", text:"#065F46" },
  cancelado:    { bg:"#FEE2E2", text:"#991B1B" },
  reembolsado:  { bg:"#F3F4F6", text:"#374151" },
};

function badge(status) {
  const s = STATUS_COLOR[status] || { bg:"#eee", text:"#333" };
  return <span style={{ background:s.bg, color:s.text, fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, textTransform:"uppercase", letterSpacing:"0.06em" }}>{status?.replace("_"," ")}</span>;
}

function fmt(v) { return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

// ── API helper ─────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const token = localStorage.getItem("ng_admin_token");
  const res = await fetch(API + path, {
    headers: { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════════ */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro,  setErro]  = useState("");
  const [load,  setLoad]  = useState(false);

  async function submit(e) {
    e.preventDefault(); setErro(""); setLoad(true);
    try {
      const d = await api("/auth/login", { method:"POST", body:{ email, senha } });
      if (d.usuario.role !== "admin") { setErro("Acesso permitido apenas para admins"); return; }
      localStorage.setItem("ng_admin_token", d.token);
      onLogin(d.usuario);
    } catch { setErro("E-mail ou senha incorretos"); }
    finally { setLoad(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:C.white, padding:40, width:380, boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy }}>NANDY</span>
          <span style={{ fontFamily:"'Caveat',cursive", fontSize:24, color:C.orange }}> Govi</span>
          <p style={{ fontSize:13, color:C.muted, marginTop:6, letterSpacing:"0.08em" }}>PAINEL ADMINISTRATIVO</p>
        </div>
        <form onSubmit={submit}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" type="email" required
            style={inp()} />
          <input value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" type="password" required
            style={{ ...inp(), marginBottom:0 }} />
          {erro && <p style={{ color:C.red, fontSize:12, marginTop:8 }}>{erro}</p>}
          <button type="submit" disabled={load}
            style={{ width:"100%", background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", marginTop:20, letterSpacing:"0.08em" }}>
            {load ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */
function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api("/admin/dashboard").then(setData).catch(console.error); }, []);
  if (!data) return <Loading />;

  return (
    <div>
      <h2 style={pageTitle()}>Dashboard</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {[
          { label:"Vendas hoje",      value: fmt(data.vendas.total),          icon:"💰", color:C.orange },
          { label:"Pedidos hoje",     value: data.vendas.pedidos,             icon:"📦", color:C.navy  },
          { label:"Total clientes",   value: data.clientes,                   icon:"👤", color:"#2F855A" },
          { label:"Estoque baixo",    value: data.estoque_baixo + " produtos",icon:"⚠️", color:C.red  },
        ].map(c => (
          <div key={c.label} style={{ background:C.white, padding:20, borderLeft:`4px solid ${c.color}` }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{c.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:C.navy }}>{c.value}</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
        {/* Pedidos recentes */}
        <div style={{ background:C.white, padding:20 }}>
          <h3 style={sectionTitle()}>Pedidos Recentes</h3>
          <table style={tbl()}>
            <thead><tr>{["Nº","Cliente","Total","Status","Data"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
            <tbody>
              {data.recentes.map(p => (
                <tr key={p.id}>
                  <td style={td()}><code style={{ fontSize:11 }}>{p.numero}</code></td>
                  <td style={td()}>{p.cliente_nome || "—"}</td>
                  <td style={td()}>{fmt(p.total)}</td>
                  <td style={td()}>{badge(p.status)}</td>
                  <td style={td()}>{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Top produtos */}
        <div style={{ background:C.white, padding:20 }}>
          <h3 style={sectionTitle()}>Mais Vendidos</h3>
          {data.top.map((p,i) => (
            <div key={p.titulo} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:C.orange, minWidth:24 }}>#{i+1}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{p.titulo}</div>
                <div style={{ fontSize:12, color:C.muted }}>{p.vendidos} vendidos</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PEDIDOS
══════════════════════════════════════════════════════════════════ */
function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [filtro,  setFiltro]  = useState("");
  const [detail,  setDetail]  = useState(null);
  const [novoStatus, setNovoStatus] = useState("");
  const [rastreio,   setRastreio]   = useState("");

  const load = useCallback(() => {
    const q = filtro ? `?status=${filtro}` : "";
    api(`/admin/pedidos${q}`).then(setPedidos);
  }, [filtro]);
  useEffect(load, [load]);

  async function abrirDetalhe(id) {
    const d = await api(`/admin/pedidos/${id}`);
    setDetail(d); setNovoStatus(d.status); setRastreio(d.codigo_rastreio || "");
  }

  async function salvarStatus() {
    await api(`/admin/pedidos/${detail.id}/status`, { method:"PUT", body:{ status:novoStatus, codigo_rastreio:rastreio } });
    setDetail(null); load();
  }

  return (
    <div>
      <h2 style={pageTitle()}>Pedidos</h2>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["","pendente","pago","em_producao","enviado","entregue","cancelado"].map(s => (
          <button key={s} onClick={()=>setFiltro(s)}
            style={{ padding:"7px 16px", border:`1px solid ${filtro===s?C.navy:"#ddd"}`, background:filtro===s?C.navy:"transparent", color:filtro===s?"#fff":C.muted, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", borderRadius:20 }}>
            {s || "Todos"}
          </button>
        ))}
      </div>

      <div style={{ background:C.white }}>
        <table style={tbl()}>
          <thead><tr>{["Nº Pedido","Cliente","Total","Status","Data","Ação"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
          <tbody>
            {pedidos.map(p => (
              <tr key={p.id} style={{ cursor:"pointer" }} onMouseOver={e=>e.currentTarget.style.background="#f9f9f9"} onMouseOut={e=>e.currentTarget.style.background=""}>
                <td style={td()}><code style={{ fontSize:12 }}>{p.numero}</code></td>
                <td style={td()}>{p.cliente_nome || "—"}<br/><span style={{ fontSize:11, color:C.muted }}>{p.cliente_email}</span></td>
                <td style={td()}>{fmt(p.total)}</td>
                <td style={td()}>{badge(p.status)}</td>
                <td style={td()}>{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                <td style={td()}>
                  <button onClick={()=>abrirDetalhe(p.id)} style={btnSm(C.navy)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal detalhe */}
      {detail && (
        <Modal title={`Pedido ${detail.numero}`} onClose={()=>setDetail(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div><b>Cliente:</b> {detail.cliente_nome}<br/><span style={{ fontSize:12, color:C.muted }}>{detail.cliente_email}</span></div>
            <div><b>Total:</b> {fmt(detail.total)}</div>
            <div><b>Endereço:</b> {detail.logradouro}, {detail.numero_end} — {detail.bairro}, {detail.cidade}/{detail.estado}</div>
            <div><b>Pagamento:</b> {detail.pagamento_status || "—"} {detail.pago_em ? `• ${new Date(detail.pago_em).toLocaleDateString("pt-BR")}` : ""}</div>
          </div>

          <h4 style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>Itens</h4>
          <table style={tbl()}>
            <thead><tr>{["Produto","Tamanho","Acabamento","Qtd","Valor"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
            <tbody>
              {detail.itens?.map((i,x) => (
                <tr key={x}>
                  <td style={td()}>{i.produto_titulo}</td>
                  <td style={td()}>{i.tamanho_codigo} — {i.tamanho_desc}</td>
                  <td style={td()}>{i.acabamento_nome}</td>
                  <td style={td()}>{i.quantidade}</td>
                  <td style={td()}>{fmt(i.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop:20, display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div>
              <label style={lbl()}>Novo status</label>
              <select value={novoStatus} onChange={e=>setNovoStatus(e.target.value)} style={inp()}>
                {["pendente","pago","em_producao","enviado","entregue","cancelado","reembolsado"].map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl()}>Código de rastreio</label>
              <input value={rastreio} onChange={e=>setRastreio(e.target.value)} placeholder="BR123456789BR" style={inp()} />
            </div>
            <button onClick={salvarStatus} style={btnSm(C.orange)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUTOS
══════════════════════════════════════════════════════════════════ */
function Produtos() {
  const [produtos,  setProdutos]  = useState([]);
  const [form,      setForm]      = useState(null);
  const [acabamentos, setAcabamentos] = useState([]);
  const [tamanhos,    setTamanhos]    = useState([]);
  const [aba, setAba] = useState("produtos");

  useEffect(() => {
    api("/admin/produtos").then(setProdutos);
    api("/admin/acabamentos").then(setAcabamentos);
    api("/admin/tamanhos").then(setTamanhos);
  }, []);

  const VAZIO = { titulo:"", subtitulo:"", slug:"", descricao:"", preco_base:"", destaque:0, estoque:0, ativo:1, categoria_id:"" };

  async function salvar() {
    const method = form.id ? "PUT" : "POST";
    const path   = form.id ? `/produtos/${form.id}` : "/produtos";
    await api(path, { method, body: form });
    api("/admin/produtos").then(setProdutos);
    setForm(null);
  }

  async function salvarAcab(a) {
    await api(`/admin/acabamentos/${a.id}`, { method:"PUT", body: a });
    api("/admin/acabamentos").then(setAcabamentos);
  }
  async function salvarTam(t) {
    await api(`/admin/tamanhos/${t.id}`, { method:"PUT", body: t });
    api("/admin/tamanhos").then(setTamanhos);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={pageTitle()}>Produtos</h2>
        <button onClick={()=>setForm(VAZIO)} style={btnSm(C.orange)}>+ Novo produto</button>
      </div>

      {/* Abas */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:`2px solid #eee` }}>
        {["produtos","acabamentos","tamanhos"].map(a => (
          <button key={a} onClick={()=>setAba(a)} style={{ background:"none", border:"none", borderBottom:aba===a?`2px solid ${C.orange}`:"2px solid transparent", padding:"10px 20px", fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:600, color:aba===a?C.orange:C.muted, cursor:"pointer", marginBottom:-2, textTransform:"capitalize" }}>{a}</button>
        ))}
      </div>

      {aba === "produtos" && (
        <div style={{ background:C.white }}>
          <table style={tbl()}>
            <thead><tr>{["Produto","Preço","Estoque","Vendidos","Destaque","Status","Ação"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p.id}>
                  <td style={td()}><b style={{ fontSize:13 }}>{p.titulo}</b><br/><span style={{ fontSize:11, color:C.muted }}>{p.subtitulo}</span></td>
                  <td style={td()}>{fmt(p.preco_base)}</td>
                  <td style={td()}><span style={{ color: p.estoque<=5?C.red:C.green, fontWeight:600 }}>{p.estoque}</span></td>
                  <td style={td()}>{p.vendidos}</td>
                  <td style={td()}>{p.destaque ? "✅" : "—"}</td>
                  <td style={td()}>{p.ativo ? <span style={{ color:C.green }}>Ativo</span> : <span style={{ color:C.red }}>Inativo</span>}</td>
                  <td style={td()}><button onClick={()=>setForm(p)} style={btnSm(C.navy)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aba === "acabamentos" && (
        <div style={{ background:C.white, padding:20 }}>
          <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Edite os preços e nomes das opções de acabamento dos quadros.</p>
          {acabamentos.map(a => (
            <div key={a.id} style={{ display:"grid", gridTemplateColumns:"1fr 2fr 120px 80px 60px", gap:10, alignItems:"center", marginBottom:12, padding:12, border:"1px solid #eee" }}>
              <input defaultValue={a.nome} onBlur={e=>salvarAcab({...a, nome:e.target.value})} style={inp()} placeholder="Nome"/>
              <input defaultValue={a.descricao} onBlur={e=>salvarAcab({...a, descricao:e.target.value})} style={inp()} placeholder="Descrição"/>
              <input defaultValue={a.preco_extra} type="number" onBlur={e=>salvarAcab({...a, preco_extra:e.target.value})} style={inp()} placeholder="Preço extra"/>
              <select defaultValue={a.ativo} onChange={e=>salvarAcab({...a, ativo:Number(e.target.value)})} style={inp()}>
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
              <code style={{ fontSize:11, color:C.muted }}>{a.codigo}</code>
            </div>
          ))}
        </div>
      )}

      {aba === "tamanhos" && (
        <div style={{ background:C.white, padding:20 }}>
          <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Edite os preços e descrições dos tamanhos disponíveis.</p>
          {tamanhos.map(t => (
            <div key={t.id} style={{ display:"grid", gridTemplateColumns:"60px 1fr 120px 80px", gap:10, alignItems:"center", marginBottom:12, padding:12, border:"1px solid #eee" }}>
              <code style={{ fontSize:14, fontWeight:700, color:C.navy }}>{t.codigo}</code>
              <input defaultValue={t.descricao} onBlur={e=>salvarTam({...t, descricao:e.target.value})} style={inp()} placeholder="Descrição (ex: 30x40cm)"/>
              <input defaultValue={t.preco_extra} type="number" onBlur={e=>salvarTam({...t, preco_extra:e.target.value})} style={inp()} placeholder="Preço extra"/>
              <select defaultValue={t.ativo} onChange={e=>salvarTam({...t, ativo:Number(e.target.value)})} style={inp()}>
                <option value={1}>Ativo</option>
                <option value={0}>Inativo</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar produto */}
      {form && (
        <Modal title={form.id ? "Editar produto" : "Novo produto"} onClose={()=>setForm(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["titulo","Título"],["subtitulo","Subtítulo (artista)"],["slug","Slug (URL)"],["preco_base","Preço base (R$)"],["estoque","Estoque"],["categoria_id","ID Categoria"]].map(([k,l])=>(
              <div key={k}>
                <label style={lbl()}>{l}</label>
                <input value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} style={inp()}/>
              </div>
            ))}
            <div>
              <label style={lbl()}>Destaque na home</label>
              <select value={form.destaque} onChange={e=>setForm({...form,destaque:Number(e.target.value)})} style={inp()}>
                <option value={1}>Sim</option><option value={0}>Não</option>
              </select>
            </div>
            <div>
              <label style={lbl()}>Status</label>
              <select value={form.ativo} onChange={e=>setForm({...form,ativo:Number(e.target.value)})} style={inp()}>
                <option value={1}>Ativo</option><option value={0}>Inativo</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={lbl()}>Descrição</label>
            <textarea value={form.descricao||""} onChange={e=>setForm({...form,descricao:e.target.value})} style={{ ...inp(), height:80, resize:"vertical" }}/>
          </div>
          <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={()=>setForm(null)} style={btnSm("#aaa")}>Cancelar</button>
            <button onClick={salvar} style={btnSm(C.orange)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CLIENTES
══════════════════════════════════════════════════════════════════ */
function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca,    setBusca]    = useState("");
  const [detalhe,  setDetalhe]  = useState(null);

  useEffect(() => {
    const q = busca ? `?busca=${busca}` : "";
    api(`/admin/clientes${q}`).then(setClientes);
  }, [busca]);

  async function verDetalhe(id) {
    const d = await api(`/admin/clientes/${id}`);
    setDetalhe(d);
  }

  async function toggleAtivo(id, ativo) {
    await api(`/admin/clientes/${id}/status`, { method:"PUT", body:{ ativo: ativo?0:1 } });
    api("/admin/clientes").then(setClientes);
    if (detalhe?.id === id) setDetalhe(null);
  }

  return (
    <div>
      <h2 style={pageTitle()}>Clientes</h2>
      <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail..."
        style={{ ...inp(), width:300, marginBottom:20 }} />

      <div style={{ background:C.white }}>
        <table style={tbl()}>
          <thead><tr>{["Nome","E-mail","Pedidos","Total gasto","Cadastro","Status","Ação"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id}>
                <td style={td()}>{c.nome}</td>
                <td style={td()}>{c.email}</td>
                <td style={td()}>{c.total_pedidos}</td>
                <td style={td()}>{fmt(c.total_gasto)}</td>
                <td style={td()}>{new Date(c.criado_em).toLocaleDateString("pt-BR")}</td>
                <td style={td()}>{c.ativo ? <span style={{ color:C.green, fontWeight:600 }}>Ativo</span> : <span style={{ color:C.red, fontWeight:600 }}>Bloqueado</span>}</td>
                <td style={td()}>
                  <button onClick={()=>verDetalhe(c.id)} style={btnSm(C.navy)}>Ver</button>
                  <button onClick={()=>toggleAtivo(c.id, c.ativo)} style={{ ...btnSm(c.ativo?C.red:"#2F855A"), marginLeft:6 }}>{c.ativo?"Bloquear":"Ativar"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalhe && (
        <Modal title={`Cliente: ${detalhe.nome}`} onClose={()=>setDetalhe(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            <div><b>E-mail:</b> {detalhe.email}</div>
            <div><b>Telefone:</b> {detalhe.telefone || "—"}</div>
            <div><b>CPF:</b> {detalhe.cpf || "—"}</div>
            <div><b>Cadastro:</b> {new Date(detalhe.criado_em).toLocaleDateString("pt-BR")}</div>
          </div>
          <h4 style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>Histórico de pedidos</h4>
          {detalhe.pedidos?.length ? (
            <table style={tbl()}>
              <thead><tr>{["Nº","Status","Total","Data"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
              <tbody>
                {detalhe.pedidos.map(p=>(
                  <tr key={p.id}>
                    <td style={td()}><code style={{ fontSize:11 }}>{p.numero}</code></td>
                    <td style={td()}>{badge(p.status)}</td>
                    <td style={td()}>{fmt(p.total)}</td>
                    <td style={td()}>{new Date(p.criado_em).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color:C.muted, fontSize:13 }}>Nenhum pedido ainda.</p>}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CUPONS
══════════════════════════════════════════════════════════════════ */
function Cupons() {
  const [cupons, setCupons] = useState([]);
  const [form,   setForm]   = useState(null);
  const VAZIO = { codigo:"", tipo:"percentual", valor:"", uso_maximo:"", valor_minimo:"", valido_de:"", valido_ate:"" };

  useEffect(() => { api("/admin/cupons").then(setCupons); }, []);

  async function salvar() {
    await api("/admin/cupons", { method:"POST", body: form });
    api("/admin/cupons").then(setCupons);
    setForm(null);
  }

  async function toggle(id, ativo) {
    await api(`/admin/cupons/${id}`, { method:"PUT", body:{ ativo: ativo?0:1 } });
    api("/admin/cupons").then(setCupons);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={pageTitle()}>Cupons de desconto</h2>
        <button onClick={()=>setForm(VAZIO)} style={btnSm(C.orange)}>+ Novo cupom</button>
      </div>

      <div style={{ background:C.white }}>
        <table style={tbl()}>
          <thead><tr>{["Código","Tipo","Valor","Usos","Validade","Status","Ação"].map(h=><th key={h} style={th()}>{h}</th>)}</tr></thead>
          <tbody>
            {cupons.map(c => (
              <tr key={c.id}>
                <td style={td()}><code style={{ fontWeight:700, fontSize:13 }}>{c.codigo}</code></td>
                <td style={td()}>{c.tipo}</td>
                <td style={td()}>{c.tipo==="percentual"?`${c.valor}%`:fmt(c.valor)}</td>
                <td style={td()}>{c.uso_atual}/{c.uso_maximo||"∞"}</td>
                <td style={td()}>{c.valido_ate ? new Date(c.valido_ate).toLocaleDateString("pt-BR") : "Sem limite"}</td>
                <td style={td()}>{c.ativo ? <span style={{ color:C.green }}>Ativo</span> : <span style={{ color:C.red }}>Inativo</span>}</td>
                <td style={td()}><button onClick={()=>toggle(c.id, c.ativo)} style={btnSm(c.ativo?C.red:"#2F855A")}>{c.ativo?"Desativar":"Ativar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title="Novo cupom" onClose={()=>setForm(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={lbl()}>Código</label><input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} style={inp()} placeholder="EX: DESCONTO10"/></div>
            <div><label style={lbl()}>Tipo</label>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} style={inp()}>
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
                <option value="frete_gratis">Frete grátis</option>
              </select>
            </div>
            <div><label style={lbl()}>Valor</label><input value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} type="number" style={inp()} placeholder="10"/></div>
            <div><label style={lbl()}>Uso máximo (vazio = ilimitado)</label><input value={form.uso_maximo} onChange={e=>setForm({...form,uso_maximo:e.target.value})} type="number" style={inp()}/></div>
            <div><label style={lbl()}>Pedido mínimo (R$)</label><input value={form.valor_minimo} onChange={e=>setForm({...form,valor_minimo:e.target.value})} type="number" style={inp()}/></div>
            <div><label style={lbl()}>Válido até</label><input value={form.valido_ate} onChange={e=>setForm({...form,valido_ate:e.target.value})} type="date" style={inp()}/></div>
          </div>
          <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={()=>setForm(null)} style={btnSm("#aaa")}>Cancelar</button>
            <button onClick={salvar} style={btnSm(C.orange)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTES UTILITÁRIOS
══════════════════════════════════════════════════════════════════ */
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:C.white, width:"100%", maxWidth:720, maxHeight:"90vh", overflowY:"auto", padding:28, position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.navy }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:C.muted }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Carregando...</div>;
}

// Micro style helpers
const inp  = () => ({ width:"100%", border:"1px solid #ddd", padding:"9px 12px", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", background:"#fff", boxSizing:"border-box" });
const lbl  = () => ({ display:"block", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 });
const btnSm = (bg) => ({ background:bg, color:"#fff", border:"none", padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.04em" });
const tbl  = () => ({ width:"100%", borderCollapse:"collapse", fontSize:13 });
const th   = () => ({ padding:"11px 14px", textAlign:"left", fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", borderBottom:"2px solid #f0f0f0", background:C.gray });
const td   = () => ({ padding:"11px 14px", borderBottom:"1px solid #f5f5f5", color:C.navy, verticalAlign:"middle" });
const pageTitle  = () => ({ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy, marginBottom:24, marginTop:0 });
const sectionTitle = () => ({ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:C.navy, marginBottom:14, marginTop:0 });

/* ══════════════════════════════════════════════════════════════════
   APP PRINCIPAL
══════════════════════════════════════════════════════════════════ */
const MENU = [
  { id:"dashboard", label:"Dashboard",  icon:"📊" },
  { id:"pedidos",   label:"Pedidos",    icon:"📦" },
  { id:"produtos",  label:"Produtos",   icon:"🖼️"  },
  { id:"clientes",  label:"Clientes",   icon:"👥" },
  { id:"cupons",    label:"Cupons",     icon:"🏷️"  },
];

export default function AdminPanel() {
  const [usuario, setUsuario] = useState(() => {
    const token = localStorage.getItem("ng_admin_token");
    return token ? { nome:"Admin" } : null;
  });
  const [aba, setAba] = useState("dashboard");

  if (!usuario) return <Login onLogin={setUsuario} />;

  const PAGES = { dashboard:<Dashboard/>, pedidos:<Pedidos/>, produtos:<Produtos/>, clientes:<Clientes/>, cupons:<Cupons/> };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", background:C.gray }}>
      {/* Sidebar */}
      <aside style={{ width:220, background:C.navy, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 18px", borderBottom:"1px solid rgba(255,255,255,.1)" }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:"#fff" }}>NANDY</span>
          <span style={{ fontFamily:"'Caveat',cursive", fontSize:20, color:C.orange }}> Govi</span>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.45)", letterSpacing:"0.1em", marginTop:4 }}>ADMIN PANEL</div>
        </div>
        <nav style={{ flex:1, padding:"16px 0" }}>
          {MENU.map(m => (
            <button key={m.id} onClick={()=>setAba(m.id)}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:aba===m.id?"rgba(255,255,255,.1)":"transparent", border:"none", borderLeft:aba===m.id?`3px solid ${C.orange}`:"3px solid transparent", padding:"12px 20px", color:aba===m.id?"#fff":"rgba(255,255,255,.6)", fontSize:13, fontWeight:aba===m.id?600:400, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textAlign:"left", transition:"all .15s" }}>
              <span style={{ fontSize:16 }}>{m.icon}</span> {m.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,.1)" }}>
          <button onClick={()=>{ localStorage.removeItem("ng_admin_token"); setUsuario(null); }}
            style={{ background:"none", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.6)", padding:"8px 16px", cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", width:"100%" }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex:1, padding:"32px 36px", overflowY:"auto" }}>
        {PAGES[aba]}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";

/* ─── CONFIG ─────────────────────────────────────────────────────── */
const API = "http://localhost:3001/api";

const C = {
  navy:   "#1B2E4B",
  orange: "#E07A20",
  cream:  "#EDE8C8",
  white:  "#FFFFFF",
  gray:   "#F4F6F8",
  muted:  "#8A97A8",
  border: "#E5E7EB",
  red:    "#DC2626",
  green:  "#16A34A",
  yellow: "#CA8A04",
};

/* ─── API HELPER ─────────────────────────────────────────────────── */
async function api(path, opts = {}) {
  const token = localStorage.getItem("ng_admin_token");
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API + path, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isForm ? { "Content-Type": "application/json" } : {}),
    },
    ...opts,
    body: opts.body
      ? isForm ? opts.body : JSON.stringify(opts.body)
      : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }));
    throw new Error(err.erro || "Erro desconhecido");
  }
  return res.json();
}

const fmt  = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const slug = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

/* ─── STYLE HELPERS ─────────────────────────────────────────────── */
const S = {
  inp:   { width:"100%", border:`1px solid ${C.border}`, padding:"9px 12px", fontSize:13, fontFamily:"sans-serif", outline:"none", background:C.white, boxSizing:"border-box", color:C.navy },
  lbl:   { display:"block", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4 },
  btnPrimary: { background:C.orange, color:"#fff", border:"none", padding:"10px 22px", fontSize:13, fontWeight:700, cursor:"pointer", letterSpacing:"0.05em" },
  btnSecondary: { background:"transparent", color:C.navy, border:`1px solid ${C.border}`, padding:"9px 18px", fontSize:13, cursor:"pointer" },
  btnDanger: { background:C.red, color:"#fff", border:"none", padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  btnSuccess: { background:C.green, color:"#fff", border:"none", padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  tag: (bg, text) => ({ background:bg, color:text, fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, letterSpacing:"0.06em", textTransform:"uppercase" }),
  card: { background:C.white, border:`1px solid ${C.border}` },
};

/* ═══════════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, tipo="success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

function Toasts({ toasts }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.tipo==="error"?C.red : t.tipo==="warn"?C.yellow : C.green, color:"#fff", padding:"12px 20px", fontSize:13, fontWeight:500, boxShadow:"0 4px 16px rgba(0,0,0,.2)", minWidth:260, display:"flex", alignItems:"center", gap:10 }}>
          <span>{t.tipo==="error"?"❌" : t.tipo==="warn"?"⚠️" : "✅"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL GENÉRICO
═══════════════════════════════════════════════════════════════════ */
function Modal({ title, onClose, width=680, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:C.white, width:"100%", maxWidth:width, maxHeight:"92vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:C.white, zIndex:1 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.navy }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.muted, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24, flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CONFIRMAÇÃO
═══════════════════════════════════════════════════════════════════ */
function Confirmar({ msg, onOk, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.white, padding:32, maxWidth:360, width:"90%", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <p style={{ fontSize:15, color:C.navy, marginBottom:24 }}>{msg}</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={onCancel} style={S.btnSecondary}>Cancelar</button>
          <button onClick={onOk} style={S.btnDanger}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UPLOAD DE IMAGEM (drag & drop + URL)
═══════════════════════════════════════════════════════════════════ */
function ImagemUpload({ produtoId, imagens, onAtualizar, toast }) {
  const [urlInput, setUrlInput] = useState("");
  const [drag, setDrag]         = useState(false);
  const fileRef                 = useRef();

  async function addUrl() {
    if (!urlInput.trim()) return;
    try {
      await api(`/admin/produtos/${produtoId}/imagens`, { method:"POST", body:{ url: urlInput.trim(), principal: imagens.length===0 } });
      setUrlInput("");
      toast("Imagem adicionada!");
      onAtualizar();
    } catch(e) { toast(e.message,"error"); }
  }

  async function definirPrincipal(imgId) {
    try {
      await api(`/admin/produtos/${produtoId}/imagens/${imgId}/principal`, { method:"PUT", body:{} });
      toast("Imagem principal definida!");
      onAtualizar();
    } catch(e) { toast(e.message,"error"); }
  }

  async function remover(imgId) {
    try {
      await api(`/admin/produtos/${produtoId}/imagens/${imgId}`, { method:"DELETE" });
      toast("Imagem removida!","warn");
      onAtualizar();
    } catch(e) { toast(e.message,"error"); }
  }

  return (
    <div>
      {/* Imagens atuais */}
      {imagens.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:16 }}>
          {imagens.map(img => (
            <div key={img.id} style={{ position:"relative", width:100, height:100, border:`2px solid ${img.principal?C.orange:C.border}`, overflow:"hidden" }}>
              <img src={img.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e=>{ e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23eee' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='12'%3E?%3C/text%3E%3C/svg%3E"; }}/>
              {img.principal && <span style={{ position:"absolute", top:4, left:4, background:C.orange, color:"#fff", fontSize:9, fontWeight:700, padding:"2px 5px" }}>PRINCIPAL</span>}
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.65)", display:"flex", gap:2, padding:4 }}>
                {!img.principal && <button onClick={()=>definirPrincipal(img.id)} style={{ flex:1, background:C.orange, border:"none", color:"#fff", fontSize:9, cursor:"pointer", padding:"2px 0" }}>★</button>}
                <button onClick={()=>remover(img.id)} style={{ flex:1, background:C.red, border:"none", color:"#fff", fontSize:9, cursor:"pointer", padding:"2px 0" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar por URL */}
      <div style={{ border:`1px solid ${C.border}`, padding:16 }}>
        <label style={S.lbl}>Adicionar por URL da imagem</label>
        <div style={{ display:"flex", gap:8 }}>
          <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            style={{ ...S.inp, flex:1 }}
            onKeyDown={e=>e.key==="Enter" && addUrl()}/>
          <button onClick={addUrl} style={S.btnPrimary}>Adicionar</button>
        </div>
        <p style={{ fontSize:11, color:C.muted, marginTop:8, marginBottom:0 }}>
          💡 Dica: hospede suas imagens no Cloudflare R2, AWS S3 ou ImgBB (gratuito) e cole a URL aqui.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FORM PRODUTO
═══════════════════════════════════════════════════════════════════ */
const PRODUTO_VAZIO = {
  titulo:"", subtitulo:"", slug:"", descricao:"",
  preco_base:"", estoque:"0", ativo:1, destaque:0,
  categoria_id:"", meta_titulo:"", meta_descricao:"",
  tamanhos_ids:[], acabamentos_ids:[],
};

function FormProduto({ produto, categorias, tamanhos, acabamentos, onSalvar, onCancelar, toast }) {
  const [form,    setForm]    = useState(produto ? { ...produto, tamanhos_ids: produto.tamanhos?.filter(t=>t.estoque!==null).map(t=>t.id)||[], acabamentos_ids: produto.acabamentos?.filter(a=>a.habilitado).map(a=>a.id)||[] } : PRODUTO_VAZIO);
  const [aba,     setAba]     = useState("basico");
  const [salvando,setSalvando]= useState(false);
  const [imgData, setImgData] = useState(produto?.imagens || []);

  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  function autoSlug(titulo) {
    if (!form.id) set("slug", slug(titulo));
  }

  function toggleArr(key, id) {
    setForm(f => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id] };
    });
  }

  async function salvar() {
    if (!form.titulo)     { toast("Título obrigatório","error"); return; }
    if (!form.slug)       { toast("Slug obrigatório","error"); return; }
    if (!form.preco_base) { toast("Preço obrigatório","error"); return; }
    setSalvando(true);
    try {
      const method = form.id ? "PUT" : "POST";
      const path   = form.id ? `/admin/produtos/${form.id}` : "/admin/produtos";
      await api(path, { method, body: form });
      toast(form.id ? "Produto atualizado!" : "Produto criado!");
      onSalvar();
    } catch(e) { toast(e.message,"error"); }
    finally { setSalvando(false); }
  }

  async function recarregarImagens() {
    const d = await api(`/admin/produtos/${form.id}`);
    setImgData(d.imagens);
  }

  const abas = ["basico","imagens","opcoes","seo"];
  const abaLabel = { basico:"📝 Básico", imagens:"🖼️ Imagens", opcoes:"⚙️ Opções", seo:"🔍 SEO" };

  return (
    <div>
      {/* Abas */}
      <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, marginBottom:20 }}>
        {abas.map(a => (
          <button key={a} onClick={()=>setAba(a)}
            style={{ background:"none", border:"none", borderBottom:aba===a?`2px solid ${C.orange}`:"2px solid transparent", padding:"10px 18px", fontSize:13, fontWeight:aba===a?700:400, color:aba===a?C.orange:C.muted, cursor:"pointer", marginBottom:-2 }}>
            {abaLabel[a]}
          </button>
        ))}
      </div>

      {/* ── ABA BÁSICO ── */}
      {aba==="basico" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={{ gridColumn:"span 2" }}>
            <label style={S.lbl}>Título *</label>
            <input value={form.titulo} onChange={e=>{ set("titulo",e.target.value); autoSlug(e.target.value); }} style={S.inp} placeholder="Ex: Don't Tap the Glass"/>
          </div>
          <div>
            <label style={S.lbl}>Subtítulo / Artista</label>
            <input value={form.subtitulo||""} onChange={e=>set("subtitulo",e.target.value)} style={S.inp} placeholder="Ex: Tyler The Creator"/>
          </div>
          <div>
            <label style={S.lbl}>Slug (URL) *</label>
            <input value={form.slug} onChange={e=>set("slug",slug(e.target.value))} style={S.inp} placeholder="dont-tap-the-glass"/>
          </div>
          <div>
            <label style={S.lbl}>Preço base (R$) *</label>
            <input value={form.preco_base} onChange={e=>set("preco_base",e.target.value)} type="number" min="0" step="0.01" style={S.inp} placeholder="140.00"/>
          </div>
          <div>
            <label style={S.lbl}>Estoque</label>
            <input value={form.estoque} onChange={e=>set("estoque",e.target.value)} type="number" min="0" style={S.inp}/>
          </div>
          <div>
            <label style={S.lbl}>Categoria</label>
            <select value={form.categoria_id||""} onChange={e=>set("categoria_id",e.target.value)} style={S.inp}>
              <option value="">Sem categoria</option>
              {categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Status</label>
            <select value={form.ativo} onChange={e=>set("ativo",Number(e.target.value))} style={S.inp}>
              <option value={1}>Ativo (visível na loja)</option>
              <option value={0}>Inativo (oculto)</option>
            </select>
          </div>
          <div>
            <label style={S.lbl}>Destaque na home</label>
            <select value={form.destaque} onChange={e=>set("destaque",Number(e.target.value))} style={S.inp}>
              <option value={1}>Sim — aparece na home</option>
              <option value={0}>Não</option>
            </select>
          </div>
          <div style={{ gridColumn:"span 2" }}>
            <label style={S.lbl}>Descrição</label>
            <textarea value={form.descricao||""} onChange={e=>set("descricao",e.target.value)} rows={4} style={{ ...S.inp, resize:"vertical" }} placeholder="Descreva o produto, técnica, material..."/>
          </div>
        </div>
      )}

      {/* ── ABA IMAGENS ── */}
      {aba==="imagens" && (
        <div>
          {!form.id ? (
            <div style={{ padding:24, background:C.gray, textAlign:"center", color:C.muted, fontSize:13 }}>
              💾 Salve o produto primeiro para adicionar imagens.
            </div>
          ) : (
            <ImagemUpload produtoId={form.id} imagens={imgData} onAtualizar={recarregarImagens} toast={toast}/>
          )}
        </div>
      )}

      {/* ── ABA OPÇÕES ── */}
      {aba==="opcoes" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          <div>
            <label style={{ ...S.lbl, marginBottom:12 }}>Tamanhos disponíveis</label>
            {tamanhos.map(t => (
              <label key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1px solid ${form.tamanhos_ids?.includes(t.id)?C.orange:C.border}`, marginBottom:8, cursor:"pointer", background:form.tamanhos_ids?.includes(t.id)?`${C.orange}0d`:C.white }}>
                <input type="checkbox" checked={form.tamanhos_ids?.includes(t.id)||false} onChange={()=>toggleArr("tamanhos_ids",t.id)} style={{ width:16, height:16, accentColor:C.orange }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{t.codigo} — {t.descricao}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{t.preco_extra>0?`+${fmt(t.preco_extra)}`:"Incluído no preço"}</div>
                </div>
              </label>
            ))}
          </div>
          <div>
            <label style={{ ...S.lbl, marginBottom:12 }}>Acabamentos disponíveis</label>
            {acabamentos.map(a => (
              <label key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border:`1px solid ${form.acabamentos_ids?.includes(a.id)?C.orange:C.border}`, marginBottom:8, cursor:"pointer", background:form.acabamentos_ids?.includes(a.id)?`${C.orange}0d`:C.white }}>
                <input type="checkbox" checked={form.acabamentos_ids?.includes(a.id)||false} onChange={()=>toggleArr("acabamentos_ids",a.id)} style={{ width:16, height:16, accentColor:C.orange }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{a.nome}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{a.descricao} {a.preco_extra>0?`— +${fmt(a.preco_extra)}`:""}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── ABA SEO ── */}
      {aba==="seo" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={S.lbl}>Meta título</label>
            <input value={form.meta_titulo||""} onChange={e=>set("meta_titulo",e.target.value)} style={S.inp} placeholder="Título para Google (máx 60 chars)"/>
            <span style={{ fontSize:11, color:(form.meta_titulo||"").length>60?C.red:C.muted }}>{(form.meta_titulo||"").length}/60</span>
          </div>
          <div>
            <label style={S.lbl}>Meta descrição</label>
            <textarea value={form.meta_descricao||""} onChange={e=>set("meta_descricao",e.target.value)} rows={3} style={{ ...S.inp, resize:"vertical" }} placeholder="Descrição para Google (máx 160 chars)"/>
            <span style={{ fontSize:11, color:(form.meta_descricao||"").length>160?C.red:C.muted }}>{(form.meta_descricao||"").length}/160</span>
          </div>
          <div style={{ padding:16, background:C.gray, border:`1px solid ${C.border}` }}>
            <p style={{ fontSize:11, color:C.muted, margin:"0 0 8px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prévia no Google</p>
            <p style={{ fontSize:14, color:"#1a0dab", margin:"0 0 2px" }}>{form.meta_titulo || form.titulo || "Título do produto"}</p>
            <p style={{ fontSize:12, color:"#006621", margin:"0 0 2px" }}>nandygovi.com.br/produtos/{form.slug||"slug-do-produto"}</p>
            <p style={{ fontSize:13, color:"#545454", margin:0 }}>{form.meta_descricao || form.descricao || "Descrição do produto..."}</p>
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:24, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
        <button onClick={onCancelar} style={S.btnSecondary}>Cancelar</button>
        <button onClick={salvar} disabled={salvando} style={{ ...S.btnPrimary, opacity:salvando?.6:1 }}>
          {salvando ? "Salvando..." : form.id ? "Salvar alterações" : "Criar produto"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GESTÃO DE ESTOQUE (modal)
═══════════════════════════════════════════════════════════════════ */
function ModalEstoque({ produto, onClose, onAtualizar, toast }) {
  const [qtd, setQtd] = useState("");
  const [op,  setOp]  = useState("set");

  async function salvar() {
    if (!qtd) return;
    try {
      const r = await api(`/admin/produtos/${produto.id}/estoque`, { method:"POST", body:{ quantidade: Number(qtd), operacao: op } });
      toast(`Estoque atualizado: ${r.estoque} unidades`);
      onAtualizar();
      onClose();
    } catch(e) { toast(e.message,"error"); }
  }

  return (
    <Modal title={`Estoque — ${produto.titulo}`} onClose={onClose} width={420}>
      <div style={{ padding:"12px 16px", background:C.gray, marginBottom:20, display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:C.muted }}>Estoque atual</span>
        <span style={{ fontSize:20, fontWeight:700, color: produto.estoque<=5?C.red:C.navy }}>{produto.estoque}</span>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={S.lbl}>Operação</label>
        <select value={op} onChange={e=>setOp(e.target.value)} style={S.inp}>
          <option value="set">Definir quantidade exata</option>
          <option value="add">Adicionar unidades</option>
          <option value="sub">Remover unidades</option>
        </select>
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={S.lbl}>Quantidade</label>
        <input value={qtd} onChange={e=>setQtd(e.target.value)} type="number" min="0" style={S.inp} autoFocus/>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={onClose} style={S.btnSecondary}>Cancelar</button>
        <button onClick={salvar} style={S.btnPrimary}>Atualizar</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DETALHE DO PRODUTO (avaliações)
═══════════════════════════════════════════════════════════════════ */
function ModalAvaliacoes({ produto, onClose, toast }) {
  const [avs, setAvs] = useState(produto.avaliacoes || []);

  async function toggle(id, aprovada) {
    try {
      await api(`/admin/avaliacoes/${id}/aprovar`, { method:"PUT", body:{ aprovada: aprovada?0:1 } });
      toast("Avaliação atualizada!");
      setAvs(a => a.map(x => x.id===id ? { ...x, aprovada: aprovada?0:1 } : x));
    } catch(e) { toast(e.message,"error"); }
  }

  async function remover(id) {
    try {
      await api(`/admin/avaliacoes/${id}`, { method:"DELETE" });
      toast("Avaliação removida!","warn");
      setAvs(a => a.filter(x => x.id!==id));
    } catch(e) { toast(e.message,"error"); }
  }

  return (
    <Modal title={`Avaliações — ${produto.titulo}`} onClose={onClose} width={680}>
      {avs.length===0 ? (
        <p style={{ color:C.muted, textAlign:"center", padding:32 }}>Nenhuma avaliação ainda.</p>
      ) : avs.map(av => (
        <div key={av.id} style={{ padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ color:"#F59E0B", fontSize:16 }}>{"★".repeat(av.nota)}{"☆".repeat(5-av.nota)}</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.navy }}>{av.titulo||""}</span>
                <span style={{ ...S.tag(av.aprovada?"#D1FAE5":"#FEE2E2", av.aprovada?C.green:C.red) }}>{av.aprovada?"Aprovada":"Pendente"}</span>
              </div>
              <p style={{ margin:"0 0 4px", fontSize:13, color:C.navy }}>{av.comentario||"(sem comentário)"}</p>
              <p style={{ margin:0, fontSize:11, color:C.muted }}>{av.usuario_nome || "Anônimo"} · {new Date(av.criado_em).toLocaleDateString("pt-BR")}</p>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button onClick={()=>toggle(av.id,av.aprovada)} style={av.aprovada?S.btnDanger:S.btnSuccess}>{av.aprovada?"Reprovar":"Aprovar"}</button>
              <button onClick={()=>remover(av.id)} style={S.btnDanger}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL — ADMIN PRODUTOS
═══════════════════════════════════════════════════════════════════ */
export default function AdminProdutos() {
  const { toasts, add: toast } = useToast();

  // Dados
  const [produtos,    setProdutos]    = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [tamanhos,    setTamanhos]    = useState([]);
  const [acabamentos, setAcabamentos] = useState([]);

  // UI
  const [loading,     setLoading]     = useState(true);
  const [busca,       setBusca]       = useState("");
  const [filtCat,     setFiltCat]     = useState("");
  const [filtStatus,  setFiltStatus]  = useState("");
  const [modal,       setModal]       = useState(null);  // "novo" | "editar" | "estoque" | "avaliacoes" | "categorias" | "acabamentos" | "tamanhos"
  const [prodSel,     setProdSel]     = useState(null);
  const [confirmar,   setConfirmar]   = useState(null);
  const [aba,         setAba]         = useState("produtos"); // "produtos" | "categorias" | "acabamentos" | "tamanhos"

  // Form categoria/acabamento/tamanho inline
  const [formCat,     setFormCat]     = useState(null);
  const [formAcab,    setFormAcab]    = useState(null);
  const [formTam,     setFormTam]     = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, t, a] = await Promise.all([
        api("/admin/produtos"),
        api("/admin/categorias"),
        api("/admin/tamanhos"),
        api("/admin/acabamentos"),
      ]);
      setProdutos(p);
      setCategorias(c);
      setTamanhos(t);
      setAcabamentos(a);
    } catch(e) { toast(e.message,"error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  /* ── Produto completo para editar ── */
  async function abrirEditar(id) {
    try {
      const d = await api(`/admin/produtos/${id}`);
      setProdSel(d);
      setModal("editar");
    } catch(e) { toast(e.message,"error"); }
  }

  /* ── Desativar produto ── */
  function pedirDesativar(p) {
    setConfirmar({
      msg:`Desativar "${p.titulo}"? Ele ficará oculto na loja.`,
      ok: async () => {
        try {
          await api(`/admin/produtos/${p.id}`, { method:"PUT", body:{ ...p, ativo:0 } });
          toast("Produto desativado!","warn");
          carregar();
        } catch(e) { toast(e.message,"error"); }
        setConfirmar(null);
      }
    });
  }

  /* ── Filtros ── */
  const prodsFiltrados = produtos.filter(p => {
    const okBusca = !busca || p.titulo.toLowerCase().includes(busca.toLowerCase()) || (p.subtitulo||"").toLowerCase().includes(busca.toLowerCase());
    const okCat   = !filtCat   || String(p.categoria_id) === filtCat;
    const okSts   = !filtStatus || (filtStatus==="ativo" ? p.ativo : !p.ativo);
    return okBusca && okCat && okSts;
  });

  /* ── Salvar categoria ── */
  async function salvarCat(f) {
    try {
      if (f.id) await api(`/admin/categorias/${f.id}`, { method:"PUT", body: f });
      else await api("/admin/categorias", { method:"POST", body: f });
      toast(f.id?"Categoria atualizada!":"Categoria criada!");
      setFormCat(null);
      carregar();
    } catch(e) { toast(e.message,"error"); }
  }

  /* ── Salvar acabamento ── */
  async function salvarAcab(f) {
    try {
      if (f.id) await api(`/admin/acabamentos/${f.id}`, { method:"PUT", body: f });
      else await api("/admin/acabamentos", { method:"POST", body: f });
      toast(f.id?"Acabamento atualizado!":"Acabamento criado!");
      setFormAcab(null);
      carregar();
    } catch(e) { toast(e.message,"error"); }
  }

  /* ── Salvar tamanho ── */
  async function salvarTam(f) {
    try {
      await api(`/admin/tamanhos/${f.id}`, { method:"PUT", body: f });
      toast("Tamanho atualizado!");
      setFormTam(null);
      carregar();
    } catch(e) { toast(e.message,"error"); }
  }

  /* ── RENDER ── */
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.gray, minHeight:"100vh" }}>
      <Toasts toasts={toasts}/>
      {confirmar && <Confirmar msg={confirmar.msg} onOk={confirmar.ok} onCancel={()=>setConfirmar(null)}/>}

      {/* ── HEADER ── */}
      <div style={{ background:C.navy, padding:"0 32px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontFamily:"serif", fontSize:18, fontWeight:800, color:"#fff" }}>NANDY</span>
            <span style={{ fontFamily:"cursive", fontSize:20, color:C.orange }}> Govi</span>
            <span style={{ color:"rgba(255,255,255,.3)", fontSize:16 }}>/</span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,.7)", letterSpacing:"0.06em" }}>GESTÃO DE PRODUTOS</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {["produtos","categorias","acabamentos","tamanhos"].map(a=>(
              <button key={a} onClick={()=>setAba(a)}
                style={{ background:aba===a?"rgba(255,255,255,.12)":"transparent", border:"none", color:aba===a?"#fff":"rgba(255,255,255,.55)", padding:"8px 16px", fontSize:12, fontWeight:aba===a?600:400, cursor:"pointer", fontFamily:"sans-serif", letterSpacing:"0.05em", textTransform:"capitalize", borderBottom:aba===a?`2px solid ${C.orange}`:"2px solid transparent" }}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 32px" }}>

        {/* ══ ABA PRODUTOS ══ */}
        {aba==="produtos" && (
          <>
            {/* Toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar produto..."
                style={{ ...S.inp, width:260 }}/>
              <select value={filtCat} onChange={e=>setFiltCat(e.target.value)} style={{ ...S.inp, width:180 }}>
                <option value="">Todas categorias</option>
                {categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select value={filtStatus} onChange={e=>setFiltStatus(e.target.value)} style={{ ...S.inp, width:140 }}>
                <option value="">Todos status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
              <span style={{ flex:1 }}/>
              <span style={{ fontSize:13, color:C.muted }}>{prodsFiltrados.length} produto(s)</span>
              <button onClick={()=>{ setProdSel(null); setModal("novo"); }} style={S.btnPrimary}>
                + Novo produto
              </button>
            </div>

            {/* Grid de cards */}
            {loading ? (
              <div style={{ textAlign:"center", padding:60, color:C.muted }}>Carregando...</div>
            ) : prodsFiltrados.length===0 ? (
              <div style={{ textAlign:"center", padding:60 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🖼️</div>
                <p style={{ color:C.muted }}>Nenhum produto encontrado.</p>
                <button onClick={()=>{ setProdSel(null); setModal("novo"); }} style={{ ...S.btnPrimary, marginTop:12 }}>Criar primeiro produto</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
                {prodsFiltrados.map(p => (
                  <div key={p.id} style={{ ...S.card, display:"flex", flexDirection:"column", overflow:"hidden", transition:"box-shadow .2s" }}
                    onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.1)"}
                    onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>

                    {/* Imagem */}
                    <div style={{ height:180, background:`linear-gradient(135deg, ${C.navy}, #2d4a6e)`, position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {p.imagem_principal ? (
                        <img src={p.imagem_principal} alt={p.titulo} style={{ width:"100%", height:"100%", objectFit:"cover" }}
                          onError={e=>{ e.target.style.display="none"; }}/>
                      ) : (
                        <span style={{ fontSize:56, opacity:.4 }}>🖼️</span>
                      )}
                      {/* badges */}
                      <div style={{ position:"absolute", top:10, left:10, display:"flex", flexDirection:"column", gap:4 }}>
                        {p.destaque ? <span style={S.tag(C.orange,"#fff")}>⭐ Destaque</span> : null}
                        {!p.ativo   ? <span style={S.tag(C.red,"#fff")}>Inativo</span> : null}
                        {p.estoque<=5 && p.estoque>0 ? <span style={S.tag("#FEF3C7",C.yellow)}>Estoque baixo</span> : null}
                        {p.estoque===0 ? <span style={S.tag("#FEE2E2",C.red)}>Esgotado</span> : null}
                      </div>
                      {/* qtd imagens */}
                      <div style={{ position:"absolute", bottom:8, right:10, fontSize:11, color:"rgba(255,255,255,.7)", background:"rgba(0,0,0,.4)", padding:"2px 8px", borderRadius:10 }}>
                        {p.total_imagens||0} foto(s)
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding:"14px 16px", flex:1 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                        <div>
                          <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.navy, lineHeight:1.3 }}>{p.titulo}</p>
                          {p.subtitulo && <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>{p.subtitulo}</p>}
                        </div>
                        <span style={{ fontSize:16, fontWeight:700, color:C.navy, flexShrink:0 }}>{fmt(p.preco_base)}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                        {p.categoria_nome && <span style={S.tag("#DBEAFE","#1E40AF")}>{p.categoria_nome}</span>}
                        <span style={S.tag(C.gray,C.muted)}>Est: {p.estoque}</span>
                        <span style={S.tag(C.gray,C.muted)}>Vendidos: {p.vendidos||0}</span>
                        {p.media_nota && <span style={S.tag("#FEF3C7",C.yellow)}>★ {p.media_nota} ({p.total_avaliacoes})</span>}
                      </div>
                    </div>

                    {/* Ações */}
                    <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}`, display:"flex", gap:6, flexWrap:"wrap" }}>
                      <button onClick={()=>abrirEditar(p.id)} style={{ ...S.btnPrimary, padding:"7px 14px", fontSize:12, flex:1 }}>✏️ Editar</button>
                      <button onClick={()=>{ setProdSel(p); setModal("estoque"); }} style={{ ...S.btnSecondary, padding:"7px 12px", fontSize:12 }}>📦 Estoque</button>
                      <button onClick={()=>{ setProdSel(p); setModal("avaliacoes"); }} style={{ ...S.btnSecondary, padding:"7px 12px", fontSize:12 }}>⭐ Avaliações</button>
                      <button onClick={()=>pedirDesativar(p)} style={{ ...S.btnDanger, padding:"7px 12px", fontSize:12 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ ABA CATEGORIAS ══ */}
        {aba==="categorias" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.navy }}>Categorias</h2>
              <button onClick={()=>setFormCat({ nome:"", slug:"", descricao:"", ativa:1 })} style={S.btnPrimary}>+ Nova categoria</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {categorias.map(c=>(
                <div key={c.id} style={{ ...S.card, padding:18, display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:44, height:44, background:C.navy, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:C.orange, fontSize:20, flexShrink:0 }}>🏷</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.navy }}>{c.nome}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>/{c.slug} · {c.total_produtos||0} produtos</p>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setFormCat(c)} style={{ ...S.btnSecondary, padding:"6px 12px", fontSize:12 }}>✏️</button>
                    <span style={{ ...S.tag(c.ativa?"#D1FAE5":"#FEE2E2", c.ativa?C.green:C.red), display:"flex", alignItems:"center" }}>{c.ativa?"Ativa":"Inativa"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ ABA ACABAMENTOS ══ */}
        {aba==="acabamentos" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.navy }}>Acabamentos dos quadros</h2>
              <button onClick={()=>setFormAcab({ codigo:"", nome:"", descricao:"", preco_extra:0, ativo:1 })} style={S.btnPrimary}>+ Novo acabamento</button>
            </div>
            <div style={{ ...S.card, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.gray }}>
                    {["Código","Nome","Descrição","Preço Extra","Status","Ação"].map(h=>(
                      <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acabamentos.map(a=>(
                    <tr key={a.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px" }}><code style={{ background:C.gray, padding:"2px 8px", fontSize:12 }}>{a.codigo}</code></td>
                      <td style={{ padding:"12px 16px", fontWeight:600, color:C.navy }}>{a.nome}</td>
                      <td style={{ padding:"12px 16px", color:C.muted }}>{a.descricao}</td>
                      <td style={{ padding:"12px 16px" }}>{a.preco_extra>0?<span style={{ color:C.orange, fontWeight:600 }}>+{fmt(a.preco_extra)}</span>:<span style={{ color:C.muted }}>Incluso</span>}</td>
                      <td style={{ padding:"12px 16px" }}><span style={S.tag(a.ativo?"#D1FAE5":"#FEE2E2",a.ativo?C.green:C.red)}>{a.ativo?"Ativo":"Inativo"}</span></td>
                      <td style={{ padding:"12px 16px" }}><button onClick={()=>setFormAcab(a)} style={{ ...S.btnSecondary, padding:"6px 12px" }}>✏️ Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ABA TAMANHOS ══ */}
        {aba==="tamanhos" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.navy }}>Tamanhos disponíveis</h2>
            </div>
            <div style={{ ...S.card, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.gray }}>
                    {["Código","Descrição","Preço Extra","Status","Ação"].map(h=>(
                      <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tamanhos.map(t=>(
                    <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px" }}><span style={{ fontFamily:"monospace", fontWeight:700, fontSize:16, color:C.navy }}>{t.codigo}</span></td>
                      <td style={{ padding:"12px 16px", color:C.muted }}>{t.descricao}</td>
                      <td style={{ padding:"12px 16px" }}>{t.preco_extra>0?<span style={{ color:C.orange, fontWeight:600 }}>+{fmt(t.preco_extra)}</span>:<span style={{ color:C.muted }}>Incluso</span>}</td>
                      <td style={{ padding:"12px 16px" }}><span style={S.tag(t.ativo?"#D1FAE5":"#FEE2E2",t.ativo?C.green:C.red)}>{t.ativo?"Ativo":"Inativo"}</span></td>
                      <td style={{ padding:"12px 16px" }}><button onClick={()=>setFormTam(t)} style={{ ...S.btnSecondary, padding:"6px 12px" }}>✏️ Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ MODAL: NOVO / EDITAR PRODUTO ══ */}
      {(modal==="novo" || modal==="editar") && (
        <Modal title={modal==="novo" ? "Novo produto" : `Editar: ${prodSel?.titulo}`} onClose={()=>setModal(null)} width={780}>
          <FormProduto
            produto={modal==="editar" ? prodSel : null}
            categorias={categorias} tamanhos={tamanhos} acabamentos={acabamentos}
            toast={toast}
            onCancelar={()=>setModal(null)}
            onSalvar={()=>{ setModal(null); carregar(); }}/>
        </Modal>
      )}

      {/* ══ MODAL: ESTOQUE ══ */}
      {modal==="estoque" && prodSel && (
        <ModalEstoque produto={prodSel} onClose={()=>setModal(null)} onAtualizar={carregar} toast={toast}/>
      )}

      {/* ══ MODAL: AVALIAÇÕES ══ */}
      {modal==="avaliacoes" && prodSel && (
        <ModalAvaliacoes produto={prodSel} onClose={()=>setModal(null)} toast={toast}/>
      )}

      {/* ══ MODAL: FORM CATEGORIA ══ */}
      {formCat && (
        <Modal title={formCat.id?"Editar categoria":"Nova categoria"} onClose={()=>setFormCat(null)} width={440}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><label style={S.lbl}>Nome</label><input value={formCat.nome} onChange={e=>setFormCat(f=>({...f,nome:e.target.value,slug:f.id?f.slug:slug(e.target.value)}))} style={S.inp}/></div>
            <div><label style={S.lbl}>Slug</label><input value={formCat.slug} onChange={e=>setFormCat(f=>({...f,slug:slug(e.target.value)}))} style={S.inp}/></div>
            <div><label style={S.lbl}>Descrição</label><textarea value={formCat.descricao||""} onChange={e=>setFormCat(f=>({...f,descricao:e.target.value}))} rows={2} style={{ ...S.inp, resize:"vertical" }}/></div>
            <div><label style={S.lbl}>Status</label>
              <select value={formCat.ativa} onChange={e=>setFormCat(f=>({...f,ativa:Number(e.target.value)}))} style={S.inp}>
                <option value={1}>Ativa</option><option value={0}>Inativa</option>
              </select>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
              <button onClick={()=>setFormCat(null)} style={S.btnSecondary}>Cancelar</button>
              <button onClick={()=>salvarCat(formCat)} style={S.btnPrimary}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: FORM ACABAMENTO ══ */}
      {formAcab && (
        <Modal title={formAcab.id?"Editar acabamento":"Novo acabamento"} onClose={()=>setFormAcab(null)} width={480}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {!formAcab.id && <div><label style={S.lbl}>Código (único, ex: vidro_duplo)</label><input value={formAcab.codigo} onChange={e=>setFormAcab(f=>({...f,codigo:e.target.value}))} style={S.inp}/></div>}
            <div><label style={S.lbl}>Nome</label><input value={formAcab.nome} onChange={e=>setFormAcab(f=>({...f,nome:e.target.value}))} style={S.inp}/></div>
            <div><label style={S.lbl}>Descrição</label><input value={formAcab.descricao||""} onChange={e=>setFormAcab(f=>({...f,descricao:e.target.value}))} style={S.inp}/></div>
            <div><label style={S.lbl}>Preço extra (R$)</label><input value={formAcab.preco_extra} onChange={e=>setFormAcab(f=>({...f,preco_extra:e.target.value}))} type="number" min="0" step="0.01" style={S.inp}/></div>
            <div><label style={S.lbl}>Status</label>
              <select value={formAcab.ativo} onChange={e=>setFormAcab(f=>({...f,ativo:Number(e.target.value)}))} style={S.inp}>
                <option value={1}>Ativo</option><option value={0}>Inativo</option>
              </select>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setFormAcab(null)} style={S.btnSecondary}>Cancelar</button>
              <button onClick={()=>salvarAcab(formAcab)} style={S.btnPrimary}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: FORM TAMANHO ══ */}
      {formTam && (
        <Modal title="Editar tamanho" onClose={()=>setFormTam(null)} width={420}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ padding:"10px 14px", background:C.gray }}><span style={{ fontSize:13, color:C.muted }}>Código: </span><strong>{formTam.codigo}</strong></div>
            <div><label style={S.lbl}>Descrição (ex: 30×40cm)</label><input value={formTam.descricao} onChange={e=>setFormTam(f=>({...f,descricao:e.target.value}))} style={S.inp}/></div>
            <div><label style={S.lbl}>Preço extra (R$)</label><input value={formTam.preco_extra} onChange={e=>setFormTam(f=>({...f,preco_extra:e.target.value}))} type="number" min="0" step="0.01" style={S.inp}/></div>
            <div><label style={S.lbl}>Status</label>
              <select value={formTam.ativo} onChange={e=>setFormTam(f=>({...f,ativo:Number(e.target.value)}))} style={S.inp}>
                <option value={1}>Ativo</option><option value={0}>Inativo</option>
              </select>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setFormTam(null)} style={S.btnSecondary}>Cancelar</button>
              <button onClick={()=>salvarTam(formTam)} style={S.btnPrimary}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useCallback } from "react";
import { supabase } from "./utils/supabase";

const C = {
  cream:"#EDE8C8", navy:"#1B2E4B", orange:"#E07A20",
  white:"#FFFFFF", muted:"#A89F7A", border:"#D9D3B8",
  gray:"#F4F3EE", green:"#16A34A", red:"#DC2626",
};
const fmt = v => Number(v||0).toLocaleString("pt-BR",{ style:"currency", currency:"BRL" });
const BASE = import.meta.env.VITE_SUPABASE_URL;

function Toast({ msg, tipo="success" }) {
  const bg = tipo==="error"?C.red:"#CA8A04";
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:bg, color:"#fff", padding:"13px 22px", fontSize:13, zIndex:500, display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 20px rgba(0,0,0,.3)", whiteSpace:"nowrap", pointerEvents:"none" }}>
      {tipo==="error"?"❌":"⚠️"} {msg}
    </div>
  );
}

function Logo() {
  return (
    <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"flex-end", gap:2 }}>
      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy, lineHeight:1 }}>NANDY</span>
      <span style={{ fontFamily:"'Caveat',cursive", fontSize:24, color:C.orange, lineHeight:1, marginBottom:2 }}>Govi</span>
    </a>
  );
}

export default function Checkout({ cart, onVoltar, onIrPix }) {
  const [form, setForm] = useState({
    cep:"", logradouro:"", numero:"", complemento:"",
    bairro:"", cidade:"", estado:""
  });
  const [etapa,   setEtapa]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [cepLoad, setCepLoad] = useState(false);
  const [toast,   setToast]   = useState(null);

  const cartTotal = cart.reduce((s,c) => s + c.preco * c.qty, 0);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  function showToast(msg, tipo="error") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  async function buscarCep(cep) {
    const c = cep.replace(/\D/g,"");
    if (c.length !== 8) return;
    setCepLoad(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) setForm(f => ({
        ...f, cep,
        logradouro: d.logradouro||"",
        bairro:     d.bairro||"",
        cidade:     d.localidade||"",
        estado:     d.uf||"",
      }));
    } catch {}
    setCepLoad(false);
  }

  async function finalizar() {
    if (!form.cep || !form.logradouro || !form.numero || !form.cidade) {
      showToast("Preencha todos os campos obrigatórios"); return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast("Você precisa estar logado"); return; }

      // Busca usuario na tabela
      const { data: usuario } = await supabase
        .from("usuarios").select("id, nome, email")
        .eq("auth_id", session.user.id).single();

      if (!usuario) { showToast("Usuário não encontrado"); return; }

      const numero = `NG${Date.now().toString().slice(-8)}`;

      // Cria o pedido no Supabase
      const { data: pedido, error } = await supabase.from("pedidos").insert({
        usuario_id:      usuario.id,
        numero,
        subtotal:        cartTotal,
        desconto:        0,
        frete:           0,
        total:           cartTotal,
        status:          "aguardando_pagamento",
        status_pagamento:"pendente",
        endereco_json:   form,
      }).select().single();

      if (error) throw error;

      // Insere itens
      await supabase.from("pedido_itens").insert(
        cart.map(c => ({
          pedido_id:     pedido.id,
          produto_id:    c.produto.id,
          tamanho_id:    null,
          acabamento_id: null,
          quantidade:    c.qty,
          preco_unit:    c.preco,
          nome_produto:  c.produto.titulo,
          tamanho_desc:  c.tam?.desc || c.tam?.descricao || "",
          acabamento_desc: c.opc?.label || c.opc?.nome || "",
        }))
      );

      // Chave Pix simulada (substituir por MP depois)
      const chavePix = `00020126360014br.gov.bcb.pix0114+55119999999995204000053039865406${cartTotal.toFixed(2).replace(".","").padStart(7,"0")}5802BR5913NandyGovi6008Brasilia62070503***6304ABCD`;

      await supabase.from("pedidos").update({ chave_pix: chavePix }).eq("id", pedido.id);

      onIrPix({ pedido_id: pedido.id, numero, total: cartTotal, chavePix });

    } catch(e) {
      showToast(e.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  const inp = {
    width:"100%", border:`1px solid ${C.border}`, padding:"11px 14px",
    fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none",
    boxSizing:"border-box", color:C.navy,
  };
  const lbl = {
    display:"block", fontSize:11, fontWeight:700, color:C.muted,
    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5,
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.gray, minHeight:"100vh" }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo}/>}

      <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <Logo/>
          <button onClick={onVoltar} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            ← Voltar à loja
          </button>
        </div>
      </header>

      {/* stepper */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center" }}>
          {["Endereço","Revisão","Pagamento"].map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", flex:i<2?1:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:etapa>i?C.orange:etapa===i+1?C.navy:"#ddd", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                <span style={{ fontSize:13, fontWeight:etapa===i+1?700:400, color:etapa===i+1?C.navy:C.muted, whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i<2 && <div style={{ flex:1, height:2, background:etapa>i+1?C.orange:"#ddd", margin:"0 12px" }}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px", display:"grid", gridTemplateColumns:"1fr clamp(240px,34%,300px)", gap:20, alignItems:"start" }}>

        {/* ETAPA 1 — ENDEREÇO */}
        {etapa===1 && (
          <div style={{ background:C.white, padding:"clamp(18px,3vw,28px)", border:`1px solid ${C.border}` }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.navy, marginBottom:20, marginTop:0 }}>
              Endereço de entrega
            </h2>

            <div style={{ marginBottom:14 }}>
              <label style={lbl}>CEP *</label>
              <div style={{ display:"flex", gap:8 }}>
                <input value={form.cep} onChange={e=>set("cep",e.target.value)} onBlur={e=>buscarCep(e.target.value)}
                  placeholder="00000-000" maxLength={9} style={{ ...inp, flex:1 }}/>
                <button onClick={()=>buscarCep(form.cep)} disabled={cepLoad}
                  style={{ background:C.navy, color:"#fff", border:"none", padding:"0 16px", cursor:"pointer", fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, whiteSpace:"nowrap" }}>
                  {cepLoad ? "..." : "Buscar"}
                </button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
              <div><label style={lbl}>Logradouro *</label><input value={form.logradouro} onChange={e=>set("logradouro",e.target.value)} style={inp} placeholder="Rua, Av..."/></div>
              <div><label style={lbl}>Número *</label><input value={form.numero} onChange={e=>set("numero",e.target.value)} style={inp} placeholder="123"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div><label style={lbl}>Complemento</label><input value={form.complemento} onChange={e=>set("complemento",e.target.value)} style={inp} placeholder="Apto, Bloco..."/></div>
              <div><label style={lbl}>Bairro *</label><input value={form.bairro} onChange={e=>set("bairro",e.target.value)} style={inp}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:24 }}>
              <div><label style={lbl}>Cidade *</label><input value={form.cidade} onChange={e=>set("cidade",e.target.value)} style={inp}/></div>
              <div><label style={lbl}>UF *</label><input value={form.estado} onChange={e=>set("estado",e.target.value)} maxLength={2} style={inp} placeholder="SE"/></div>
            </div>

            {/* aviso frete */}
            <div style={{ background:`${C.orange}0f`, border:`1px solid ${C.orange}44`, padding:"12px 14px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>📦</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.navy, margin:"0 0 2px" }}>Frete combinado</p>
                <p style={{ fontSize:12, color:C.muted, margin:0 }}>O valor do frete será informado após a confirmação do pedido, com base no seu endereço.</p>
              </div>
            </div>

            <button onClick={()=>setEtapa(2)}
              style={{ width:"100%", background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>
              Revisar pedido →
            </button>
          </div>
        )}

        {/* ETAPA 2 — REVISÃO */}
        {etapa===2 && (
          <div style={{ background:C.white, padding:"clamp(18px,3vw,28px)", border:`1px solid ${C.border}` }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.navy, marginBottom:20, marginTop:0 }}>
              Revisar pedido
            </h2>

            {cart.map(item => (
              <div key={item.key} style={{ display:"flex", gap:12, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:56, height:70, background:item.produto.bg||C.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                  {item.produto.imagem_url
                    ? <img src={item.produto.imagem_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:24 }}>{item.produto.emoji||"🖼️"}</span>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 3px" }}>{item.produto.titulo} × {item.qty}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{item.tam?.desc||""} · {item.opc?.label||""}</p>
                </div>
                <span style={{ fontWeight:700, fontSize:14, color:C.navy }}>{fmt(item.preco*item.qty)}</span>
              </div>
            ))}

            <div style={{ background:C.gray, padding:"12px 14px", marginBottom:20, borderLeft:`3px solid ${C.orange}` }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:4 }}>📍 Entrega em:</p>
              <p style={{ fontSize:13, color:C.muted, margin:0, lineHeight:1.5 }}>
                {form.logradouro}, {form.numero}{form.complemento ? `, ${form.complemento}` : ""}<br/>
                {form.bairro} — {form.cidade}/{form.estado}<br/>
                CEP {form.cep}
              </p>
            </div>

            <div style={{ background:`${C.orange}0f`, border:`1px solid ${C.orange}44`, padding:"10px 14px", marginBottom:20, fontSize:12, color:C.navy }}>
              📦 Frete a combinar após confirmação do pedido
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button onClick={()=>setEtapa(1)}
                style={{ flex:1, background:"transparent", color:C.navy, border:`2px solid ${C.navy}`, padding:13, fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                ← Editar
              </button>
              <button onClick={finalizar} disabled={loading}
                style={{ flex:2, background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", opacity:loading?0.7:1 }}>
                {loading ? "Processando..." : "Ir para Pix ⚡"}
              </button>
            </div>
          </div>
        )}

        {/* RESUMO LATERAL */}
        <div style={{ background:C.white, padding:20, border:`1px solid ${C.border}`, position:"sticky", top:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:16, marginTop:0 }}>Resumo</h3>
          {cart.map(item => (
            <div key={item.key} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, color:C.muted }}>{item.produto.titulo} ×{item.qty}</span>
              <span style={{ fontSize:12, fontWeight:600, color:C.navy }}>{fmt(item.preco*item.qty)}</span>
            </div>
          ))}
          <div style={{ height:1, background:C.border, margin:"12px 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:13, color:C.muted }}>Subtotal</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{fmt(cartTotal)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <span style={{ fontSize:13, color:C.muted }}>Frete</span>
            <span style={{ fontSize:12, color:C.orange, fontWeight:600 }}>A combinar</span>
          </div>
          <div style={{ height:1, background:C.border, margin:"0 0 12px" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:C.navy }}>Total</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.navy }}>{fmt(cartTotal)}</span>
          </div>
          <div style={{ background:`${C.navy}08`, border:`1px solid ${C.navy}22`, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
            <span>⚡</span>
            <span style={{ fontSize:12, color:C.navy }}>Pagamento via <strong>Pix</strong></span>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:640px){ div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

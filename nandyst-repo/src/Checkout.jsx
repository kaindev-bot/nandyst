import { useState, useCallback } from "react";
import { useCart } from "./hooks/useCart";

const C = {
  cream:"#EDE8C8", navy:"#1B2E4B", orange:"#E07A20",
  white:"#FFFFFF", muted:"#A89F7A", border:"#D9D3B8",
  gray:"#F4F3EE", green:"#16A34A", red:"#DC2626",
};
const fmt = v => v.toLocaleString("pt-BR",{ style:"currency", currency:"BRL" });

function Toast({ msg, tipo="success" }) {
  const bg = tipo==="error"?C.red:tipo==="warn"?"#CA8A04":C.navy;
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:bg, color:"#fff", padding:"13px 22px", fontSize:13, zIndex:500, display:"flex", alignItems:"center", gap:10, boxShadow:"0 4px 20px rgba(0,0,0,.3)", whiteSpace:"nowrap", pointerEvents:"none" }}>
      <span>{tipo==="error"?"❌":tipo==="warn"?"⚠️":"✅"}</span> {msg}
    </div>
  );
}
function useToast() {
  const [t, setT] = useState(null);
  const show = useCallback((msg, tipo="success") => {
    setT({ msg, tipo });
    setTimeout(() => setT(null), 3000);
  }, []);
  return { toast: t, show };
}
function Logo({ size=1 }) {
  return (
    <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"flex-end", gap:2 }}>
      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:26*size, fontWeight:800, color:C.navy, letterSpacing:"0.02em", lineHeight:1 }}>NANDY</span>
      <span style={{ fontFamily:"'Caveat',cursive", fontSize:28*size, color:C.orange, lineHeight:1, marginBottom:2*size }}>Govi</span>
    </a>
  );
}

export default function Checkout({ cart, onVoltar, onIrPix }) {
  const { criarPedido, loading } = useCart();
  const { toast, show } = useToast();

  const [form, setForm] = useState({ cep:"", logradouro:"", numero:"", complemento:"", bairro:"", cidade:"", estado:"" });
  const [cupom,     setCupom]     = useState("");
  const [frete,     setFrete]     = useState(null);
  const [freteLoad, setFreteLoad] = useState(false);
  const [etapa,     setEtapa]     = useState(1);

  const cartTotal = cart.reduce((s,c) => s + c.preco * c.qty, 0);
  const freteEscolhido = frete?.opcoes?.find(o => o.id === frete.selecionado);
  const total = cartTotal + (freteEscolhido?.valor || 0);

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  async function buscarCep(cep) {
    const c = cep.replace(/\D/g,"");
    if (c.length !== 8) return;
    setFreteLoad(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) setForm(f => ({ ...f, logradouro:d.logradouro||"", bairro:d.bairro||"", cidade:d.localidade||"", estado:d.uf||"", cep }));
    } catch {}
    setFrete({ opcoes:[
      { id:"pac",    nome:"PAC",    prazo:"5–8 dias úteis", valor:22.90 },
      { id:"sedex",  nome:"SEDEX",  prazo:"2–3 dias úteis", valor:38.50 },
      { id:"jadlog", nome:"Jadlog", prazo:"3–5 dias úteis", valor:29.90 },
    ], selecionado:"pac" });
    setFreteLoad(false);
  }

  async function finalizar() {
    if (!form.cep || !form.logradouro || !form.numero || !form.cidade) {
      show("Preencha todos os campos obrigatórios","error"); return;
    }
    if (!freteEscolhido) { show("Selecione uma opção de frete","error"); return; }
    try {
      const pedido = await criarPedido({ endereco: form, cupom_codigo: cupom||undefined, frete: freteEscolhido.valor });
      onIrPix(pedido);
    } catch(e) {
      show(e.message || "Erro ao criar pedido","error");
    }
  }

  const inp = { width:"100%", border:`1px solid ${C.border}`, padding:"11px 14px", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box", color:C.navy };
  const lbl = { display:"block", fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.gray, minHeight:"100vh" }}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} />}

      <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <Logo size={0.9}/>
          <button onClick={onVoltar} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:13, fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6 }}>
            ← Voltar à loja
          </button>
        </div>
      </header>

      {/* stepper */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 20px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center" }}>
          {["Endereço","Resumo","Pagamento"].map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", flex:i<2?1:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:etapa>i?C.orange:etapa===i+1?C.navy:"#ddd", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                <span style={{ fontSize:13, fontWeight:etapa===i+1?700:400, color:etapa===i+1?C.navy:C.muted, whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i<2 && <div style={{ flex:1, height:2, background:etapa>i+1?C.orange:"#ddd", margin:"0 12px" }}/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px", display:"grid", gridTemplateColumns:"1fr clamp(260px,35%,340px)", gap:20, alignItems:"start" }}>
        <div>
          {etapa===1 && (
            <div style={{ background:C.white, padding:"clamp(18px,3vw,28px)", border:`1px solid ${C.border}` }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.navy, marginBottom:20, marginTop:0 }}>Endereço de entrega</h2>

              <div style={{ marginBottom:16 }}>
                <label style={lbl}>CEP *</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={form.cep} onChange={e=>set("cep",e.target.value)} onBlur={e=>buscarCep(e.target.value)} placeholder="00000-000" maxLength={9} style={{ ...inp, flex:1 }}/>
                  <button onClick={()=>buscarCep(form.cep)} disabled={freteLoad}
                    style={{ background:C.navy, color:"#fff", border:"none", padding:"0 16px", cursor:"pointer", fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700, whiteSpace:"nowrap" }}>
                    {freteLoad?"...":"Buscar"}
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
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:20 }}>
                <div><label style={lbl}>Cidade *</label><input value={form.cidade} onChange={e=>set("cidade",e.target.value)} style={inp}/></div>
                <div><label style={lbl}>UF *</label><input value={form.estado} onChange={e=>set("estado",e.target.value)} maxLength={2} style={inp} placeholder="SP"/></div>
              </div>

              {frete && (
                <div style={{ marginBottom:20 }}>
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>Opções de frete</h3>
                  {frete.opcoes.map(op => (
                    <label key={op.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", border:`2px solid ${frete.selecionado===op.id?C.orange:C.border}`, marginBottom:8, cursor:"pointer", background:frete.selecionado===op.id?`${C.orange}0d`:C.white }}>
                      <input type="radio" checked={frete.selecionado===op.id} onChange={()=>setFrete(f=>({...f,selecionado:op.id}))} style={{ accentColor:C.orange, width:16, height:16 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:C.navy }}>{op.nome}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{op.prazo}</div>
                      </div>
                      <span style={{ fontWeight:700, color:C.navy, fontSize:14 }}>{fmt(op.valor)}</span>
                    </label>
                  ))}
                </div>
              )}

              <div style={{ marginBottom:20 }}>
                <label style={lbl}>Cupom de desconto</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={cupom} onChange={e=>setCupom(e.target.value.toUpperCase())} placeholder="DESCONTO10" style={{ ...inp, flex:1 }}/>
                  <button style={{ background:C.navy, color:"#fff", border:"none", padding:"0 16px", cursor:"pointer", fontSize:12, fontFamily:"'Syne',sans-serif", fontWeight:700 }}>Aplicar</button>
                </div>
              </div>

              <button onClick={()=>setEtapa(2)} style={{ width:"100%", background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer" }}>
                Revisar pedido →
              </button>
            </div>
          )}

          {etapa===2 && (
            <div style={{ background:C.white, padding:"clamp(18px,3vw,28px)", border:`1px solid ${C.border}` }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.navy, marginBottom:20, marginTop:0 }}>Revisar pedido</h2>
              {cart.map(item => (
                <div key={item.key} style={{ display:"flex", gap:12, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:60, height:74, background:item.produto.bg||C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>{item.produto.emoji||"🖼️"}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:13, color:C.navy, margin:"0 0 3px" }}>{item.produto.titulo} × {item.qty}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:0 }}>{item.tam?.descricao||""} · {item.opc?.nome||""}</p>
                  </div>
                  <span style={{ fontWeight:700, fontSize:14, color:C.navy }}>{fmt(item.preco*item.qty)}</span>
                </div>
              ))}
              <div style={{ background:C.gray, padding:"12px 14px", marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:4 }}>📍 Entrega em:</p>
                <p style={{ fontSize:13, color:C.muted, margin:0 }}>{form.logradouro}, {form.numero} – {form.bairro}, {form.cidade}/{form.estado} · CEP {form.cep}</p>
                <p style={{ fontSize:12, color:C.orange, marginTop:4, fontWeight:600 }}>{freteEscolhido?.nome} – {freteEscolhido?.prazo}</p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <button onClick={()=>setEtapa(1)} style={{ flex:1, background:"transparent", color:C.navy, border:`2px solid ${C.navy}`, padding:13, fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>← Editar</button>
                <button onClick={finalizar} disabled={loading} style={{ flex:2, background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", opacity:loading?0.7:1 }}>
                  {loading ? "Processando..." : "Ir para pagamento ⚡"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* resumo lateral */}
        <div style={{ background:C.white, padding:20, border:`1px solid ${C.border}`, position:"sticky", top:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:16, marginTop:0 }}>Resumo</h3>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, color:C.muted }}>Subtotal ({cart.reduce((s,c)=>s+c.qty,0)} itens)</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>{fmt(cartTotal)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:13, color:C.muted }}>Frete</span>
            <span style={{ fontSize:13, fontWeight:600, color:freteEscolhido?C.navy:C.muted }}>{freteEscolhido?fmt(freteEscolhido.valor):"—"}</span>
          </div>
          <div style={{ height:1, background:C.border, margin:"12px 0" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:C.navy }}>Total</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.navy }}>{fmt(total)}</span>
          </div>
          <div style={{ background:`${C.navy}08`, border:`1px solid ${C.navy}22`, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
            <span>⚡</span>
            <span style={{ fontSize:12, color:C.navy }}>Pagamento exclusivo via <strong>Pix</strong></span>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:640px){ div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

import { useState, useEffect } from "react";

const C = {
  cream:"#EDE8C8", navy:"#1B2E4B", orange:"#E07A20",
  white:"#FFFFFF", muted:"#A89F7A", border:"#D9D3B8",
  gray:"#F4F3EE", green:"#16A34A", red:"#DC2626",
};
const fmt = v => v.toLocaleString("pt-BR",{ style:"currency", currency:"BRL" });
const BASE = import.meta.env.VITE_SUPABASE_URL;

function Logo({ size=1 }) {
  return (
    <a href="/" style={{ textDecoration:"none", display:"flex", alignItems:"flex-end", gap:2 }}>
      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:26*size, fontWeight:800, color:C.navy, letterSpacing:"0.02em", lineHeight:1 }}>NANDY</span>
      <span style={{ fontFamily:"'Caveat',cursive", fontSize:28*size, color:C.orange, lineHeight:1, marginBottom:2*size }}>Govi</span>
    </a>
  );
}

function QRCodePlaceholder() {
  const cells = Array.from({length:21}, (_,row) =>
    Array.from({length:21}, (_,col) => {
      const corner = (row<7&&col<7)||(row<7&&col>13)||(row>13&&col<7);
      const inner  = (row>=2&&row<=4&&col>=2&&col<=4)||(row>=2&&row<=4&&col>=16&&col<=18)||(row>=16&&row<=18&&col>=2&&col<=4);
      return corner||inner||(Math.random()>0.5&&!corner);
    })
  );
  return (
    <svg viewBox="0 0 21 21" width={180} height={180} style={{ display:"block", margin:"auto" }}>
      {cells.map((row, r) => row.map((filled, c) => filled ? (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#1B2E4B"/>
      ) : null))}
    </svg>
  );
}

export default function PagamentoPix({ pedido, onVoltar, onPago }) {
  const [copiado,  setCopiado]  = useState(false);
  const [status,   setStatus]   = useState("pendente");
  const [segundos, setSegundos] = useState(30 * 60);

  useEffect(() => {
    if (status !== "pendente") return;
    const id = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { setStatus("expirado"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "pendente" || !pedido?.pedido_id) return;
    const token = localStorage.getItem("ng_token");
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/pagamento/status/${pedido.pedido_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const d = await r.json();
        if (d.status === "aprovado") {
          setStatus("confirmado");
          setTimeout(() => onPago?.(), 2000);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(id);
  }, [status, pedido]);

  function copiarChave() {
    const chave = pedido?.chavePix || "00020126580014br.gov.bcb.pix0136CHAVE-PIX-AQUI5204000053039865406140.005802BR5913NandyGovi6008Brasilia62070503***6304ABCD";
    navigator.clipboard.writeText(chave).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  const mins = String(Math.floor(segundos / 60)).padStart(2, "0");
  const secs = String(segundos % 60).padStart(2, "0");

  if (status === "confirmado") return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, maxWidth:440, width:"100%", padding:40, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,.1)" }}>
        <div style={{ width:72, height:72, background:"#D1FAE5", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 20px" }}>✅</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy, marginBottom:8 }}>Pagamento confirmado!</h2>
        <p style={{ fontSize:14, color:C.muted, marginBottom:8 }}>Pedido <strong style={{ color:C.navy }}>{pedido?.numero}</strong></p>
        <p style={{ fontSize:13, color:C.muted, marginBottom:28 }}>Você receberá um e-mail com os detalhes e rastreio quando enviarmos.</p>
        <button onClick={onPago} style={{ background:C.orange, color:"#fff", border:"none", padding:"14px 32px", fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", width:"100%" }}>
          Voltar à loja
        </button>
      </div>
    </div>
  );

  if (status === "expirado") return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, maxWidth:440, width:"100%", padding:40, textAlign:"center" }}>
        <div style={{ fontSize:56, marginBottom:16 }}>⏰</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.navy, marginBottom:8 }}>QR Code expirado</h2>
        <p style={{ fontSize:13, color:C.muted, marginBottom:24 }}>O tempo de 30 minutos expirou. Volte ao carrinho para gerar um novo Pix.</p>
        <button onClick={onVoltar} style={{ background:C.orange, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer", width:"100%" }}>
          Gerar novo Pix
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.gray, minHeight:"100vh" }}>
      <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 20px" }}>
        <div style={{ maxWidth:840, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
          <Logo size={0.9}/>
          <div style={{ fontSize:12, color:C.muted }}>Pedido {pedido?.numero || "—"}</div>
        </div>
      </header>

      <div style={{ maxWidth:840, margin:"0 auto", padding:"clamp(20px,4vw,40px) 20px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr clamp(240px,38%,320px)", gap:20, alignItems:"start" }}>

          <div style={{ background:C.white, border:`1px solid ${C.border}`, overflow:"hidden" }}>
            <div style={{ background:C.navy, padding:"20px 24px", textAlign:"center" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontSize:24 }}>⚡</span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:C.cream, letterSpacing:"0.06em" }}>PAGAR COM PIX</span>
              </div>
              <p style={{ fontSize:12, color:`${C.cream}88`, margin:0 }}>Escaneie o QR Code ou use a chave copia e cola</p>
            </div>

            <div style={{ padding:"clamp(20px,4vw,32px)", textAlign:"center" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:20 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.orange, animation:"pulse 1.5s infinite" }}/>
                <span style={{ fontSize:13, color:C.muted }}>Expira em </span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:segundos<120?C.red:C.navy }}>
                  {mins}:{secs}
                </span>
              </div>

              <div style={{ width:200, height:200, margin:"0 auto 20px", background:C.white, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {pedido?.qrcode
                  ? <img src={`data:image/png;base64,${pedido.qrcode}`} alt="QR Code Pix" style={{ width:"100%", height:"100%" }}/>
                  : <QRCodePlaceholder />
                }
              </div>

              <p style={{ fontSize:12, color:C.muted, marginBottom:16 }}>
                Abra o app do seu banco, vá em <strong>Pix</strong> e escaneie o código acima
              </p>

              <div style={{ border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:16 }}>
                <div style={{ background:C.gray, padding:"8px 14px", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"left" }}>
                  Chave Pix Copia e Cola
                </div>
                <div style={{ padding:"10px 14px", fontSize:11, color:C.muted, fontFamily:"monospace", wordBreak:"break-all", textAlign:"left", maxHeight:60, overflow:"hidden" }}>
                  {pedido?.chavePix || "00020126580014br.gov.bcb.pix0136..."}
                </div>
                <button onClick={copiarChave}
                  style={{ width:"100%", background:copiado?C.green:C.navy, color:"#fff", border:"none", padding:"12px", fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.08em", cursor:"pointer", transition:"background .2s" }}>
                  {copiado ? "✅ Chave copiada!" : "📋 Copiar chave Pix"}
                </button>
              </div>

              <div style={{ background:C.gray, border:`1px solid ${C.border}`, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <span style={{ fontSize:13, color:C.muted }}>Valor a pagar</span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy }}>{fmt(pedido?.total || 0)}</span>
              </div>

              <p style={{ fontSize:11, color:C.muted }}>
                ✅ Aprovação automática em segundos<br/>
                🔒 Pagamento 100% seguro via Banco Central
              </p>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:C.white, border:`1px solid ${C.border}`, padding:20 }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:14, marginTop:0 }}>Como pagar</h3>
              {[
                { n:1, t:"Abra o app do banco",      d:"Vá na seção Pix do seu banco ou carteira digital." },
                { n:2, t:"Escaneie ou cole a chave", d:"Use a câmera para o QR Code ou cole a chave copiada." },
                { n:3, t:"Confirme o pagamento",     d:"Verifique os dados e confirme. Aprovação em segundos." },
                { n:4, t:"Pedido confirmado!",        d:"Você receberá a confirmação por e-mail automaticamente." },
              ].map(s => (
                <div key={s.n} style={{ display:"flex", gap:12, marginBottom:14 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:C.orange, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>{s.n}</div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:C.navy, margin:"0 0 2px" }}>{s.t}</p>
                    <p style={{ fontSize:12, color:C.muted, margin:0 }}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:C.white, border:`1px solid ${C.border}`, padding:20 }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.navy, marginBottom:14, marginTop:0 }}>Resumo</h3>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:C.muted }}>Pedido</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.navy }}>{pedido?.numero || "—"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:C.muted }}>Total</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.navy }}>{fmt(pedido?.total || 0)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:C.muted }}>Status</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.orange }}>⏳ Aguardando Pix</span>
              </div>
            </div>

            <div style={{ background:C.white, border:`1px solid ${C.border}`, padding:16 }}>
              <p style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Pague com qualquer banco</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {["Nubank","Bradesco","Itaú","BB","Caixa","PicPay","Inter","Santander"].map(b => (
                  <span key={b} style={{ fontSize:10, background:C.gray, color:C.muted, padding:"4px 10px", borderRadius:20, fontWeight:600 }}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} } @media(max-width:640px){ div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

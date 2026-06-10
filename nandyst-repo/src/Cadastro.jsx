import { useState } from "react";
import { supabase } from "./utils/supabase";

const C = { cream:"#EDE8C8", navy:"#1B2E4B", orange:"#E07A20", muted:"#8A97A8", border:"#D9D3B8" };

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2 }}>
      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:C.navy, lineHeight:1 }}>NANDY</span>
      <span style={{ fontFamily:"'Caveat',cursive", fontSize:26, color:C.orange, lineHeight:1, marginBottom:2 }}>Govi</span>
    </div>
  );
}

export default function Cadastro({ onCadastro }) {
  const [modo,  setModo]  = useState("login"); // login | cadastro | reset
  const [nome,  setNome]  = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg,   setMsg]   = useState({ texto:"", tipo:"" });
  const [load,  setLoad]  = useState(false);

  const inp = {
    width:"100%", border:`1px solid ${C.border}`, padding:"11px 14px",
    fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none",
    boxSizing:"border-box", color:C.navy,
  };
  const lbl = {
    display:"block", fontSize:11, fontWeight:700, color:C.muted,
    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5,
  };

  async function handleLogin(e) {
    e.preventDefault();
    setLoad(true); setMsg({ texto:"", tipo:"" });
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) { setMsg({ texto:"E-mail ou senha incorretos.", tipo:"erro" }); }
    else       { onCadastro?.(); }
    setLoad(false);
  }

  async function handleCadastro(e) {
    e.preventDefault();
    if (!nome.trim()) { setMsg({ texto:"Informe seu nome.", tipo:"erro" }); return; }
    setLoad(true); setMsg({ texto:"", tipo:"" });
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) { setMsg({ texto: error.message, tipo:"erro" }); }
    else       { setMsg({ texto:"Conta criada! Verifique seu e-mail.", tipo:"ok" }); }
    setLoad(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoad(true); setMsg({ texto:"", tipo:"" });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    if (error) { setMsg({ texto: error.message, tipo:"erro" }); }
    else       { setMsg({ texto:"E-mail de recuperação enviado!", tipo:"ok" }); }
    setLoad(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <div style={{ background:"#fff", padding:"clamp(28px,5vw,40px)", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Logo/>
          <p style={{ fontSize:12, color:C.muted, marginTop:8, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            {modo === "login"    ? "Entrar na conta" :
             modo === "cadastro" ? "Criar conta"     : "Recuperar senha"}
          </p>
        </div>

        {msg.texto && (
          <div style={{ padding:"10px 14px", marginBottom:16, fontSize:13, borderRadius:2,
            background: msg.tipo==="erro" ? "#FEE2E2" : "#D1FAE5",
            color:      msg.tipo==="erro" ? "#DC2626" : "#065F46",
            border:     `1px solid ${msg.tipo==="erro" ? "#FCA5A5" : "#6EE7B7"}` }}>
            {msg.tipo==="erro" ? "❌" : "✅"} {msg.texto}
          </div>
        )}

        <form onSubmit={modo==="login" ? handleLogin : modo==="cadastro" ? handleCadastro : handleReset}>
          {modo === "cadastro" && (
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Nome *</label>
              <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome" autoFocus style={inp}/>
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>E-mail *</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" required style={inp}/>
          </div>
          {modo !== "reset" && (
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Senha *</label>
              <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••" required minLength={6} style={inp}/>
            </div>
          )}

          <button type="submit" disabled={load}
            style={{ width:"100%", background:C.navy, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, letterSpacing:"0.06em", cursor:load?"not-allowed":"pointer", opacity:load?0.7:1 }}>
            {load ? "Aguarde..." :
             modo==="login"    ? "Entrar" :
             modo==="cadastro" ? "Criar conta" : "Enviar e-mail"}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:"center", fontSize:13, color:C.muted }}>
          {modo === "login" && <>
            <button onClick={()=>setModo("cadastro")} style={{ background:"none", border:"none", color:C.orange, cursor:"pointer", fontWeight:600 }}>Criar conta</button>
            {" · "}
            <button onClick={()=>setModo("reset")} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer" }}>Esqueci a senha</button>
          </>}
          {modo !== "login" && (
            <button onClick={()=>setModo("login")} style={{ background:"none", border:"none", color:C.orange, cursor:"pointer", fontWeight:600 }}>
              ← Voltar para login
            </button>
          )}
        </div>

        <button onClick={()=>window.history.back()} style={{ display:"block", margin:"16px auto 0", background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>
          Continuar sem conta
        </button>
      </div>
    </div>
  );
}

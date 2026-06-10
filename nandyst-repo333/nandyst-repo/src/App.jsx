import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import NandyGovi from "./NandyGovi";
import Checkout from "./Checkout";
import PagamentoPix from "./PagamentoPix";
import Cadastro from "./Cadastro";

/* ── roteamento simples ──────────────────────────────────────── */
function getRota() { return window.location.pathname || "/"; }
function pushRota(r) {
  window.history.pushState({}, "", r);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/* ── LOGIN ADMIN ────────────────────────────────────────────── */
const C = { navy:"#1B2E4B", orange:"#E07A20" };

function LoginAdmin({ onLoginOk }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro,  setErro]  = useState("");
  const [load,  setLoad]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErro(""); setLoad(true);
    try {
      // Verifica credenciais direto no banco via RPC
      const { data, error } = await supabase.rpc("verificar_admin", {
        p_email: email,
        p_senha: senha,
      });
      if (error || !data) {
        setErro("E-mail ou senha incorretos.");
        return;
      }
      // Salva sessão admin no localStorage
      localStorage.setItem("ng_admin", JSON.stringify({ email, nome: data.nome, role: "admin" }));
      onLoginOk();
    } catch {
      setErro("E-mail ou senha incorretos.");
    } finally {
      setLoad(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <div style={{ background:"#fff", padding:40, width:"100%", maxWidth:380, boxShadow:"0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.navy }}>NANDY</span>
          <span style={{ fontFamily:"'Caveat',cursive", fontSize:24, color:C.orange }}> Govi</span>
          <p style={{ fontSize:11, color:"#8A97A8", marginTop:6, letterSpacing:"0.1em", textTransform:"uppercase" }}>Painel Administrativo</p>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8A97A8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
              style={{ width:"100%", border:"1px solid #ddd", padding:"11px 14px", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8A97A8", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>Senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required
              style={{ width:"100%", border:"1px solid #ddd", padding:"11px 14px", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>
          {erro && <div style={{ background:"#FEE2E2", border:"1px solid #FCA5A5", padding:"10px 14px", marginBottom:14, fontSize:13, color:"#DC2626" }}>🔒 {erro}</div>}
          <button type="submit" disabled={load}
            style={{ width:"100%", background:C.navy, color:"#fff", border:"none", padding:14, fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, cursor:load?"not-allowed":"pointer", marginTop:10, opacity:load?0.7:1 }}>
            {load ? "Verificando..." : "Entrar no painel"}
          </button>
        </form>
        <p style={{ textAlign:"center", fontSize:11, color:"#D1D5DB", marginTop:20 }}>Acesso restrito — somente administradores</p>
      </div>
    </div>
  );
}

/* ── GUARDA DO PAINEL ADMIN ─────────────────────────────────── */
function RotaAdmin() {
  const [pronto,     setPronto]     = useState(false);
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [AdminPanel, setAdminPanel] = useState(null);

  useEffect(() => {
    const admin = localStorage.getItem("ng_admin");
    if (admin) {
      try {
        const u = JSON.parse(admin);
        if (u.role === "admin") {
          setIsAdmin(true);
          import("./AdminPanel").then(m => setAdminPanel(() => m.default));
        }
      } catch {}
    }
    setPronto(true);
  }, []);

  if (!pronto) return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'DM Sans',sans-serif" }}>
      Verificando acesso...
    </div>
  );

  if (!isAdmin) return <LoginAdmin onLoginOk={() => window.location.reload()} />;

  if (!AdminPanel) return (
    <div style={{ minHeight:"100vh", background:C.navy, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
      Carregando painel...
    </div>
  );

  return <AdminPanel onLogout={() => {
    localStorage.removeItem("ng_admin");
    window.location.href = "/";
  }}/>;
}

/* ── APP ROOT ────────────────────────────────────────────────── */
export default function App() {
  const [rota,   setRota]   = useState(getRota());
  const [cart,   setCart]   = useState([]);
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    const onPop = () => setRota(getRota());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navegar(r) { setRota(r); pushRota(r); window.scrollTo(0, 0); }

  if (rota.startsWith("/ng-painel")) return <RotaAdmin />;

  if (rota === "/cadastro") return <Cadastro onCadastro={() => navegar("/")} />;

  if (rota === "/checkout") {
    if (!cart.length) { navegar("/"); return null; }
    return (
      <Checkout
        cart={cart}
        onVoltar={() => navegar("/")}
        onIrPix={(ped) => { setPedido(ped); navegar("/pix"); }}
      />
    );
  }

  if (rota === "/pix") {
    if (!pedido) { navegar("/"); return null; }
    return (
      <PagamentoPix
        pedido={pedido}
        onVoltar={() => navegar("/checkout")}
        onPago={() => { setCart([]); setPedido(null); navegar("/"); }}
      />
    );
  }

  return (
    <NandyGovi
      onCheckout={(cartItems) => { setCart(cartItems); navegar("/checkout"); }}
      onIrCadastro={() => navegar("/cadastro")}
    />
  );
}

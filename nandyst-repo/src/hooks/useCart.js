import { useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

export function useCart() {
  const [cart,    setCart]    = useState([]);
  const [loading, setLoading] = useState(false);

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.preco * c.qty, 0);

  const addItem = useCallback((produto, opc, tam) => {
    const key   = `${produto.id}-${opc.id}-${tam.id}`;
    const preco = +(produto.preco_base || produto.preco || 0)
                + +(opc.preco_extra   || opc.extra     || 0)
                + +(tam.preco_extra   || tam.extra      || 0);
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) return prev.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { key, produto, opc, tam, preco, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback(key => setCart(p => p.filter(c => c.key !== key)), []);
  const clearCart  = useCallback(() => setCart([]), []);
  const changeQty  = useCallback((key, d) => {
    setCart(prev =>
      prev.map(c => c.key === key ? { ...c, qty: Math.max(0, c.qty + d) } : c)
          .filter(c => c.qty > 0)
    );
  }, []);

  /* ── Criar pedido direto no Supabase ────────────────────────── */
  const criarPedido = useCallback(async ({ endereco, frete, cupom_codigo }) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Chama a Edge Function que cria o pedido + envia email
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-pedido`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            itens: cart.map(c => ({
              produto_id:    c.produto.id,
              tamanho_id:    c.tam.id,
              acabamento_id: c.opc.id,
              quantidade:    c.qty,
              preco_unit:    c.preco,
            })),
            endereco,
            frete,
            cupom_codigo: cupom_codigo || null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.erro || "Erro ao criar pedido");
      }
      return res.json(); // { pedido_id, numero, total, chavePix, qrcode }
    } finally {
      setLoading(false);
    }
  }, [cart]);

  /* ── Verificar status do pagamento ──────────────────────────── */
  const verificarPagamento = useCallback(async pedido_id => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("status_pagamento")
      .eq("id", pedido_id)
      .single();
    if (error) throw error;
    return { status: data.status_pagamento };
  }, []);

  return {
    cart, cartCount, cartTotal,
    addItem, removeItem, changeQty, clearCart,
    criarPedido, verificarPagamento,
    loading,
  };
}

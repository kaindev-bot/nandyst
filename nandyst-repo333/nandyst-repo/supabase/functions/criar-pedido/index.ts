// Edge Function: criar-pedido
// Roda no Supabase, substitui POST /api/pedidos do backend Node

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase admin client (acesso total)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Supabase client com token do usuário (para RLS)
    const authHeader = req.headers.get("Authorization");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    // Verificar usuário logado
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ erro: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { itens, endereco, frete, cupom_codigo } = await req.json();

    if (!itens?.length) {
      return new Response(
        JSON.stringify({ erro: "Carrinho vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados do usuário na tabela usuarios
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id, nome, email")
      .eq("auth_id", user.id)
      .single();

    if (!usuario) {
      return new Response(
        JSON.stringify({ erro: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcular total dos itens
    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const { data: produto } = await supabaseAdmin
        .from("produtos")
        .select("id, titulo, preco_base")
        .eq("id", item.produto_id)
        .eq("ativo", true)
        .single();

      const { data: tamanho } = await supabaseAdmin
        .from("tamanhos")
        .select("id, descricao, preco_extra")
        .eq("id", item.tamanho_id)
        .single();

      const { data: acabamento } = await supabaseAdmin
        .from("acabamentos")
        .select("id, nome, preco_extra")
        .eq("id", item.acabamento_id)
        .single();

      if (!produto || !tamanho || !acabamento) continue;

      const preco_unit = (produto.preco_base || 0) + (tamanho.preco_extra || 0) + (acabamento.preco_extra || 0);
      subtotal += preco_unit * item.quantidade;

      itensProcessados.push({
        produto_id:    produto.id,
        tamanho_id:    tamanho.id,
        acabamento_id: acabamento.id,
        quantidade:    item.quantidade,
        preco_unit,
        nome_produto:  produto.titulo,
      });
    }

    // Desconto de cupom (se houver)
    let desconto = 0;
    if (cupom_codigo) {
      const { data: cupom } = await supabaseAdmin
        .from("cupons")
        .select("*")
        .eq("codigo", cupom_codigo.toUpperCase())
        .eq("ativo", true)
        .single();
      if (cupom) {
        desconto = cupom.tipo === "percentual"
          ? subtotal * (cupom.valor / 100)
          : cupom.valor;
      }
    }

    const total = subtotal - desconto + (frete || 0);

    // Gerar número do pedido
    const numero = `NG${Date.now().toString().slice(-8)}`;

    // Inserir pedido
    const { data: pedido, error: pedidoErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        usuario_id: usuario.id,
        numero,
        subtotal,
        desconto,
        frete: frete || 0,
        total,
        status: "aguardando_pagamento",
        status_pagamento: "pendente",
        endereco_json: endereco,
      })
      .select()
      .single();

    if (pedidoErr) throw pedidoErr;

    // Inserir itens do pedido
    const { error: itensErr } = await supabaseAdmin
      .from("pedido_itens")
      .insert(itensProcessados.map(i => ({ ...i, pedido_id: pedido.id })));

    if (itensErr) throw itensErr;

    // Gerar Pix simulado (substituir por Mercado Pago depois)
    const chavePix = `00020126580014br.gov.bcb.pix0136${pedido.id}5204000053039865406${total.toFixed(2)}5802BR5913NandyGovi6008Brasilia62070503***6304ABCD`;

    // Atualizar pedido com chave Pix
    await supabaseAdmin
      .from("pedidos")
      .update({ chave_pix: chavePix })
      .eq("id", pedido.id);

    // Disparar email de confirmação (chama outra Edge Function)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Nandy Govi <pedidos@nandygovi.com.br>",
          to: [usuario.email],
          subject: `Pedido ${numero} recebido! ✅`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#1B2E4B">Olá, ${usuario.nome}!</h2>
              <p>Seu pedido <strong>${numero}</strong> foi recebido com sucesso.</p>
              <p>Total: <strong>R$ ${total.toFixed(2).replace(".", ",")}</strong></p>
              <p>Faça o pagamento via Pix para confirmar seu pedido.</p>
              <hr/>
              <p style="color:#888;font-size:12px">Nandy Govi — Arte que transforma espaços</p>
            </div>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        pedido_id: pedido.id,
        numero,
        total,
        chavePix,
        qrcode: null, // virá do Mercado Pago depois
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("criar-pedido error:", err);
    return new Response(
      JSON.stringify({ erro: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

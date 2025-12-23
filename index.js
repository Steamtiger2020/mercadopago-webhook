const express = require("express");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); // Caso precise no Node antigo, ou nativo no Node 18+

console.log("🚀 Iniciando servidor...");

const app = express();
app.use(express.json());

// 🔎 Verificar variável de ambiente
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON NÃO EXISTE");
  process.exit(1);
}

if (!process.env.MP_ACCESS_TOKEN) {
  console.error("❌ MP_ACCESS_TOKEN NÃO EXISTE");
  process.exit(1);
}

console.log("✅ Variáveis de ambiente encontradas");

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  console.log("✅ JSON do Firebase parseado com sucesso");
} catch (err) {
  console.error("❌ Erro ao fazer JSON.parse:", err);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase inicializado");
} catch (err) {
  console.error("❌ Erro ao inicializar Firebase:", err);
  process.exit(1);
}

const db = admin.firestore();

app.get("/", (req, res) => {
  res.send("Servidor Mercado Pago OK 🚀");
});

// ===============================
// 🔗 ROTA: CRIAR PAGAMENTO (Checkout)
// ===============================
app.post("/create-checkout", async (req, res) => {
  console.log("💳 Recebendo pedido de checkout:", req.body);

  const { userId, email } = req.body;

  if (!userId) {
    console.error("❌ Erro: userId não fornecido");
    return res.status(400).json({ error: "userId é obrigatório" });
  }

  try {
    const preferenceData = {
      items: [
        {
          title: "DietApp Premium (Acesso Vitalício)",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 9.90,
        },
      ],
      payer: {
        email: email || "cliente@dietapp.com",
      },
      metadata: {
        user_id: userId, // 👈 O ID VAI AQUI
      },
      back_urls: {
        success: "https://www.google.com", // Pode trocar por um deep link do app se quiser
        failure: "https://www.google.com",
        pending: "https://www.google.com",
      },
      auto_return: "approved",
    };

    // Chamada direta à API do Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    const data = await response.json();

    if (!response.ok) {
  console.error("❌ Erro no Mercado Pago (detalhado):", data);

  return res.status(500).json({
    error: "Erro ao criar preferência no MP",
    details: data
  });
}

    console.log("✅ Link de pagamento gerado:", data.init_point);
    
    // Retorna o link para o aplicativo abrir
    res.json({ url: data.init_point });

  } catch (error) {
    console.error("❌ Erro interno ao criar checkout:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ===============================
// 🔔 ROTA: WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  // console.log("🔔 Webhook recebido:", JSON.stringify(req.body, null, 2)); // Debug completo se precisar

  try {
    // Verifica se é uma notificação de pagamento
    const paymentId = req.body?.data?.id;
    const type = req.body?.type;

    if (type !== "payment" || !paymentId) {
      // Ignora outros tipos de notificação para não poluir o log
      return res.sendStatus(200);
    }

    console.log(`🔎 Verificando pagamento ID: ${paymentId}...`);

    // Buscar dados do pagamento no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
      }
    );

    const payment = await mpResponse.json();

    console.log(`💰 Status: ${payment.status} | ID: ${payment.id}`);

    if (payment.status === "approved") {
      const userId = payment.metadata.user_id;

      if (!userId) {
        console.log("⚠️ AVISO: Pagamento aprovado mas SEM user_id no metadata.");
        return res.sendStatus(200);
      }

      console.log(`🔓 Liberando Premium para usuário: ${userId}`);

      // Atualiza usuário no Firebase
      await db.collection("users").doc(userId).update({
        isPremium: true,
        premiumSince: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Sucesso! Usuário atualizado no Firestore.");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro crítico no webhook:", error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

const express = require("express");
const admin = require("firebase-admin");

console.log("🚀 Iniciando servidor...");

const app = express();
app.use(express.json());

// 🔎 Verificar variável de ambiente
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON NÃO EXISTE");
  process.exit(1);
}

console.log("✅ Variável FIREBASE_SERVICE_ACCOUNT_JSON encontrada");

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

const PORT = process.env.PORT || 3000;
// ===============================
// Webhook Mercado Pago
// ===============================
app.post("/webhook", async (req, res) => {
  console.log("🔔 Webhook recebido:", req.body);

  try {
    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      console.log("⚠️ Webhook sem payment ID");
      return res.sendStatus(200);
    }

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

    console.log("💰 Status do pagamento:", payment.status);

    if (payment.status === "approved") {
      const userId = payment.metadata.user_id;

      if (!userId) {
        console.log("⚠️ Pagamento sem user_id");
        return res.sendStatus(200);
      }

      // Atualiza usuário no Firebase
      await db.collection("users").doc(userId).update({
        isPremium: true,
        premiumSince: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ Usuário liberado Premium:", userId);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

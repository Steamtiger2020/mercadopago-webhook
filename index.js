const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "SEU_PROJECT_ID",
    clientEmail: "SEU_CLIENT_EMAIL",
    privateKey: "SUA_PRIVATE_KEY".replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

// 🔔 Webhook Mercado Pago
app.post("/webhook", async (req, res) => {
  try {
    const payment = req.body;

    if (payment.type === "payment") {
      const userId = payment.data.external_reference;

      await db.collection("users").doc(userId).update({
        isPremium: true,
      });

      console.log("Usuário liberado:", userId);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => {
  res.send("Servidor Mercado Pago OK 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando"));

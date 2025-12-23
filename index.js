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

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});

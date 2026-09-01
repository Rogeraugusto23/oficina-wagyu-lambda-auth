const sql = require("mssql");
const jwt = require("jsonwebtoken");

// Configuração do banco (RDS), lida de variáveis de ambiente da Lambda.
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

let pool; // reaproveita a conexão entre invocações "quentes" da Lambda

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
}

// Validação de CPF (dígitos verificadores) — mesma regra usada no
// Domain/ValueObjects/Cpf.cs da aplicação principal, replicada aqui porque
// esta Lambda vive em um repositório/runtime separado.
function cpfValido(cpf) {
  cpf = (cpf || "").replace(/[^\d]/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.substring(0, 9), 10);
  const digito2 = calcularDigito(cpf.substring(0, 10), 11);

  return digito1 === parseInt(cpf[9], 10) && digito2 === parseInt(cpf[10], 10);
}

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const cpf = (body.cpf || "").replace(/[^\d]/g, "");

    if (!cpfValido(cpf)) {
      return resposta(400, { erro: "CPF inválido." });
    }

    const conexao = await getPool();
    // ⚠️ Depende de duas colunas na tabela Clientes:
    // - "Documento" (já existe — CPF/CNPJ sem máscara)
    // - "Ativo" (a ser adicionada via migration no repositório da aplicação
    //   principal; até lá, a Lambda assume Ativo = 1 se a coluna não existir)
    const resultado = await conexao
      .request()
      .input("documento", sql.VarChar, cpf)
      .query("SELECT TOP 1 Id, Nome, Ativo FROM Clientes WHERE Documento = @documento");

    if (resultado.recordset.length === 0) {
      return resposta(404, { erro: "Cliente não encontrado para o CPF informado." });
    }

    const cliente = resultado.recordset[0];

    if (cliente.Ativo === false) {
      return resposta(403, { erro: "Cliente inativo. Acesso não autorizado." });
    }

    const token = jwt.sign(
      {
        sub: cliente.Id,
        cpf,
        nome: cliente.Nome,
        tipo: "cliente-cpf",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return resposta(200, {
      token,
      expiraEm: JWT_EXPIRES_IN,
      cliente: { id: cliente.Id, nome: cliente.Nome },
    });
  } catch (erro) {
    console.error("Erro na autenticação via CPF:", erro);
    return resposta(500, { erro: "Erro interno ao processar autenticação." });
  }
};

function resposta(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

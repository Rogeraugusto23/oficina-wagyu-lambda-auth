// Prepara a pasta build/ com o código-fonte da Lambda, para em seguida
// rodar `npm install --production` e empacotar em zip.
// Usa a API de arquivos do Node.js (fs) em vez de comandos de shell
// (rm/mkdir/cp), porque esses comandos não existem no cmd.exe do Windows —
// isso mantém o script funcionando igual no Windows (terraform apply local)
// e no Linux (pipeline de CI/CD rodando em runner ubuntu-latest).
const fs = require("fs");

fs.rmSync("build", { recursive: true, force: true });
fs.mkdirSync("build");
fs.cpSync("src", "build/src", { recursive: true });
fs.copyFileSync("package.json", "build/package.json");

console.log("Pasta build/ preparada com sucesso.");

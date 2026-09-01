# oficina-wagyu-lambda-auth

Function Serverless de autenticação via CPF — Tech Challenge Fase 3.

## O que faz

`POST /auth/cpf` com `{ "cpf": "12345678900" }`:

1. Valida o CPF (dígitos verificadores)
2. Consulta a existência e o status (`Ativo`) do cliente no RDS
3. Se válido e ativo, gera e devolve um **JWT** assinado com um segredo
   compartilhado (`JWT_SECRET`), consumível pelas APIs protegidas da
   aplicação principal

## Tecnologias

- Node.js 20.x (AWS Lambda)
- `mssql` (driver puro JS, sem dependências nativas — ideal para rodar em
  Lambda sem precisar de layers)
- `jsonwebtoken`
- API Gateway HTTP API (mais simples e barato que REST API para este caso)
- Terraform para provisionamento

## Pré-requisitos

- O repositório `oficina-wagyu-infra-database` já provisionado (precisamos
  do endereço do RDS)
- Node.js e npm instalados localmente (para o Terraform rodar `npm install`
  ao empacotar a Lambda)
- Terraform >= 1.6
- Credenciais AWS configuradas

## Como provisionar

```bash
cp example.tfvars terraform.tfvars
# preencha db_server, db_password, jwt_secret e lab_role_arn

terraform init
terraform plan
terraform apply
```

## Depois de provisionado

```bash
terraform output auth_endpoint
```

Teste:
```bash
curl -X POST "$(terraform output -raw auth_endpoint)" \
  -H "Content-Type: application/json" \
  -d '{"cpf": "12345678900"}'
```

## ⚠️ Dependência pendente na aplicação principal

Esta Lambda espera duas colunas na tabela `Clientes`:
- `Documento` (já existe)
- `Ativo` (bit/boolean — **ainda precisa ser adicionada** via migration no
  repositório `OficinaMecanicaWagyu`, junto com a lógica de negócio de
  ativar/inativar cliente)

Até essa coluna existir, ajuste a query em `src/index.js` ou trate a ausência
da coluna como "sempre ativo" no código da aplicação.

## Integração com a aplicação principal

O `Jwt__Secret` configurado no Secret do Kubernetes (repositório
`oficina-wagyu-infra-k8s`) deve ser **exatamente o mesmo** valor de
`jwt_secret` usado aqui, para que o token emitido pela Lambda seja aceito
pela aplicação.

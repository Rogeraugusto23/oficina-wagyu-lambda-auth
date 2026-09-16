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
- `mssql` (driver puro JS, sem dependências nativas)
- `jsonwebtoken`
- API Gateway HTTP API
- Terraform para provisionamento

## Pré-requisitos

- O repositório `oficina-wagyu-infra-database` já provisionado
- Node.js e npm instalados localmente
- Terraform >= 1.6
- Credenciais AWS configuradas

## Como provisionar

```bash
cp example.tfvars terraform.tfvars
terraform init
terraform plan
terraform apply
```

## ✅ Coluna `Ativo` — resolvido

Esta Lambda consulta duas colunas na tabela `Clientes`:
- `Documento` (já existia desde a Fase 1)
- `Ativo` (adicionada via migration `AddClienteAtivo` no repositório `OficinaMecanicaWagyu`, junto com os endpoints `POST /api/Clientes/{id}/inativar` e `/reativar`)

Testado e confirmado em produção: cliente ativo autentica normalmente; cliente inativado retorna `403 Forbidden`.

## Integração com a aplicação principal

O `Jwt__Secret` configurado no Secret do Kubernetes deve ser exatamente o mesmo valor de `jwt_secret` usado aqui.

## ✅ Status: testado e validado em produção

- **Endpoint real:** `https://4ty9529fpe.execute-api.us-east-1.amazonaws.com/auth/cpf`
- Testado com sucesso: CPF válido de cliente ativo → token JWT emitido e aceito pela aplicação principal (rota protegida `GET /api/OrdensServico` retornou 200 OK usando o token da Lambda).
- Fluxo completo confirmado: Cliente → API Gateway → Lambda → RDS → JWT → API protegida.

⚠️ Se os recursos AWS forem destruídos/recriados, reaplique este repositório e atualize o endpoint acima.

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

## ✅ Coluna `Ativo` — resolvido

Esta Lambda consulta duas colunas na tabela `Clientes`:
- `Documento` (já existia desde a Fase 1)
- `Ativo` (bit/boolean — adicionada via migration `AddClienteAtivo` no
  repositório `OficinaMecanicaWagyu` especificamente para suportar esta
  Lambda, junto com os endpoints `POST /api/Clientes/{id}/inativar` e
  `/reativar`)

Testado e confirmado em produção: um cliente cadastrado como ativo é
autenticado normalmente; um cliente inativado retorna `403 Forbidden`,
mesmo com CPF válido e cadastrado.

## Integração com a aplicação principal

O `Jwt__Secret` configurado no Secret do Kubernetes (repositório
`oficina-wagyu-infra-k8s`) deve ser **exatamente o mesmo** valor de
`jwt_secret` usado aqui, para que o token emitido pela Lambda seja aceito
pela aplicação.


## ✅ Status: testado e validado em produção

- **Endpoint real:** `https://4ty9529fpe.execute-api.us-east-1.amazonaws.com/auth/cpf`
- Testado com sucesso: CPF válido de cliente ativo → token JWT emitido e
  **aceito pela aplicação principal** (rota protegida `GET /api/OrdensServico`
  retornou 200 OK usando o token da Lambda).
- Isso confirma o fluxo completo descrito no
  [Diagrama de Sequência](https://github.com/Rogeraugusto23/OficinaMecanicaWagyu/blob/main/docs/architecture/diagrama-sequencia.md)
  funcionando de ponta a ponta: Cliente → API Gateway → Lambda → RDS → JWT → API protegida.

⚠️ **Nota sobre reinicialização do ambiente:** como este ambiente roda sobre
o AWS Academy Learner Lab, o endpoint acima pode parar de responder se os
recursos forem destruídos/recriados entre sessões (`terraform destroy` /
`apply`). Nesse caso, reaplique este repositório e o de banco de dados, e
atualize a documentação com o novo endpoint gerado.


## ✅ Status: testado e validado em produção

- **Cluster ativo, testado com sucesso:**
  - API rodando e acessível: `http://54.236.48.235:30080/swagger`
  - Healthcheck: `http://54.236.48.235:30080/health`
  - 2 pods em `Running`, conectados ao RDS gerenciado
- **Deploy automático testado**: pipeline de CI/CD do repositório da
  aplicação (`OficinaMecanicaWagyu`) conecta via SSH nesta EC2 e atualiza
  os pods automaticamente a cada push — sem runner self-hosted.

⚠️ **Nota sobre o IP público:** o IP acima pode mudar se a instância EC2 for
reiniciada (não é um Elastic IP fixo). Se isso acontecer:
1. Confirme o IP novo: `aws ec2 describe-instances --filters "Name=tag:Name,Values=oficina-wagyu-k3s-node" "Name=instance-state-name,Values=running" --query "Reservations[0].Instances[0].PublicIpAddress" --output text`
2. Atualize o secret `EC2_HOST` no repositório `OficinaMecanicaWagyu`
3. Se o `kubectl` local parar de responder, rebaixe o kubeconfig com o IP novo (ver comandos no início deste README)



## ✅ Status: testado e validado em produção

- **Endpoint real:** `https://4ty9529fpe.execute-api.us-east-1.amazonaws.com/auth/cpf`
- Testado com sucesso: CPF válido de cliente ativo → token JWT emitido e
  **aceito pela aplicação principal** (rota protegida `GET /api/OrdensServico`
  retornou 200 OK usando o token da Lambda).
- Isso confirma o fluxo completo descrito no
  [Diagrama de Sequência](https://github.com/Rogeraugusto23/OficinaMecanicaWagyu/blob/main/docs/architecture/diagrama-sequencia.md)
  funcionando de ponta a ponta: Cliente → API Gateway → Lambda → RDS → JWT → API protegida.

⚠️ **Nota sobre reinicialização do ambiente:** como este ambiente roda sobre
o AWS Academy Learner Lab, o endpoint acima pode parar de responder se os
recursos forem destruídos/recriados entre sessões (`terraform destroy` /
`apply`). Nesse caso, reaplique este repositório e o de banco de dados, e
atualize a documentação com o novo endpoint gerado.

# 1. Prepara uma pasta de build limpa com node_modules de produção,
#    sem incluir .git, .terraform, testes, etc. no pacote da Lambda.
#    Usa "node build.js" (script portátil) em vez de comandos de shell
#    Unix (rm/mkdir/cp), que não existem no cmd.exe do Windows.
resource "null_resource" "npm_install" {
  triggers = {
    package_json_hash = filesha256("${path.module}/package.json")
    index_js_hash      = filesha256("${path.module}/src/index.js")
  }

  provisioner "local-exec" {
    working_dir = path.module
    command     = "node build.js && cd build && npm install --production"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/build"
  output_path = "${path.module}/lambda-auth.zip"

  depends_on = [null_resource.npm_install]
}

resource "aws_lambda_function" "auth_cpf" {
  function_name = "oficina-wagyu-auth-cpf"
  role          = var.lab_role_arn
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      DB_SERVER       = var.db_server
      DB_NAME         = var.db_name
      DB_USER         = var.db_user
      DB_PASSWORD     = var.db_password
      JWT_SECRET      = var.jwt_secret
      JWT_EXPIRES_IN  = "1h"
    }
  }

  tags = {
    Projeto = "OficinaMecanicaWagyu"
  }
}

# 2. API Gateway (HTTP API — mais simples e barato que REST API para este caso)
resource "aws_apigatewayv2_api" "auth_api" {
  name          = "oficina-wagyu-auth-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "auth_lambda_integration" {
  api_id                 = aws_apigatewayv2_api.auth_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_cpf.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "auth_route" {
  api_id    = aws_apigatewayv2_api.auth_api.id
  route_key = "POST /auth/cpf"
  target    = "integrations/${aws_apigatewayv2_integration.auth_lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.auth_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_cpf.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.auth_api.execution_arn}/*/*"
}

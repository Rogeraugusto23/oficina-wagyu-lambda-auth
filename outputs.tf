output "auth_endpoint" {
  description = "URL pública do endpoint de autenticação via CPF"
  value       = "${aws_apigatewayv2_api.auth_api.api_endpoint}/auth/cpf"
}

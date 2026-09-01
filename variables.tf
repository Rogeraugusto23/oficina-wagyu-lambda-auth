variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "db_server" {
  description = "Host do RDS (output do repositório oficina-wagyu-infra-database)"
  type        = string
}

variable "db_name" {
  type    = string
  default = "OficinaMecanicaDB"
}

variable "db_user" {
  type    = string
  default = "admin_wagyu"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  description = "Segredo compartilhado usado para assinar/validar o JWT — deve ser o MESMO valor configurado no Secret Jwt__Secret do cluster K8s"
  type        = string
  sensitive   = true
}

variable "lab_role_arn" {
  description = "ARN da role de execução da Lambda. No AWS Academy Learner Lab, use a LabRole já existente (arn:aws:iam::<account-id>:role/LabRole). Em conta própria, crie uma role com AWSLambdaBasicExecutionRole."
  type        = string
}

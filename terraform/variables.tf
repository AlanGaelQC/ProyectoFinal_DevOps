variable "region" {
  description = "Región de AWS"
  type        = string
}

variable "ami_id" {
  description = "ID de la AMI a usar"
  type        = string
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
}

variable "key_name" {
  description = "Nombre del par de llaves EC2"
  type        = string
}

variable "db_username" {
  description = "Nombre de usuario para la base de datos"
  type        = string
}

variable "db_password" {
  description = "Contraseña para la base de datos"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Nombre de la base de datos"
  type        = string
}

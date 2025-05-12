provider "aws" {
  region = "us-east-1"
}

# Crear una VPC
resource "aws_vpc" "my_vpc" {
  cidr_block = "10.0.0.0/16"
}

# Crear un Internet Gateway
resource "aws_internet_gateway" "my_igw" {
  vpc_id = aws_vpc.my_vpc.id
}

# Crear una tabla de ruteo
resource "aws_route_table" "my_route_table" {
  vpc_id = aws_vpc.my_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.my_igw.id
  }
}

# Crear una subred (subnet)
resource "aws_subnet" "my_subnet" {
  vpc_id                  = aws_vpc.my_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

# Asociar la tabla de ruteo a la subnet
resource "aws_route_table_association" "my_route_assoc" {
  subnet_id      = aws_subnet.my_subnet.id
  route_table_id = aws_route_table.my_route_table.id
}

# Crear un grupo de seguridad
resource "aws_security_group" "my_security_group" {
  vpc_id     = aws_vpc.my_vpc.id
  name        = "my-security-group"
  description = "Allow all inbound traffic"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Crear un par de claves (key pair)
resource "aws_key_pair" "my_key_pair" {
  key_name   = "my-key-pair"
  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC7W9Fy3oV7MRwSziRBf6syrU9690Hb/XJy2qgBdyHQpKUia2bOZHDS+RAoDbl0amoLA/ytGQ2+49BWB/eALnhUnNd9yxwF3K7EoIe/GJGz4s5BSVzYke4E3tAEEETKVcfGlUHNE61Pwq46rvCeE9xOtlaeXdluEEIaNKWUQVHd8FVKVydV4JSHu8WDhlDeX58nPsyAhV9Hzboe0X22+OF0ui//xzKlfvgEFkwIq+9ZTdNmuprZ83ukLLpwiz2URU9ePEa843jAAlPAvfqYxbj7iYsKfSFzMGw0kxJqXDA2vF74bA7LpeiRWwVOzD2tLiiYOrQ7VzTI+53jVX0nrhStNO8A42+rZbiSTm1V7SfhxFBKuoPzLyQw5YSRyNNOSWH515Cx3H8HDkIYsGbqb8lwBiJlpQKX9xij/bi3F+l5TneHs37ba2wtneQguJ/TLVYIG7+ktZJUoYbZNBPJpdvWz3UmH7vEMr+jTWEVIYU2Fzgg5VEQKMtybaskJTZwEtl9nkcDQbCgagVXPa0utePwkw3rr0oECi3D8RQdBcwWAHN88Vml46nN6miuK3OCvAkCzSCnBd9nrpGP9OiV+06dmJ6N3JqrFrwVl6+qTCTZ1pci9UcmTKzijVf5HD8PC7Z2Buv3vnItQEgl+psNlpresb9/fW1p1dBSdhLXRABatw== vladg@VladGoenitzDG"
}

# Crear una instancia EC2
resource "aws_instance" "my_instance" {
  ami           = "ami-0e449927258d45bc4"
  instance_type = "t2.micro"
  
  subnet_id                   = aws_subnet.my_subnet.id
  vpc_security_group_ids      = [aws_security_group.my_security_group.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.my_key_pair.key_name

  tags = {
    Name = "MyInstance"
  }
}

# Crear un Elastic IP (EIP)
resource "aws_eip" "my_eip" {
  instance = aws_instance.my_instance.id
  vpc      = true
}

# Crear una asociación de Elastic IP
resource "aws_eip_association" "my_eip_association" {
  instance_id   = aws_instance.my_instance.id
  allocation_id = aws_eip.my_eip.id
}

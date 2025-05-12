output "ec2_public_ip" {
  value = aws_instance.my_instance.public_ip
}

output "instance_id" {
  value = aws_instance.my_instance.id
}

output "eip_public_ip" {
  value = aws_eip.my_eip.public_ip
}

output "instance_private_ip" {
  value = aws_instance.my_instance.private_ip
}

output "security_group_id" {
  value = aws_security_group.my_security_group.id
}

output "key_pair_name" {
  value = aws_key_pair.my_key_pair.key_name
}

output "eip_association_id" {
  value = aws_eip_association.my_eip_association.id
}

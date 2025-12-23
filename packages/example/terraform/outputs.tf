output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "custom_domain_endpoint" {
  value = "https://${aws_apigatewayv2_domain_name.api.domain_name}"
}

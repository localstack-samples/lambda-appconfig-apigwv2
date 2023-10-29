# Lambda+AppConfig Integration
Lambda+AppConfig integration is easy to use. Amazon provides Lambda Layers to implement the integration! 
With AppConfig, you can store application configuration such as feature flags.
This integration makes it simple to retrieve application configuration in your Lambdas.
Checkout the AWS documention here [AWS Lambda AppConfig docs](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html).

# Overview
- IaC in AWS CDK
- DevOps tooling and makefile configuration
- Lambda+AppConfig integration using Amazon provided Lambda layers
- Solution deploys to LocalStack and includes an integration test
- Solution deploys to AWS using the same IaC

## LocalStack Requirements
- LocalStack Pro subscription
- LocalStack Extension for Lambda+AppConfig

## Tooling Requirements
- Docker or DockerDesktop
- (more)

## Setup
### Start LocalStack
Start LocalStack with Docker Compose.
```shell
make start-localstack
```


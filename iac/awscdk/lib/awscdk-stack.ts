import * as cdk from 'aws-cdk-lib'
import {aws_s3 as s3, Duration, RemovalPolicy} from 'aws-cdk-lib'
import {Architecture, AssetCode, Code, Function, Runtime, LayerVersion} from "aws-cdk-lib/aws-lambda"
import {Construct} from 'constructs'
import * as Iam from "aws-cdk-lib/aws-iam"
import {PolicyStatement} from "aws-cdk-lib/aws-iam"
import * as S3 from "aws-cdk-lib/aws-s3"
// API Gateway V2 HTTP API - ALPHA
import {HttpLambdaIntegration} from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha"
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha"
import * as ApiGateway from "aws-cdk-lib/aws-apigateway"
import {AuthorizationType} from "aws-cdk-lib/aws-apigateway"
import {
    AppConfigExtensionDeploymentStrategy,
    SimpleConfiguration,
    SimpleConfigurationProps
} from "./app-config-deployment"

export interface LsMultiEnvAppProps extends cdk.StackProps {
    isLocal: boolean;
    environment: string;
    handler: string;
    runtime: Runtime;
    lambdaDistPath: string;
    listBucketName: string;
    stageName: string;
    version: string;
    region: string;
}

// AWS CDK App Stack
// Create an S3 bucket, Lambda, HttpAPI with Lambda binding
export class AwscdkStack extends cdk.Stack {
    private httpApi: HttpApi
    private lambdaFunction: Function
    private bucket: s3.Bucket
    private lambdaCode: Code

    constructor(scope: Construct, id: string, props: LsMultiEnvAppProps) {
        super(scope, id, props)

        // Run Lambda on ARM_64 in AWS and locally when local arch is ARM_64.
        let arch = Architecture.ARM_64
        const localArch = process.env.LOCAL_ARCH
        if (props.isLocal && localArch == 'x86_64') {
            arch = Architecture.X86_64
        }
        // Lambda Source Code
        this.lambdaCode = new AssetCode(`../../src/lambda-hello-name/dist`)

        const lambdaAppConfig = new SimpleConfiguration(this,
            'myconfig', {
                configurationName: 'theconfig',
                configuration: {
                    "appconfig_ftr": {
                        "enabled": true
                    },
                }, region: props.region
            })

        // Create a bucket for some future purpose
        this.bucket = new s3.Bucket(this, 'lambdawork', {
            enforceSSL: false,
            removalPolicy: RemovalPolicy.DESTROY,
        })

        // HTTP API Gateway V2
        this.httpApi = new HttpApi(this, this.stackName + "HttpApi", {
            description: "AWS CDKv2 HttpAPI-alpha"
        })

        // Allow Lambda to list bucket contents
        const lambdaPolicy = new PolicyStatement()
        lambdaPolicy.addActions("s3:ListBucket")
        lambdaPolicy.addResources(this.bucket.bucketArn)

        const lambdaPolicyAppConfig = new PolicyStatement()
        lambdaPolicyAppConfig.addActions("appconfig:StartConfigurationSession")
        lambdaPolicyAppConfig.addActions("appconfig:GetLatestConfiguration")
        lambdaPolicyAppConfig.addResources(lambdaAppConfig.deploymentArn,
            'arn:aws:appconfig:us-east-1:000000000000:application/*/environment/*/configuration/*')

        const appConfigLambdaLayer = LayerVersion.fromLayerVersionArn(
            this,
            `my-first-app-config-layer`,
            'arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:46', // app config extension arn
        )
        // Create the Lambda
        this.lambdaFunction = new Function(this, 'name-lambda', {
            functionName: 'name-lambda',
            architecture: arch,
            handler: props.handler,
            runtime: props.runtime,
            code: this.lambdaCode,
            memorySize: 512,
            timeout: Duration.seconds(10),
            environment: {
                BUCKET: this.bucket.bucketName,
                AWS_APPCONFIG_EXTENSION_PREFETCH_LIST: lambdaAppConfig.deploymentUri,
                // AWS_APPCONFIG_EXTENSION_PROXY_URL: 'http://host.docker.internal:4566'
                // AWS_APPCONFIG_EXTENSION_PROXY_URL: 'http://localhost:2772'
            },
            layers: [appConfigLambdaLayer],
            initialPolicy: [lambdaPolicy, lambdaPolicyAppConfig],
        })

        // HttpAPI Lambda Integration for the above Lambda
        const nameIntegration =
            new HttpLambdaIntegration('NameIntegration', this.lambdaFunction)

        // HttpAPI Route
        // Method:      GET
        // Path:        /
        // Integration: Lambda
        this.httpApi.addRoutes({
            path: '/',
            methods: [apigwv2.HttpMethod.GET],
            integration: nameIntegration,
        })

        // Output the HttpApiEndpoint
        new cdk.CfnOutput(this, 'HttpApiEndpoint', {
            value: this.httpApi.apiEndpoint,
            exportName: 'HttpApiEndpoint',
        })
    }

}


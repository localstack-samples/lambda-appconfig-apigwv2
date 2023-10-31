import {Fn} from 'aws-cdk-lib'
import {Construct} from 'constructs'
import * as appconfig from 'aws-cdk-lib/aws-appconfig'
import * as cdk from "aws-cdk-lib"
import {AccountRootPrincipal} from "aws-cdk-lib/aws-iam"

export enum AppConfigExtensionDeploymentStrategy {
    AllAtOnce = 'AppConfig.AllAtOnce',
    Linear50PercentEvery30Seconds = 'AppConfig.Linear50PercentEvery30Seconds',
    Canary10Percent20Minutes = 'AppConfig.Canary10Percent20Minutes',
}

export interface SimpleConfigurationProps {
    deploymentStrategy?: keyof typeof AppConfigExtensionDeploymentStrategy;
    configurationName: string;
    configuration: Record<string, unknown>;
    region: string;
}

const defaultDeploymentStrategy = 'AppConfig.AllAtOnce'

export class SimpleConfiguration extends appconfig.CfnDeployment {
    public readonly deploymentUri: string
    public readonly deploymentArn: string

    constructor(scope: Construct, id: string, props: SimpleConfigurationProps) {
        const {configuration, configurationName, deploymentStrategy = defaultDeploymentStrategy, region} = props

        const application = new appconfig.CfnApplication(
            scope,
            `${id}: Application`,
            {
                name: configurationName,
            }
        )

        const environment = new appconfig.CfnEnvironment(
            scope,
            `${id}: Environment`,
            {
                applicationId: application.ref,
                name: 'default',
            }
        )

        const configurationProfile = new appconfig.CfnConfigurationProfile(
            scope,
            `${id}: ConfigurationProfile`,
            {
                applicationId: application.ref,
                locationUri: 'hosted',
                name: 'config',
                type: 'AWS.Freeform',
            }
        )
        const configurationVersion = new appconfig.CfnHostedConfigurationVersion(
            scope,
            `${id}: ConfigurationProfileVersion`,
            {
                applicationId: application.ref,
                configurationProfileId: configurationProfile.ref,
                contentType: 'application/json',
                content: JSON.stringify(configuration),
            }
        )

        super(scope, id, {
            applicationId: application.ref,
            configurationProfileId: configurationProfile.ref,
            configurationVersion: configurationVersion.ref,
            deploymentStrategyId: deploymentStrategy || defaultDeploymentStrategy,
            environmentId: environment.ref,
        })

        this.deploymentUri = Fn.sub(
            // eslint-disable-next-line no-template-curly-in-string
            '/applications/${applicationId}/environments/${environmentId}/configurations/${configurationId}',
            {
                applicationId: application.ref,
                environmentId: environment.ref,
                configurationId: configurationProfile.ref,
            }
        )
        // arn:aws:appconfig:us-east-1:000000000000:application/17db3bb/environment/97834f0/configuration/004387e
        const account = new AccountRootPrincipal()
        this.deploymentArn = Fn.sub(
            // eslint-disable-next-line no-template-curly-in-string
            `arn:aws:appconfig:$\{region}:$\{account}:application/$\{applicationId}/environment/$\{environmentId}/configuration/$\{configurationId}`,
            {
                region: region || 'us-east-1',
                account: account.principalAccount || '000000000000',
                applicationId: application.ref,
                environmentId: environment.ref,
                configurationId: configurationProfile.ref,
            }
        )

        new cdk.CfnOutput(this, 'appConfigDeploymentArn', {
            value: this.deploymentArn,
            exportName: 'appConfigDeploymentArn',
        })
        new cdk.CfnOutput(this, 'appConfigDeploymentUri', {
            value: this.deploymentUri,
            exportName: 'appConfigDeploymentUri',
        })
    }
}
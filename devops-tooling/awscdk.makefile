awscdkinstall:
	cd $(STACK_DIR) && npm install
#	cd $(STACK_DIR) && $(CDK_CMD) get
awscdkbootstrap: iac-shared awscdkinstall build
	cd $(STACK_DIR) && $(CDK_CMD) bootstrap
awscdkdeploy: iac-shared
	cd $(STACK_DIR) && $(CDK_CMD) deploy $(TFSTACK_NAME) --outputs-file stack-outputs-$(STACK_SUFFIX).json
awscdkdestroy: iac-shared
	cd $(STACK_DIR) && $(CDK_CMD) destroy $(TFSTACK_NAME)
awscdkoutput:
	jq '{ apigwUrl: ."LambdaAppConfig-$(STACK_SUFFIX)".HttpApiEndpoint, ddbTableName: ."LambdaAppConfig-$(STACK_SUFFIX)".ddbTableName }' \
	iac/awscdk/stack-outputs-$(STACK_SUFFIX).json


# LocalStack target groups
#local-awscdk-install: awscdkinstall
# VPC
local-awscdk-vpc-deploy: build awscdkdeploy
local-awscdk-vpc-destroy: awscdkdestroy
# Lambda - APIGW - S3
local-awscdk-bootstrap: awscdkbootstrap
local-awscdk-deploy: build awscdkdeploy
local-awscdk-destroy: awscdkdestroy
local-awscdk-output: awscdkoutput

local-awscdk-test-output:
	@make -s local-awscdk-output > auto_tests/iac-output.json;

local-awscdk-test:
	@make -s local-awscdk-test-output
	make test

local-get-invoke-url:
	@jq '."LambdaAppConfig-$(STACK_SUFFIX)".HttpApiEndpoint' iac/awscdk/stack-outputs-$(STACK_SUFFIX).json

local-awscdk-invoke:
	curl $(shell make local-get-invoke-url)

local-awscdk-invoke-loop:
	@APIGW=$$(make local-awscdk-output | jq -r '.apigwUrl') && \
	sh run-lambdas.sh "http://$${APIGW}"

local-awscdk-clean:
	- rm -rf iac/awscdk/cdk.out

# AWS Sandbox target groups
# VPC
sbx-awscdk-vpc-deploy: build awscdkdeploy
sbx-awscdk-vpc-destroy: awscdkdestroy
# Lambda - APIGW - S3
sbx-awscdk-bootstrap: awscdkbootstrap
sbx-awscdk-deploy: build awscdkdeploy
sbx-awscdk-destroy: awscdkdestroy
sbx-awscdk-output: awscdkoutput

sbx-awscdk-get-invoke-url:
	@jq '."LambdaAppConfig-$(STACK_SUFFIX)".HttpApiEndpoint' iac/awscdk/stack-outputs-$(STACK_SUFFIX).json

sbx-awscdk-invoke:
	curl $(shell make sbx-awscdk-get-invoke-url)
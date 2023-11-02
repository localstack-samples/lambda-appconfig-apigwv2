SHELL := /bin/bash

PROJECT_MODULE_NAME = ./src/lambda-hello-name/src/

-include .env-gdc-local
-include ./devops-tooling/envs.makefile
-include ./devops-tooling/nonenv.makefile
-include ./devops-tooling/sandboxenv.makefile
-include ./devops-tooling/pulumi.makefile
-include ./devops-tooling/cdktf.makefile
-include ./devops-tooling/awscdk.makefile

# Some defaults
export SBX_ACCOUNT_CONFIG?=devops-tooling/accounts/my-sb.json
export ENFORCE_IAM?=1
export PERSIST_ALL?=false

.PHONY: clean update-deps delete-zips iac-shared local-top-level local-awscdk-output

PKG_SUB_DIRS := $(dir $(shell find . -type d -name node_modules -prune -o -type d -name "venv*" -prune -o -type f -name package.json -print))

PULUMI_CONFIG = $(PULUMI_EXE) config --stack $(STACK_PREFIX).$(STACK_SUFFIX) --cwd $(STACK_DIR)

update-deps: $(PKG_SUB_DIRS)
	for i in $(PKG_SUB_DIRS); do \
        pushd $$i && ncu -u && npm install && popd; \
    done

start-localstack:
	cd devops-tooling && docker compose -p $(APP_NAME) up

stop-localstack:
	cd devops-tooling && docker compose down

iac-shared:
	pushd iac/iac-shared && npm install && npm run build && popd

build:
	cd src/lambda-hello-name && npm install
	cd src/lambda-hello-name && npm run build
	cd src/common_layer && make

# Hot reloading watching to run build
watch-lambda:
	cd src/lambda-hello-name && npm run watch

# Run the tests
test: venv
	$(VENV_RUN) && cd auto_tests && AWS_PROFILE=localstack pytest $(ARGS);

test-lambda:
	appId=$$(awslocal appconfig create-application --name app1 | jq -r .Id); \
		envId=$$(awslocal appconfig create-environment --application-id $$appId --name env1 | jq -r .Id); \
		profileId=$$(awslocal appconfig create-configuration-profile --application-id $$appId --name profile1 --location-uri "hosted" | jq -r .Id); \
		awslocal appconfig create-hosted-configuration-version --application-id $$appId --configuration-profile-id $$profileId --content '{"foo":"bar"}' --content-type "application/json" /tmp/outfile.tmp; \
		echo 'def handler(*args, **kwargs):' > /tmp/testlambda.py; \
		echo '  import requests, os; config = os.getenv("AWS_APPCONFIG_EXTENSION_PREFETCH_LIST") or "/applications/'$$appId'/environments/'$$envId'/configurations/'$$profileId'"; res = requests.get(f"http://localhost:2772{config}"); print(res, res.headers, res.content)' >> /tmp/testlambda.py
	(cd /tmp; zip testlambda.zip testlambda.py)
	(cd /tmp; libsPath=$$(python -c 'import requests, os; print(os.path.join(os.path.dirname(requests.__file__), ".."))'); \
		ln -s $$libsPath/requests .; zip -r testlambda.zip requests; \
		ln -s $$libsPath/charset_normalizer .; zip -r testlambda.zip charset_normalizer; \
		ln -s $$libsPath/idna .; zip -r testlambda.zip idna; \
		ln -s $$libsPath/certifi .; zip -r testlambda.zip certifi)
	awslocal lambda create-function --function-name func1 --runtime python3.8 --role arn:aws:iam::000000000000:role/r1 \
		--handler testlambda.handler --timeout 30 --zip-file fileb:///tmp/testlambda.zip \
		--layers arn:aws:lambda:us-east-1:027255383542:layer:AWS-AppConfig-Extension-Arm64:46

restart-ls:
	~/bin-extra/ls/stop-ls.sh
	~/bin-extra/ls/start-ls.sh

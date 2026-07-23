.DEFAULT_GOAL:=help

.EXPORT_ALL_VARIABLES:

ifndef VERBOSE
.SILENT:
endif

# set default shell
SHELL=/usr/bin/env bash -o pipefail -o errexit

TAG ?= $(shell cat TAG)
POETRY_HOME ?= ${HOME}/.local/share/pypoetry
POETRY_BINARY ?= ${POETRY_HOME}/venv/bin/poetry
POETRY_VERSION ?= 1.3.2

help:  ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: show-version
show-version:  ## Display version
	echo -n "${TAG}"

.PHONY: build
build: ## Build api-container package
	echo "[build] Build api-container package."
	${POETRY_BINARY} build

.PHONY: install
install:  ## Install api-container with poetry
	@build/install.sh

.PHONY: image
image:  ## Build api-container image
	@build/image.sh

.PHONY: metrics
metrics: install ## Run api-container metrics checks
	echo "[metrics] Run api-container PEP 8 checks."
	${POETRY_BINARY} run flake8 --select=E,W,I --max-line-length 88 --import-order-style pep8 --statistics --count api_container
	echo "[metrics] Run api-container PEP 257 checks."
	${POETRY_BINARY} run flake8 --select=D --ignore D301 --statistics --count api_container
	echo "[metrics] Run api-container pyflakes checks."
	${POETRY_BINARY} run flake8 --select=F --statistics --count api_container
	echo "[metrics] Run api-container code complexity checks."
	${POETRY_BINARY} run flake8 --select=C901 --statistics --count api_container
	echo "[metrics] Run api-container open TODO checks."
	${POETRY_BINARY} run flake8 --select=T --statistics --count api_container tests
	echo "[metrics] Run api-container black checks."
	${POETRY_BINARY} run black --check api_container

.PHONY: unit-test
unit-test: install ## Run api-container unit tests
	echo "[unit-test] Run api-container unit tests."
	${POETRY_BINARY} run pytest tests/unit

.PHONY: integration-test
integration-test: install ## Run api-container integration tests
	echo "[unit-test] Run api-container integration tests."
	${POETRY_BINARY} run pytest tests/integration

.PHONY: coverage
coverage: install  ## Run api-container tests coverage
	echo "[coverage] Run api-container tests coverage."
	${POETRY_BINARY} run pytest --cov=api_container --cov-fail-under=90 --cov-report=xml --cov-report=term-missing tests

.PHONY: test
test: unit-test integration-test  ## Run api-container tests

.PHONY: docs
docs: install ## Build api-container documentation
	echo "[docs] Build api-container documentation."
	${POETRY_BINARY} run sphinx-build docs site

.PHONY: mypy
mypy: install  ## Run api-container mypy checks
	echo "[mypy] Run api-container mypy checks."
	${POETRY_BINARY} run mypy api_container

.PHONY: dev-env
dev-env: image ## Start a local Kubernetes cluster using minikube and deploy application
	@build/dev-env.sh

.PHONY: clean
clean: ## Remove .cache directory and cached minikube
	minikube delete && rm -rf ~/.cache ~/.minikube

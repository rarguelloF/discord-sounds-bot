DOCKER_IMAGE ?= rarguellof/discord-sounds-bot
DOCKER_TAG ?= $(shell git describe --tags --abbrev=0)

docker: docker-build docker-push
.PHONY: docker

docker-build:
	docker build -f docker/Dockerfile.arm32v6 -t ${DOCKER_IMAGE}:${DOCKER_TAG}-arm32v6 .
	docker build -f docker/Dockerfile -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
.PHONY: docker-build

docker-push:
	docker push ${DOCKER_IMAGE}
.PHONY: docker-push

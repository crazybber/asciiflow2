# make release  # add git TAG and push
GITHUB_REPO_OWNER 				        := edward
GITHUB_REPO_NAME 					:= asciiflow2
GITHUB_RELEASES_UI_URL 		:= https://github.com/$(GITHUB_REPO_OWNER)/$(GITHUB_REPO_NAME)/releases
GITHUB_RELEASES_API_URL 	:= https://api.github.com/repos/$(GITHUB_REPO_OWNER)/$(GITHUB_REPO_NAME)/releases
GITHUB_RELEASE_ASSET_URL	:= https://uploads.github.com/repos/$(GITHUB_REPO_OWNER)/$(GITHUB_REPO_NAME)/releases
GITHUB_DEPLOY_API_URL		:= https://api.github.com/repos/$(GITHUB_REPO_OWNER)/$(GITHUB_REPO_NAME)/deployments
DOCKER_REGISTRY 		:= docker.pkg.github.com
DOCKER_CONTEXT_PATH 		:= $(GITHUB_REPO_OWNER)/$(GITHUB_REPO_NAME)
GO_MICRO_VERSION 		:= latest

VERSION					:= $(shell git describe --tags || echo "HEAD")
GOPATH					:= $(shell go env GOPATH)
TIMEOUT  				:= 60s
# don't override
GIT_TAG					:= $(shell git describe --tags --abbrev=0 --always --match "v*")
GIT_DIRTY 			        := $(shell git status --porcelain 2> /dev/null)
GIT_BRANCH  		                := $(shell git rev-parse --abbrev-ref HEAD)
HAS_GOVVV				:= $(shell command -v govvv 2> /dev/null)
HAS_PKGER				:= $(shell command -v pkger 2> /dev/null)
HAS_KO					:= $(shell command -v ko 2> /dev/null)

all: run



check_dirty:
ifdef GIT_DIRTY
	$(error "Won't run on a dirty working copy. Commit or stash and try again.")
endif

clean:
	@for d in ./build/*-service; do \
		echo "Deleting $$d;"; \
		rm -f $$d; \
	done
	@for f in */*/pkged.go ; do \
		echo "Deleting $$f;"; \
		rm -f $$f; \
	done

update_deps:
	go mod verify
	go mod tidy

release/publish:
	@echo Publishing Release: $(VERSION)

build build-%: pkger-%
ifndef HAS_GOVVV
	$(error "No govvv in PATH". Please install via 'go install github.com/ahmetb/govvv'")
endif
	@if [ -z $(TARGET) ]; then \
		for type in $(TYPES); do \
			echo "Building Type: $${type}..."; \
			for _target in $${type}/*/; do \
				temp=$${_target%%/}; target=$${temp#*/}; \
				echo "\tBuilding $${target}-$${type}"; \
				CGO_ENABLED=0 GOOS=linux go build -o build/$${target}-$${type} -a -trimpath -ldflags "-w -s ${BUILD_FLAGS}" ./$${type}/$${target}; \
			done \
		done \
	else \
		echo "Building ${TARGET}-${TYPE}"; \
		go build -o  build/${TARGET}-${TYPE} -a -trimpath -ldflags "-w -s ${BUILD_FLAGS}" ./${TYPE}/${TARGET}; \
	fi

build:
	docker build -t asciiflow2 .

run: build
	docker rm -f asciiflow2 2> /dev/null || true
	docker run --detach --name asciiflow2 --read-only --publish-all asciiflow2
	@docker port asciiflow2 8000 | awk -F: '{print "http://localhost:"$$2}'
# TODO: DOCKER_BUILDKIT=1 docker build --rm

docker docker-%:
	@if [ -z $(TARGET) ]; then \
		echo "Building images for all services..."; \
		for type in $(TYPES); do \
			echo "Building Type: $${type}..."; \
			for _target in $${type}/*/; do \
				temp=$${_target%%/}; target=$${temp#*/}; \
				echo "Building Image $${target}-$${type}..."; \
				docker build --rm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--build-arg VERSION=$(VERSION) \
				--build-arg GO_MICRO_VERSION=$(GO_MICRO_VERSION) \
				--build-arg TYPE=$${type} \
				--build-arg TARGET=$${target} \
				--build-arg DOCKER_REGISTRY=${DOCKER_REGISTRY} \
				--build-arg DOCKER_CONTEXT_PATH=${DOCKER_CONTEXT_PATH} \
				--build-arg VCS_REF=$(shell git rev-parse --short HEAD) \
				--build-arg BUILD_DATE=$(shell date +%FT%T%Z) \
				-t ${DOCKER_REGISTRY}/${DOCKER_CONTEXT_PATH}/$${target}-$${type}:$(VERSION) .; \
			done \
		done \
	else \
		echo "Building image for ${TARGET}-${TYPE}..."; \
		docker build --rm \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--build-arg VERSION=$(VERSION) \
		--build-arg GO_MICRO_VERSION=$(GO_MICRO_VERSION) \
		--build-arg TYPE=${TYPE} \
		--build-arg TARGET=${TARGET} \
		--build-arg DOCKER_REGISTRY=${DOCKER_REGISTRY} \
		--build-arg DOCKER_CONTEXT_PATH=${DOCKER_CONTEXT_PATH} \
		--build-arg VCS_REF=$(shell git rev-parse --short HEAD) \
		--build-arg BUILD_DATE=$(shell date +%FT%T%Z) \
		-t ${DOCKER_REGISTRY}/${DOCKER_CONTEXT_PATH}/${TARGET}-${TYPE}:$(VERSION) .; \
	fi
docker_push:
	@echo "Publishing images with VCS_REF=$(shell git rev-parse --short HEAD)"
	@docker images -f "label=org.label-schema.vcs-ref=$(shell git rev-parse --short HEAD)" --format {{.Repository}}:{{.Tag}} | \
	while read -r image; do \
		echo Now pushing $$image; \
		docker push $$image; \
	done;

IMAGE     := ishakantony/snippaste
VERSION   := $(shell node -p 'require("./package.json").version')
PLATFORMS := linux/amd64,linux/arm64

.PHONY: setup-builder publish release

setup-builder:
	docker buildx create --name multiplatform --driver docker-container --use 2>/dev/null || docker buildx use multiplatform
	docker buildx inspect --bootstrap

publish: setup-builder
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(IMAGE):$(VERSION) \
		-t $(IMAGE):latest \
		--push \
		.

release:
	npx commit-and-tag-version
	git push --follow-tags origin main
	$(MAKE) publish

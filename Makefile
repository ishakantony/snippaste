IMAGE     := ishakantony/snippaste
PLATFORMS := linux/amd64,linux/arm64

.PHONY: setup-builder publish publish-local

setup-builder:
	docker buildx create --name multiplatform --driver docker-container --use 2>/dev/null || docker buildx use multiplatform
	docker buildx inspect --bootstrap

publish:
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(IMAGE):latest \
		--push \
		.

publish-local:
	docker buildx build \
		-t $(IMAGE):latest \
		--load \
		.

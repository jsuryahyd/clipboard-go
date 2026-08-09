# Makefile for Clipboard-Gnome

EXTENSION_UUID = clipboard-gnome@surya.dev
EXTENSION_DIR = ~/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)
BUILD_DIR = build
GO_BIN = $(shell which go)
WAILS_BIN = $(shell which wails 2>/dev/null || echo "$(HOME)/go/bin/wails")

.PHONY: all test build extension install dev clean

all: test build extension

test:
	@echo "==> Running Go unit tests..."
	@export PATH=/home/linuxbrew/.linuxbrew/bin:$(PATH); go test -v ./...

build:
	@echo "==> Building Wails binary..."
	@export PKG_CONFIG_PATH=/home/linuxbrew/.linuxbrew/lib/pkgconfig:$$PKG_CONFIG_PATH; \
	export PATH=/home/linuxbrew/.linuxbrew/bin:$(HOME)/go/bin:$(PATH); \
	if command -v wails >/dev/null 2>&1; then \
		wails build -clean; \
	else \
		go build -o build/bin/clipboard-gnome main.go app.go; \
	fi

extension:
	@echo "==> Packaging GNOME Shell Extension..."
	@mkdir -p $(BUILD_DIR)
	@cd extension && zip -r ../$(BUILD_DIR)/clipboard-gnome-extension.zip .

install: extension
	@echo "==> Installing GNOME Shell Extension locally..."
	@mkdir -p $(EXTENSION_DIR)
	@cp -r extension/* $(EXTENSION_DIR)/
	@echo "GNOME Extension installed to $(EXTENSION_DIR)"
	@echo "To enable, run: gnome-extensions enable $(EXTENSION_UUID)"

clean:
	@echo "==> Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@go clean

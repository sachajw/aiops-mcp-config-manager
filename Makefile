.PHONY: test test-unit test-integration test-e2e test-sandbox test-all clean-test help

# Default target
all: help

# Help target
help:
	@echo "MCP Configuration Manager - Test Commands"
	@echo "========================================="
	@echo ""
	@echo "Available targets:"
	@echo "  make test           - Run all unit tests"
	@echo "  make test-unit      - Run unit tests only"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e       - Run end-to-end tests"
	@echo "  make test-sandbox   - Run tests in sandbox environment"
	@echo "  make test-all       - Run all tests (unit, integration, e2e)"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make clean-test     - Clean test artifacts"
	@echo ""
	@echo "Development commands:"
	@echo "  make dev            - Start development server"
	@echo "  make build          - Build production version"
	@echo "  make lint           - Run linting"
	@echo "  make format         - Format code"

# Basic test command
test:
	npm test

# Unit tests only
test-unit:
	npm test -- --testPathPattern="__tests__" --coverage

# Integration tests
test-integration:
	npm test -- --testPathPattern="integration" --coverage

# End-to-end tests
test-e2e:
	npx playwright test

# Sandbox tests
test-sandbox:
	@echo "Running tests in sandbox environment..."
	@chmod +x test/sandbox/run-sandbox-tests.sh
	@./test/sandbox/run-sandbox-tests.sh

# Run all tests
test-all: test-unit test-integration test-e2e
	@echo "All tests completed!"

# Test with coverage
test-coverage:
	npm test -- --coverage --coverageReporters=text-lcov --coverageReporters=html
	@echo "Coverage report generated at coverage/lcov-report/index.html"

# Clean test artifacts
clean-test:
	rm -rf coverage/
	rm -rf test-results/
	rm -rf test/sandbox/test-configs/
	rm -rf test/sandbox/test-data/
	rm -rf test/sandbox/test-output/
	rm -rf test/sandbox/test-home/
	@echo "Test artifacts cleaned"

# Development server
dev:
	npm run electron:dev

# Build for production
build:
	npm run build
	npm run electron:pack

# Linting
lint:
	npm run lint

# Format code
format:
	npm run format

# Type checking
type-check:
	npm run type-check
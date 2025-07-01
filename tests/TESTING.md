# Testing Guide for FormatFuse

## Overview

All file converters in FormatFuse are tested using real file conversions without mocking. This ensures our tools work correctly with actual user files.

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test tests/workers/pdf-split.test.ts
```

## Directory Structure

```
tests/
├── fixtures/           # Sample test files
│   ├── pdf/           # PDF samples
│   ├── images/        # Image samples
│   ├── documents/     # Document samples
│   ├── developer/     # Developer tool samples
│   └── outputs/       # Test outputs (gitignored)
├── workers/           # Worker tests
│   ├── pdf-split.test.ts
│   └── converter-test-template.ts
├── setup.ts           # Test utilities
└── TESTING.md         # This file
```

## Creating Tests for New Converters

1. **Generate test fixtures** (if needed):

   ```bash
   pnpm tsx tests/fixtures/generate-samples.ts
   ```

2. **Copy the test template**:

   ```bash
   cp tests/workers/converter-test-template.ts tests/workers/your-converter.test.ts
   ```

3. **Customize the template**:

   - Replace `CONVERTER_NAME` with your converter name
   - Import your actual conversion function
   - Update fixture paths
   - Add converter-specific validations

4. **Test categories to implement**:
   - **Unit Tests**: Test the core conversion logic
   - **Worker Integration**: Test Web Worker communication
   - **Performance**: Ensure reasonable conversion times
   - **Output Quality**: Validate output format and content

## Test Utilities

### loadFixture(path)

Loads a test file as ArrayBuffer:

```typescript
const pdfData = await loadFixture("pdf/sample.pdf");
```

### validateOutput(result, mimeType?, minSize?)

Validates conversion output:

```typescript
validateOutput(result, "application/pdf", 1000);
```

### createFileFromFixture(path, name, mimeType)

Creates a File object for testing:

```typescript
const file = await createFileFromFixture(
  "pdf/sample.pdf",
  "test.pdf",
  "application/pdf",
);
```

## Best Practices

1. **Use Real Files**: Always test with actual file formats, not mocks
2. **Test Edge Cases**: Empty files, corrupted files, large files
3. **Performance Matters**: Set reasonable time limits for conversions
4. **Validate Output**: Check both format and content preservation
5. **Progressive Enhancement**: Test both with and without Web Workers

## Adding New Test Fixtures

Place test files in the appropriate directory:

- Small files (<100KB) for basic tests
- Large files (>1MB) for performance tests
- Corrupted files for error handling
- Edge cases specific to each format

## CI/CD Integration

Tests run automatically on:

- Every push to main
- Pull requests
- Pre-commit hooks (if configured)

Keep tests fast by using small fixture files for most tests.

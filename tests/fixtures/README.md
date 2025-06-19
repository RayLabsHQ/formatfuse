# Test Fixtures

This directory contains sample files for testing converters. Files are organized by type:

## Directory Structure

```
fixtures/
├── pdf/              # PDF test files
├── images/           # Image test files
│   ├── jpg/
│   ├── png/
│   ├── webp/
│   └── heic/
├── documents/        # Document test files
│   ├── word/
│   └── excel/
├── developer/        # Developer tool test files
│   ├── json/
│   └── base64/
└── outputs/          # Test outputs (gitignored)
```

## Test Files

Each directory contains:
- `sample.*` - Basic test file
- `large.*` - Large file for performance testing
- `corrupted.*` - Corrupted file for error handling
- `empty.*` - Empty or minimal file

## Output Files

All test outputs are saved to `outputs/` directory which is gitignored.
Test outputs follow the naming convention: `{input-name}.output.{ext}`
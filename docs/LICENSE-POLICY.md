# FormatFuse License Policy

## Overview

FormatFuse is committed to providing a commercial-friendly, open platform for file conversions. To maintain this commitment, we have strict policies regarding the licenses of third-party libraries we use.

## Allowed Licenses ✅

The following licenses are approved for use in FormatFuse:

- **MIT License** - Permissive, commercial-friendly
- **Apache License 2.0** - Permissive with patent protection
- **BSD Licenses** (2-Clause, 3-Clause) - Permissive, minimal restrictions
- **ISC License** - Simplified BSD-style license
- **CC0 / Public Domain** - No restrictions
- **Unlicense** - Public domain dedication
- **0BSD** - Zero-clause BSD

## Prohibited Licenses ❌

The following licenses are NOT allowed in FormatFuse:

- **GPL** (v2, v3) - Copyleft, requires source disclosure
- **LGPL** - Lesser GPL, still has linking restrictions
- **AGPL** - Network copyleft, strictest GPL variant
- **MPL** - Mozilla Public License (weak copyleft)
- **EPL** - Eclipse Public License (weak copyleft)
- **CDDL** - Common Development and Distribution License
- **Any custom license** without explicit commercial use permission

## Specific Library Decisions

### PDF Processing
- ✅ **pdf-lib** (MIT) - Primary PDF manipulation
- ✅ **pdf.js / pdfjs-dist** (Apache-2.0) - PDF rendering and text extraction
- ✅ **pdfcpu** (Apache-2.0) - PDF optimization
- ❌ **pandoc-wasm** (GPL-2.0) - Cannot be used despite good functionality

### Image Processing
- ✅ **photon-wasm** (Apache-2.0) - Image manipulation
- ✅ **sharp** (Apache-2.0) - If needed for server-side
- ✅ **piexifjs** (MIT) - EXIF data handling
- ✅ **colorthief** (MIT) - Color palette extraction

### Development Tools
- ✅ **esbuild** (MIT) - JavaScript/TypeScript minification
- ✅ **js-yaml** (MIT) - YAML parsing
- ✅ **papaparse** (MIT) - CSV parsing
- ✅ **comlink** (Apache-2.0) - Worker communication

## Verification Process

Before adding any new dependency:

1. Check the package.json or LICENSE file
2. Verify on npm: `npm view [package-name] license`
3. Check GitHub repository for license file
4. If unclear, do not use the library

## Commercial Use Statement

All tools in FormatFuse must be:
- Free for commercial use
- Not require attribution (though we may choose to give credit)
- Not impose any restrictions on our users
- Not require us to open-source our code

## Exceptions

No exceptions will be made to this policy. If a library with a restrictive license is the only option for a feature, we will either:
1. Build our own solution
2. Find or create an alternative with a permissive license
3. Postpone the feature until a suitable solution is available

---

*Last Updated: Current Date*
*This policy applies to all code in the FormatFuse repository*
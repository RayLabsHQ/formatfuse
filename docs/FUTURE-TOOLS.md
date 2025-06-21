# Future Tools Roadmap

This document tracks tools that are planned for implementation but not yet available in FormatFuse.

## High Priority Tools (Based on Search Volume)

### PDF Tools
1. **PDF Merge** (250k searches/month)
   - Combine multiple PDFs into one document
   - Drag-and-drop reordering
   - Page range selection

2. **PDF Compress** (200k searches/month)
   - Reduce PDF file size
   - Quality presets
   - Batch compression

3. **Word to PDF** (380k searches/month)
   - Convert DOCX to PDF
   - Preserve formatting
   - Batch conversion

4. **PDF to JPG** (180k searches/month)
   - Extract pages as images
   - Quality settings
   - Batch export

5. **PDF Split** (180k searches/month)
   - Extract page ranges
   - Split by size
   - Split by page count

### Developer Tools
1. **QR Code Generator** (200k searches/month)
   - Text, URL, WiFi, vCard support
   - Custom colors and logos
   - Multiple download formats

2. **JSON Formatter** (150k searches/month)
   - Validate and beautify JSON
   - Minify option
   - Syntax highlighting

3. **URL Shortener** (150k searches/month)
   - Create short links
   - QR codes for URLs
   - Analytics (optional)

4. **Word Counter** (120k searches/month)
   - Count words, characters, sentences
   - Reading time estimate
   - Keyword density

5. **Base64 Encoder** (100k searches/month)
   - Encode/decode text and files
   - URL-safe encoding
   - Live preview

### Image Tools
1. **Background Remover** (300k searches/month)
   - AI-powered background removal
   - Manual refinement tools
   - Transparent PNG export

### Archive Tools
1. **ZIP Extract** (150k searches/month)
   - Extract ZIP files in browser
   - Preview contents
   - Selective extraction

2. **Create ZIP** (120k searches/month)
   - Compress multiple files
   - Folder structure support
   - Compression levels

### Document Tools
1. **Excel to PDF** (150k searches/month)
   - Convert spreadsheets to PDF
   - Page layout options
   - Preserve formulas as values

2. **Text to PDF** (100k searches/month)
   - Convert plain text to PDF
   - Font and formatting options
   - Page layout settings

## Implementation Notes

### Technology Considerations
- **PDF Tools**: Consider pdf-lib or PDF.js for manipulation
- **Background Removal**: Requires ML model (ONNX runtime + pre-trained model)
- **Archive Tools**: Use fflate or similar for ZIP operations
- **Document Converters**: May need server-side processing for complex formats

### Priority Order
1. Focus on high-search-volume tools first
2. Implement tools that can be done fully client-side
3. Consider revenue potential (ad placement opportunities)
4. Balance between implementation complexity and user demand

### Current Status
- All tools listed here are shown in the UI but not yet implemented
- Navigation.tsx has been updated to hide these tools until ready
- When implementing, uncomment the relevant lines in Navigation.tsx
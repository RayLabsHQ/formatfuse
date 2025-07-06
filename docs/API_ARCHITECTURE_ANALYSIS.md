# FormatFuse API Architecture Analysis

## Executive Summary

**Recommendation**: Use **Cloudflare Workers** for the API with a hybrid approach - keep heavy processing client-side for free users, offer server-side API for paid/enterprise users. This minimizes costs while maintaining portability.

## The Challenge

File conversion APIs face unique challenges:
- **Large payloads**: Files can be 100MB+ 
- **High bandwidth**: Each conversion = upload + download
- **CPU intensive**: WASM processing requires compute
- **Unpredictable load**: Viral traffic spikes possible

## Cost Analysis

### Azure ($200/month budget)

**Typical costs for file conversion API:**
```
B2s VM (2 vCPU, 4GB): $30/month
Bandwidth (1TB egress): $87/month
Storage (100GB): $2/month
Application Gateway: $20/month
---
Base: ~$139/month (leaving $61 for scaling)
```

**Major concern**: Egress pricing
- First 100GB: Free
- Next 10TB: $0.087/GB
- **1TB of conversions = $87 in egress alone**

### Cloudflare Workers 

**Projected costs:**
```
Base plan: $5/month
10M requests: Included
CPU time (30M ms): Included
Additional requests: $0.30/million
NO EGRESS CHARGES
---
Estimated: $5-50/month for moderate usage
```

**Key advantage**: Zero bandwidth charges

## Recommended Architecture: Hybrid Approach

### Phase 1: Edge API with Client Processing (Month 1-3)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│ Cloudflare Worker│────▶│ Client WASM │
│  (Browser)  │◀────│    (Router)      │◀────│ Processing  │
└─────────────┘     └──────────────────┘     └─────────────┘
```

**How it works:**
1. API validates request and auth
2. Returns signed URL for client-side processing
3. Client downloads WASM and processes locally
4. Results stay client-side (no egress)

**Implementation:**
```typescript
// Cloudflare Worker API
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    
    // Rate limiting
    const rateLimitOk = await checkRateLimit(request);
    if (!rateLimitOk) return new Response('Too Many Requests', { status: 429 });
    
    // Route: GET /api/convert/prepare
    if (pathname === '/api/convert/prepare') {
      const { from, to, options } = await request.json();
      
      // Validate conversion parameters
      if (!isValidConversion(from, to)) {
        return new Response('Invalid conversion', { status: 400 });
      }
      
      // Return WASM URL and processing instructions
      return new Response(JSON.stringify({
        wasmUrl: getWasmUrl(from, to),
        processingInstructions: getInstructions(from, to, options),
        clientProcessing: true
      }));
    }
    
    // Route: POST /api/convert (for small files only)
    if (pathname === '/api/convert') {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      // Limit to 10MB for server-side processing
      if (file.size > 10 * 1024 * 1024) {
        return new Response('File too large for server processing', { status: 413 });
      }
      
      // Process using WASM in Worker (paid tier only)
      const result = await processFile(file, options);
      return new Response(result, {
        headers: { 'Content-Type': getMimeType(options.outputFormat) }
      });
    }
  }
};
```

### Phase 2: Progressive Enhancement (Month 4-6)

Add server-side processing for:
1. **Paid users**: Higher limits, faster processing
2. **Batch operations**: Queue system with webhooks
3. **Enterprise**: Dedicated instances, SLA

### Phase 3: Portable Infrastructure (Month 6+)

Design for easy migration:

```yaml
# docker-compose.yml for self-hosting
version: '3.8'
services:
  api:
    image: formatfuse/api:latest
    environment:
      - PROCESSING_MODE=server
      - MAX_FILE_SIZE=100MB
    ports:
      - "3000:3000"
  
  worker:
    image: formatfuse/worker:latest
    deploy:
      replicas: 4
    environment:
      - WORKER_TYPE=wasm
```

## Implementation Strategy

### 1. Start with Cloudflare Workers ($5-50/month)
- Minimal infrastructure
- No egress fees
- Global edge network
- Easy to implement

### 2. API Endpoints Design
```
GET  /api/formats              - List supported conversions
POST /api/convert/prepare      - Get client processing instructions
POST /api/convert              - Direct conversion (small files)
POST /api/batch                - Queue batch job
GET  /api/batch/:id            - Check batch status
POST /api/webhook              - Register completion webhook
```

### 3. Authentication & Rate Limiting
```typescript
// Use Cloudflare's native tools
const rateLimit = {
  free: { requests: 100, window: '1h', maxFileSize: '10MB' },
  paid: { requests: 1000, window: '1h', maxFileSize: '100MB' },
  enterprise: { requests: 10000, window: '1h', maxFileSize: '1GB' }
};
```

### 4. Monitoring & Analytics
- Cloudflare Analytics (built-in)
- Custom metrics to Grafana Cloud
- Error tracking with Sentry

## Migration Path

### From Cloudflare to Self-Hosted

1. **Containerize the API**
   ```dockerfile
   FROM node:20-alpine
   COPY --from=build /app/dist /app
   COPY --from=wasm /wasm /app/wasm
   CMD ["node", "server.js"]
   ```

2. **Use standard interfaces**
   - Express.js compatible routes
   - Standard HTTP/REST
   - JWT for auth
   - Redis for rate limiting

3. **Data portability**
   - SQLite for metadata (portable)
   - S3-compatible object storage
   - Standard queue (Redis/RabbitMQ)

## Cost Projections

### Scenario 1: Moderate Usage (100k conversions/month)
- **Azure**: ~$150-200/month (mostly egress)
- **Cloudflare**: ~$15-30/month
- **Self-hosted**: ~$50/month (DigitalOcean/Hetzner)

### Scenario 2: High Usage (1M conversions/month)
- **Azure**: ~$800-1200/month
- **Cloudflare**: ~$50-100/month
- **Self-hosted**: ~$200-300/month

## Recommended Tech Stack

### API Layer
- **Cloudflare Workers** (TypeScript)
- **Hono** framework (portable, works in Workers & Node)
- **JWT** authentication
- **Zod** for validation

### Storage
- **R2** for temporary files (S3-compatible)
- **D1** for metadata (SQLite)
- **KV** for rate limiting

### Monitoring
- **Cloudflare Analytics**
- **Sentry** for errors
- **Grafana Cloud** for custom metrics

## Security Considerations

1. **File Validation**
   - Magic byte checking
   - Size limits
   - Virus scanning (ClamAV)

2. **Rate Limiting**
   - Per-IP limits
   - Per-API key limits
   - Graduated backoff

3. **Data Privacy**
   - Auto-delete files after 1 hour
   - No logging of file contents
   - Encrypted at rest

## Next Steps

### Week 1
1. Set up Cloudflare Workers project
2. Implement basic API endpoints
3. Add authentication system
4. Deploy MVP

### Week 2
1. Add rate limiting
2. Implement file validation
3. Set up monitoring
4. Create API documentation

### Week 3
1. Build SDK (JavaScript/Python)
2. Create Zapier integration
3. Add batch processing
4. Performance optimization

## Conclusion

**Cloudflare Workers** offers the best balance of:
- **Low cost** ($5-50/month vs $200+ on Azure)
- **No egress fees** (huge savings for file conversion)
- **Easy portability** (can move to containers later)
- **Global performance** (edge network)
- **Simple scaling** (automatic)

The hybrid approach keeps costs minimal while providing a clear upgrade path for users who need server-side processing.
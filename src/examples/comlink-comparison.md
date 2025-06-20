# Comlink vs PostMessage Comparison

## Before: Traditional postMessage Pattern

```typescript
// worker.ts
self.addEventListener('message', async (event) => {
  const { type, id, payload } = event.data;
  
  try {
    switch (type) {
      case 'CONVERT':
        // Send progress updates
        self.postMessage({ type: 'PROGRESS', id, progress: 10 });
        
        const result = await convertImage(payload.file);
        
        self.postMessage({ 
          type: 'COMPLETE', 
          id,
          result 
        });
        break;
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      id,
      error: error.message 
    });
  }
});

// main.ts
const worker = new Worker('./worker.js');
const pendingOperations = new Map();

worker.addEventListener('message', (e) => {
  const { type, id, result, progress, error } = e.data;
  const pending = pendingOperations.get(id);
  
  if (!pending) return;
  
  switch (type) {
    case 'PROGRESS':
      pending.onProgress?.(progress);
      break;
    case 'COMPLETE':
      pending.resolve(result);
      pendingOperations.delete(id);
      break;
    case 'ERROR':
      pending.reject(new Error(error));
      pendingOperations.delete(id);
      break;
  }
});

function convertImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    pendingOperations.set(id, { resolve, reject, onProgress });
    worker.postMessage({ 
      type: 'CONVERT', 
      id,
      payload: { file } 
    });
  });
}
```

## After: Clean Comlink Pattern

```typescript
// worker.ts
import * as Comlink from 'comlink';

class ImageConverter {
  async convert(file: Uint8Array, onProgress?: (p: number) => void) {
    onProgress?.(10);
    const result = await convertImage(file);
    onProgress?.(100);
    return Comlink.transfer(result, [result.buffer]);
  }
}

Comlink.expose(ImageConverter);

// main.ts
import * as Comlink from 'comlink';

const worker = new Worker('./worker.js');
const Converter = Comlink.wrap(worker);
const converter = await new Converter();

// That's it! Just use it like a normal async function
const result = await converter.convert(
  file,
  Comlink.proxy((progress) => console.log(`Progress: ${progress}%`))
);
```

## Key Differences

| Aspect | postMessage | Comlink |
|--------|------------|---------|
| **Lines of Code** | ~60 lines | ~15 lines |
| **Type Safety** | Manual typing | Full TypeScript support |
| **Error Handling** | Manual try/catch propagation | Automatic error propagation |
| **Progress Callbacks** | Complex message routing | Simple callback proxy |
| **Memory Transfer** | Manual transferable lists | Built-in transfer() helper |
| **Cleanup** | Manual tracking | Automatic with releaseProxy |

## Real Benefits in FormatFuse

1. **Reduced Complexity**: Each worker went from ~100 lines to ~30 lines
2. **Better Developer Experience**: IntelliSense and type checking work perfectly
3. **Easier Testing**: Can mock workers as simple async functions
4. **Performance**: Zero overhead for transfers with Comlink.transfer()
5. **Maintainability**: New developers understand the code immediately
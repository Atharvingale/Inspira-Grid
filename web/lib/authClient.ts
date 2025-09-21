import { authHeaders } from './api';

// Re-export authHeaders for dynamic import usage
export { authHeaders };

// This file allows for dynamic imports like:
// const headers = await (await import("@/lib/authClient")).authHeaders();
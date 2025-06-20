# TECHNICAL IMPLEMENTATION PLAN: ENSURANCE APP REHABILITATION

## Executive Summary: From Disaster to Production-Ready

This implementation plan provides a systematic approach to transform your codebase from a security-vulnerable, performance-poor demo into a production-ready application. The plan is structured in phases to minimize disruption while addressing critical issues first.

**Estimated Timeline**: 16-20 weeks
**Team Size**: 3-4 senior developers
**Cost**: High, but necessary to avoid catastrophic failure

## PHASE 1: EMERGENCY SECURITY FIXES (Week 1-2) - CRITICAL

### 1.1 Immediate SQL Injection Remediation

**Priority**: STOP EVERYTHING AND FIX THIS FIRST

**Files to Fix**:
- `src/lib/database/accounts.ts`
- `src/lib/database/metadata.ts`
- All database service files

**Implementation**:

```typescript
// BEFORE (VULNERABLE):
const tableName = `accounts_${group.group_name.substring(1)}`;
const result = await sql.query(`SELECT ... FROM members.${tableName}`);

// AFTER (SECURE):
import { z } from 'zod';

const GroupNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);

const getAccountsByGroup = async (groupName: string) => {
  // Validate and sanitize input
  const validGroupName = GroupNameSchema.parse(groupName);
  
  // Use parameterized queries with whitelisted table names
  const allowedTables = ['accounts_earth', 'accounts_basin', /* ... */];
  const tableName = `accounts_${validGroupName}`;
  
  if (!allowedTables.includes(tableName)) {
    throw new Error('Invalid group name');
  }
  
  // Use prepared statements
  const result = await sql`
    SELECT full_account_name, token_id, is_agent, tba_address
    FROM members.${sql.unsafe(tableName)}
    WHERE is_active = true
    ORDER BY full_account_name
  `;
  
  return result.rows;
};
```

### 1.2 Input Validation Framework

**Install Dependencies**:
```bash
npm install zod @hookform/resolvers joi
```

**Create Validation Schemas**:
```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const TokenIdSchema = z.string().regex(/^\d+$/);
export const AmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export const SwapRequestSchema = z.object({
  sellToken: AddressSchema,
  buyToken: AddressSchema,
  sellAmount: AmountSchema,
  taker: AddressSchema,
  slippageBps: z.string().regex(/^\d+$/).optional(),
});
```

**API Route Example**:
```typescript
// src/app/api/0x/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);
    
    // Validate all inputs
    const validatedParams = SwapRequestSchema.parse(params);
    
    // Continue with validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    // Handle other errors...
  }
}
```

### 1.3 Environment Variable Security Audit

**Create Environment Variable Documentation**:
```typescript
// src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  // Server-only variables
  DATABASE_URL: z.string().url(),
  ZEROX_API_KEY: z.string().min(1),
  ALCHEMY_API_KEY: z.string().min(1),
  MORALIS_API_KEY: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  
  // Client-safe variables  
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1),
  NEXT_PUBLIC_BLOB_URL: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
```

## PHASE 2: ARCHITECTURAL FOUNDATION (Week 3-6)

### 2.1 Database Layer Redesign

**Install Database Tools**:
```bash
npm install drizzle-orm drizzle-kit postgres @types/pg
npm install -D pg
```

**Create Proper Database Schema**:
```typescript
// src/lib/db/schema.ts
import { pgTable, text, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';

export const groups = pgTable('groups', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  groupName: varchar('group_name', { length: 100 }).notNull().unique(),
  contractAddress: varchar('contract_address', { length: 42 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  groupId: integer('group_id').references(() => groups.id),
  tokenId: integer('token_id').notNull(),
  accountName: varchar('account_name', { length: 100 }),
  fullAccountName: varchar('full_account_name', { length: 200 }),
  tbaAddress: varchar('tba_address', { length: 42 }),
  isAgent: boolean('is_agent').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Database Connection with Pooling**:
```typescript
// src/lib/db/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env';

const connectionString = env.DATABASE_URL;
const sql = postgres(connectionString, {
  max: 20, // Maximum connections in pool
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql);
```

**Repository Pattern Implementation**:
```typescript
// src/lib/repositories/AccountRepository.ts
import { db } from '@/lib/db/connection';
import { accounts, groups } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class AccountRepository {
  async getAccountsByGroup(groupName: string, limit = 50, offset = 0) {
    return await db
      .select({
        id: accounts.id,
        tokenId: accounts.tokenId,
        accountName: accounts.accountName,
        fullAccountName: accounts.fullAccountName,
        tbaAddress: accounts.tbaAddress,
        isAgent: accounts.isAgent,
      })
      .from(accounts)
      .innerJoin(groups, eq(accounts.groupId, groups.id))
      .where(and(
        eq(groups.groupName, groupName),
        eq(accounts.isActive, true)
      ))
      .orderBy(desc(accounts.isAgent), accounts.accountName)
      .limit(limit)
      .offset(offset);
  }

  async getAccountByFullName(fullAccountName: string) {
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.fullAccountName, fullAccountName))
      .limit(1);
    
    return result[0] || null;
  }
}
```

### 2.2 Proper Caching Strategy

**Install Redis and Caching Tools**:
```bash
npm install ioredis @upstash/redis
npm install -D @types/ioredis
```

**Cache Service Implementation**:
```typescript
// src/lib/cache/CacheService.ts
import Redis from 'ioredis';
import { env } from '@/config/env';

class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

export const cacheService = new CacheService();
```

**Cache Wrapper for API Routes**:
```typescript
// src/lib/cache/withCache.ts
import { NextResponse } from 'next/server';
import { cacheService } from './CacheService';

export function withCache<T>(
  key: string,
  ttl: number = 300 // 5 minutes default
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        // Try cache first
        const cached = await cacheService.get<T>(key);
        if (cached) {
          return NextResponse.json(cached);
        }
        
        // Execute original method
        const result = await method.apply(this, args);
        
        // Cache the result
        if (result.status === 200) {
          const data = await result.json();
          await cacheService.set(key, data, ttl);
        }
        
        return result;
      } catch (error) {
        console.error('Cache wrapper error:', error);
        return method.apply(this, args);
      }
    };
  };
}
```

### 2.3 Proper Error Handling and Logging

**Install Logging Framework**:
```bash
npm install winston pino pino-pretty
npm install -D @types/pino
```

**Structured Logging Setup**:
```typescript
// src/lib/logging/logger.ts
import pino from 'pino';
import { env } from '@/config/env';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

export { logger };
```

**Error Handler Utility**:
```typescript
// src/lib/errors/ErrorHandler.ts
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown, context: string) {
  logger.error({ error, context }, 'API Error occurred');

  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Never expose internal errors in production
  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error instanceof Error ? error.message : 'Unknown error';

  return NextResponse.json(
    { 
      error: message,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
```

## PHASE 3: TYPE SAFETY AND CODE QUALITY (Week 7-10)

### 3.1 Eliminate All `any` Types

**Create Proper Type Definitions**:
```typescript
// src/types/blockchain.ts
export interface SwapQuoteResponse {
  liquidityAvailable: boolean;
  transaction: {
    to: string;
    data: string;
    value: string;
    gas?: string;
  };
  permit2?: {
    eip712: any; // This can be more specific
  };
  allowanceTarget?: string;
  sellAmount: string;
  buyAmount: string;
  sellToken: string;
  buyToken: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

// src/types/database.ts
export interface Account {
  id: number;
  tokenId: number;
  accountName: string | null;
  fullAccountName: string;
  tbaAddress: string | null;
  isAgent: boolean;
  groupName: string;
}

export interface Group {
  id: number;
  groupName: string;
  contractAddress: string;
  isActive: boolean;
}
```

**Fix Error Handling**:
```typescript
// BEFORE:
catch (error: any) {
  console.error('Error:', error);
}

// AFTER:
catch (error: unknown) {
  if (error instanceof Error) {
    logger.error({ error: error.message, stack: error.stack }, 'Operation failed');
  } else {
    logger.error({ error: String(error) }, 'Unknown error occurred');
  }
}
```

### 3.2 API Response Standardization

**Create Response Types**:
```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Response Helper**:
```typescript
// src/lib/api/responses.ts
import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types/api';

export function successResponse<T>(data: T, status = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return NextResponse.json(response, { status });
}

export function errorResponse(
  error: string,
  code: string = 'ERROR',
  status = 500
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    code,
  };
  return NextResponse.json(response, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
  return NextResponse.json(response);
}
```

### 3.3 Remove All Console.log Statements

**Create Search and Replace Script**:
```bash
# Find all console.log statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" > console_statements.txt

# Replace with proper logging
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log/logger.debug/g'
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error/logger.error/g'
find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.warn/logger.warn/g'
```

**Manual Cleanup Required**:
- Review each logging statement
- Add proper context and structured data
- Remove debug statements that aren't needed
- Convert important logs to proper structured logging

## PHASE 4: PERFORMANCE AND SCALABILITY (Week 11-14)

### 4.1 Implement Pagination

**Pagination Utility**:
```typescript
// src/lib/pagination/utils.ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function validatePaginationParams(
  page?: string,
  limit?: string
): PaginationParams {
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
  
  return { page: pageNum, limit: limitNum };
}

export function createPaginationResult<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
```

**Update Repository Methods**:
```typescript
// Update all repository methods to support pagination
export class AccountRepository {
  async getAccountsByGroup(
    groupName: string,
    page = 1,
    limit = 20
  ): Promise<PaginationResult<Account>> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const [totalResult] = await db
      .select({ count: sql`COUNT(*)`.mapWith(Number) })
      .from(accounts)
      .innerJoin(groups, eq(accounts.groupId, groups.id))
      .where(and(
        eq(groups.groupName, groupName),
        eq(accounts.isActive, true)
      ));
    
    const total = totalResult.count;
    
    // Get paginated data
    const data = await db
      .select()
      .from(accounts)
      .innerJoin(groups, eq(accounts.groupId, groups.id))
      .where(and(
        eq(groups.groupName, groupName),
        eq(accounts.isActive, true)
      ))
      .orderBy(desc(accounts.isAgent), accounts.accountName)
      .limit(limit)
      .offset(offset);
    
    return createPaginationResult(data, page, limit, total);
  }
}
```

### 4.2 Implement Request Deduplication

**Request Deduplication Middleware**:
```typescript
// src/lib/middleware/deduplication.ts
import { NextRequest } from 'next/server';
import { cacheService } from '@/lib/cache/CacheService';

const pendingRequests = new Map<string, Promise<any>>();

export function withDeduplication<T>(keyGenerator: (req: NextRequest) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: NextRequest, ...args: any[]) {
      const key = keyGenerator(req);
      
      // Check if request is already pending
      if (pendingRequests.has(key)) {
        return await pendingRequests.get(key);
      }
      
      // Execute request and store promise
      const promise = method.apply(this, [req, ...args]);
      pendingRequests.set(key, promise);
      
      try {
        const result = await promise;
        return result;
      } finally {
        // Clean up pending requests
        pendingRequests.delete(key);
      }
    };
  };
}
```

### 4.3 Background Job Processing

**Install Queue System**:
```bash
npm install bull bullmq ioredis
npm install -D @types/bull
```

**Job Queue Setup**:
```typescript
// src/lib/jobs/queue.ts
import { Queue, Worker } from 'bullmq';
import { logger } from '@/lib/logging/logger';
import { env } from '@/config/env';

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

// Create queues
export const syncQueue = new Queue('sync', { connection });
export const metadataQueue = new Queue('metadata', { connection });

// Sync worker
const syncWorker = new Worker('sync', async (job) => {
  const { type, params } = job.data;
  
  logger.info({ type, params }, 'Processing sync job');
  
  try {
    switch (type) {
      case 'accounts':
        await syncAccountsJob(params);
        break;
      case 'metadata':
        await syncMetadataJob(params);
        break;
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  } catch (error) {
    logger.error({ error, type, params }, 'Sync job failed');
    throw error;
  }
}, { connection });

syncWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Sync job completed');
});

syncWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Sync job failed');
});
```

## PHASE 5: TESTING INFRASTRUCTURE (Week 15-16)

### 5.1 Unit Testing Setup

**Install Testing Dependencies**:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @types/jest jest-environment-jsdom
```

**Jest Configuration**:
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

**Example Test Files**:
```typescript
// src/lib/repositories/__tests__/AccountRepository.test.ts
import { AccountRepository } from '../AccountRepository';
import { db } from '@/lib/db/connection';

jest.mock('@/lib/db/connection');

describe('AccountRepository', () => {
  let repository: AccountRepository;

  beforeEach(() => {
    repository = new AccountRepository();
    jest.clearAllMocks();
  });

  describe('getAccountsByGroup', () => {
    it('should return paginated accounts for a group', async () => {
      const mockAccounts = [
        { id: 1, tokenId: 1, accountName: 'test', /* ... */ },
      ];

      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockAccounts),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await repository.getAccountsByGroup('earth', 1, 20);

      expect(result.data).toEqual(mockAccounts);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });
});
```

### 5.2 Integration Testing

**API Route Testing**:
```typescript
// src/app/api/accounts/__tests__/route.test.ts
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('/api/accounts', () => {
  it('should return paginated accounts', async () => {
    const request = new NextRequest('http://localhost/api/accounts?page=1&limit=10');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.meta).toMatchObject({
      page: 1,
      limit: 10,
    });
  });

  it('should validate pagination parameters', async () => {
    const request = new NextRequest('http://localhost/api/accounts?page=invalid&limit=1000');
    
    const response = await GET(request);
    
    expect(response.status).toBe(400);
  });
});
```

## PHASE 6: MONITORING AND OBSERVABILITY (Week 17-18)

### 6.1 Application Performance Monitoring

**Install APM Tools**:
```bash
npm install @sentry/nextjs @vercel/analytics
```

**Sentry Configuration**:
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  environment: process.env.NODE_ENV,
});
```

**Custom Metrics**:
```typescript
// src/lib/monitoring/metrics.ts
import { logger } from '@/lib/logging/logger';

export class Metrics {
  static trackApiCall(endpoint: string, method: string, statusCode: number, duration: number) {
    logger.info({
      metric: 'api_call',
      endpoint,
      method,
      statusCode,
      duration,
    }, 'API call metrics');
  }

  static trackDatabaseQuery(query: string, duration: number) {
    logger.info({
      metric: 'database_query',
      query: query.substring(0, 100), // Truncate for privacy
      duration,
    }, 'Database query metrics');
  }

  static trackBlockchainTransaction(txHash: string, success: boolean, gasUsed?: number) {
    logger.info({
      metric: 'blockchain_transaction',
      txHash,
      success,
      gasUsed,
    }, 'Blockchain transaction metrics');
  }
}
```

### 6.2 Health Checks and Status Pages

**Health Check Endpoint**:
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { cacheService } from '@/lib/cache/CacheService';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      cache: 'unknown',
    },
  };

  try {
    // Check database
    await db.execute('SELECT 1');
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }

  try {
    // Check cache
    await cacheService.set('health-check', 'ok', 10);
    await cacheService.get('health-check');
    health.checks.cache = 'healthy';
  } catch (error) {
    health.checks.cache = 'unhealthy';
    health.status = 'unhealthy';
  }

  const status = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status });
}
```

## PHASE 7: DEPLOYMENT AND INFRASTRUCTURE (Week 19-20)

### 7.1 Environment Configuration

**Proper Environment Management**:
```typescript
// src/config/environments.ts
export const environments = {
  development: {
    database: {
      maxConnections: 5,
      queryTimeout: 10000,
    },
    cache: {
      ttl: 300,
    },
    blockchain: {
      confirmations: 1,
    },
  },
  staging: {
    database: {
      maxConnections: 10,
      queryTimeout: 30000,
    },
    cache: {
      ttl: 600,
    },
    blockchain: {
      confirmations: 3,
    },
  },
  production: {
    database: {
      maxConnections: 20,
      queryTimeout: 30000,
    },
    cache: {
      ttl: 3600,
    },
    blockchain: {
      confirmations: 5,
    },
  },
};
```

### 7.2 Database Migrations

**Migration System**:
```bash
npm install -D drizzle-kit
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Migration Scripts**:
```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 7.3 CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=moderate
      - run: npx snyk test

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
```

## IMPLEMENTATION PRIORITIES

### Immediate (Week 1-2):
1. **SQL Injection Fixes** - Stop everything and fix this first
2. **Input Validation** - Implement comprehensive validation
3. **Environment Variable Audit** - Secure all sensitive data

### High Priority (Week 3-6):
1. **Database Redesign** - Proper schema and connection management
2. **Caching Strategy** - Replace amateur cache with Redis
3. **Error Handling** - Structured logging and proper error responses

### Medium Priority (Week 7-14):
1. **Type Safety** - Eliminate all `any` types
2. **Performance** - Pagination, deduplication, background jobs
3. **Code Quality** - Remove console.logs, standardize responses

### Lower Priority (Week 15-20):
1. **Testing** - Comprehensive test suite
2. **Monitoring** - APM and observability
3. **Infrastructure** - Proper deployment and CI/CD

## SUCCESS METRICS

### Security:
- ✅ Zero SQL injection vulnerabilities
- ✅ All inputs validated and sanitized
- ✅ No sensitive data exposure
- ✅ Proper CORS configuration

### Performance:
- ✅ All API endpoints respond in <200ms
- ✅ Database queries optimized and indexed
- ✅ Proper caching with >80% hit rate
- ✅ Memory usage stable and predictable

### Code Quality:
- ✅ 90%+ TypeScript strict mode compliance
- ✅ Zero `any` types in production code
- ✅ 70%+ test coverage
- ✅ All linting rules passing

### Reliability:
- ✅ 99.9% uptime SLA
- ✅ Proper error handling and recovery
- ✅ Comprehensive monitoring and alerting
- ✅ Automated deployment pipeline

## TOTAL ESTIMATED COST

**Development Time**: 20 weeks × 3 developers = 60 developer-weeks
**Infrastructure**: Redis, monitoring tools, testing services
**External Services**: APM, error tracking, security scanning

**Total Investment**: Significant, but necessary to avoid catastrophic failure in production.

The alternative is continuing with the current codebase and facing inevitable security breaches, data loss, performance failures, and developer productivity collapse. The choice is clear: invest now in doing it right, or pay much more later when everything inevitably breaks.
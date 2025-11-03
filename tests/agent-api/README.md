# Agent API Test Suite

Comprehensive test suite for the Biddable Agent API, covering authentication, validation, CRUD operations, and error handling.

## Test Files

- **test_authentication.ts** - API key authentication, authorization, and access control
- **test_campaigns.ts** - Campaign CRUD operations and validation
- **test_validation.ts** - Zod schema validation and error formatting

## Prerequisites

1. **Node.js** (v18 or higher)
2. **pnpm** (package manager)
3. **Running development server** (`npm run dev` on port 3000)
4. **Valid API key** from your Biddable organization

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Environment File

Create a `.env.test` file in the project root (copy from `.env.local.example`):

```bash
cp .env.local.example .env.test
```

Then add your test API key to `.env.test`:

```bash
# Agent API Testing
TEST_API_URL=http://localhost:3000
TEST_API_KEY=bbl_your_api_key_here  # Replace with actual key
```

### 3. Get Your API Key

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000/profile
3. Scroll to "Organization API Keys" section
4. Click "Create New Key"
5. Copy the key (starts with `bbl_`)
6. Add it to `.env.test`

## Running Tests

### Run All Tests

```bash
pnpm test:agent-api
```

### Run Specific Test File

```bash
# Authentication tests
pnpm test tests/agent-api/test_authentication.ts

# Campaign tests
pnpm test tests/agent-api/test_campaigns.ts

# Validation tests
pnpm test tests/agent-api/test_validation.ts
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

## Test Categories

### 1. Authentication Tests (`test_authentication.ts`)

Tests API key authentication and security:

- ✅ Valid API key acceptance
- ✅ Invalid API key rejection
- ✅ Missing API key rejection
- ✅ Malformed Authorization header handling
- ✅ Response headers (X-Request-ID, rate limits)
- ✅ Organization data isolation
- ✅ Standardized error response format

### 2. Campaign Tests (`test_campaigns.ts`)

Tests all campaign CRUD operations:

**Create:**
- ✅ Valid campaign creation
- ✅ Empty name rejection
- ✅ Invalid platform rejection
- ✅ Budget validation (min/max)
- ✅ Date format validation
- ✅ Date range validation (end > start)
- ✅ Goal length validation

**List:**
- ✅ Pagination (limit/offset)
- ✅ Limit parameter validation

**Get:**
- ✅ Get by ID
- ✅ 404 for non-existent campaigns
- ✅ Invalid ID handling

**Update:**
- ✅ Single field updates
- ✅ Multiple field updates
- ✅ Partial update validation

**Delete:**
- ✅ Successful deletion
- ✅ 404 for non-existent campaigns

### 3. Validation Tests (`test_validation.ts`)

Tests Zod schema validation and error handling:

**Campaign Schemas:**
- ✅ CampaignCreateSchema validation
- ✅ CampaignUpdateSchema validation
- ✅ Field-level validation errors
- ✅ Date range validation
- ✅ Budget constraints

**Audience Schemas:**
- ✅ AudienceCreateSchema validation
- ✅ Age range validation (13-100)
- ✅ Gender enum validation

**Pagination:**
- ✅ Default values
- ✅ Limit/offset constraints

**Error Classes:**
- ✅ ValidationError
- ✅ BudgetExceededError
- ✅ NotFoundError
- ✅ Error formatting

## Expected Results

All tests should pass when:
- ✅ Development server is running
- ✅ Valid API key is set in `.env.test`
- ✅ Database is properly configured
- ✅ No budget limits are exceeded

## Troubleshooting

### Tests Fail with "TEST_API_KEY not set"

**Solution:** Create `.env.test` file with your API key:
```bash
TEST_API_KEY=bbl_your_key_here
```

### Tests Fail with "Connection refused"

**Solution:** Make sure the dev server is running:
```bash
npm run dev
```

### Tests Fail with "Budget exceeded"

**Solution:** Your organization might have too many campaigns. Either:
- Delete some test campaigns from the UI
- Increase the budget limit in the test data
- Use a different organization

### Tests Fail with "401 Unauthorized"

**Solution:** Your API key might be invalid or expired:
1. Go to /profile page
2. Create a new API key
3. Update `.env.test` with the new key

### Campaign Tests Leave Data Behind

**Solution:** The test suite automatically cleans up created campaigns in the `afterAll` hook. If tests are interrupted, you may need to manually delete test campaigns from the UI.

## Writing New Tests

### Test Template

```typescript
import { describe, test, expect } from '@jest/globals'

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const VALID_API_KEY = process.env.TEST_API_KEY || ''

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_API_KEY}`,
      ...options.headers,
    },
  })
}

describe('My New Test Suite', () => {
  test('should do something', async () => {
    const response = await makeRequest('/api/v1/agent/my-endpoint')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

### Best Practices

1. **Cleanup:** Always clean up test data in `afterAll` hooks
2. **Isolation:** Tests should not depend on each other
3. **Descriptive Names:** Use clear, descriptive test names
4. **Error Cases:** Test both success and failure scenarios
5. **Real Data:** Use realistic test data that matches production patterns

## Test Coverage Goals

- ✅ Authentication: 100%
- ✅ Campaign CRUD: 100%
- ✅ Validation: 100%
- ⏸ Asset Operations: TODO
- ⏸ Audience Operations: TODO
- ⏸ Rate Limiting: TODO
- ⏸ Budget Validation: TODO

## CI/CD Integration

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Agent API Tests
  env:
    TEST_API_URL: http://localhost:3000
    TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
  run: pnpm test:agent-api
```

## Performance

Test suite execution time (approximate):
- Authentication tests: ~2 seconds
- Campaign tests: ~10 seconds
- Validation tests: ~1 second
- **Total:** ~13 seconds

## Contributing

When adding new endpoints:
1. Create Zod schema in `lib/agent-api-schemas.ts`
2. Add error handling in endpoint
3. Write comprehensive tests
4. Update this README

## Questions?

See the main [Agent API Test Guide](../../RATE_LIMIT_BUDGET_TEST_GUIDE.md) for more details.

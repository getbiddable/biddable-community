BIDDABLE AGENT API DOCUMENTATION
================================================================================

Welcome to the Biddable Agent API documentation. This API enables programmatic
access to campaign, asset, and audience management for AI agents and automation
tools.


DOCUMENTATION STRUCTURE
================================================================================

This documentation is organized into the following files:

getting-started.txt
  Quick start guide covering authentication, first requests, and common
  workflows. Start here if you are new to the API.

api-reference.txt
  Complete reference for all API endpoints including request/response formats,
  parameters, and validation rules.

error-codes.txt
  Comprehensive guide to all error codes, their causes, and resolutions.
  Includes error handling best practices.

examples.txt
  Practical code examples in curl, Python, and JavaScript. Covers common
  use cases and error scenarios.


QUICK LINKS
================================================================================

API Base URL: https://your-domain.com/api/v1/agent

Key Concepts:
- Authentication: Bearer token (API key)
- Rate Limit: 1000 requests/hour (varies by endpoint)
- Budget Limit: $10,000/month per organization
- Response Format: JSON with success/error structure


GETTING YOUR API KEY
================================================================================

1. Log in to Biddable
2. Navigate to your profile page
3. Scroll to "Organization API Keys"
4. Click "Create New Key"
5. Copy the key (shown only once)

Note: API keys are shared across your entire organization.


AUTHENTICATION
================================================================================

All requests require authentication:

Authorization: Bearer YOUR_API_KEY

Example:
curl -H "Authorization: Bearer bbl_abc123..." \
  https://your-domain.com/api/v1/agent/campaigns/list


AVAILABLE ENDPOINTS
================================================================================

Campaigns
---------
GET    /campaigns/list           List all campaigns
POST   /campaigns/create         Create new campaign
GET    /campaigns/{id}/get       Get campaign details
PATCH  /campaigns/{id}/update    Update campaign
DELETE /campaigns/{id}/delete    Delete campaign

Assets
------
GET    /assets/list              List all assets
POST   /campaigns/{id}/assets    Assign asset to campaign
GET    /campaigns/{id}/assets    List campaign assets
DELETE /campaigns/{id}/assets    Unassign asset from campaign

Audiences
---------
GET    /audiences/list           List all audiences
POST   /campaigns/{id}/audiences Assign audience to campaign
GET    /campaigns/{id}/audiences List campaign audiences
DELETE /campaigns/{id}/audiences Unassign audience from campaign

Budget
------
GET    /budget/status            Get budget status


RATE LIMITS
================================================================================

Global: 1000 requests/hour per API key

Per-endpoint limits:
- List operations: 200 requests/hour
- Create operations: 10-50 requests/hour
- Update operations: 50 requests/hour
- Delete operations: 10 requests/hour

Check X-RateLimit-* headers in responses to monitor usage.


BUDGET CONTROLS
================================================================================

Monthly Limit: $10,000 per organization

The API enforces budget limits on:
- Campaign creation
- Campaign budget updates

Use GET /budget/status to check available budget before operations.


VALIDATION RULES
================================================================================

Key validation rules:

Campaigns:
- Name: 1-100 characters
- Budget: $1-$10,000 per campaign
- Dates: YYYY-MM-DD format, end_date > start_date
- Platforms: At least one of [google, youtube, reddit, meta]

Assets:
- Name: 1-100 characters
- Text ad headlines: Max 30 characters
- Text ad descriptions: Max 90 characters
- Reddit ad headline: Max 300 characters

Audiences:
- Name: 1-100 characters
- Age range: 13-100, age_min <= age_max

See api-reference.txt for complete validation rules.


RESPONSE FORMAT
================================================================================

Success Response:
{
  "success": true,
  "data": {
    // Response data
  }
}

Error Response:
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description",
    "details": {},
    "timestamp": "2025-11-03T12:34:56Z",
    "request_id": "req_abc123"
  }
}

Always check the success field to determine if the request succeeded.


COMMON ERROR CODES
================================================================================

401 UNAUTHORIZED         Invalid or missing API key
400 VALIDATION_ERROR     Input validation failed
400 BUDGET_EXCEEDED      Monthly budget limit exceeded
404 RESOURCE_NOT_FOUND   Resource does not exist
409 DUPLICATE_RESOURCE   Resource already exists
429 RATE_LIMIT_EXCEEDED  Too many requests

See error-codes.txt for complete list and handling guidance.


TESTING
================================================================================

A comprehensive test suite is available in tests/agent-api/

Setup:
1. Copy .env.local.example to .env.test
2. Add your API key to .env.test
3. Run: npm run test:agent-api

See tests/agent-api/README.md for detailed testing guide.


EXAMPLE: CREATE CAMPAIGN
================================================================================

curl -X POST https://your-domain.com/api/v1/agent/campaigns/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale",
    "platforms": ["google", "reddit"],
    "budget": 5000,
    "start_date": "2025-06-01",
    "end_date": "2025-08-31",
    "goal": "Drive sales"
  }'

See examples.txt for more code examples in curl, Python, and JavaScript.


SUPPORT
================================================================================

For issues or questions:

1. Review error response with request_id
2. Check error-codes.txt for error resolution
3. Consult examples.txt for similar use cases
4. Review audit logs in your account
5. Contact support with request_id if needed


NEXT STEPS
================================================================================

1. Read getting-started.txt for quick start guide
2. Review api-reference.txt for endpoint details
3. Study examples.txt for code samples
4. Run test suite to verify integration
5. Implement error handling per error-codes.txt


VERSION INFORMATION
================================================================================

API Version: v1
Documentation Version: 1.0
Last Updated: November 3, 2025

Changes are documented in ClaudeLog.txt and agentic-buying-plan.txt.

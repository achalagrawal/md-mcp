# JV Adhyaan REST API Documentation

## Overview

JV Adhyaan is a Django-based book management system that provides RESTful APIs for accessing books, events, word definitions (paribhasha), how-to videos, and feedback. The API is built using Django REST Framework (DRF) and supports both token-based and session-based authentication.

**Current API Version:** v1

## Base URL

```
Production: https://db.madhyasth.org/api/v1/
```

All endpoints listed below are relative to `/api/v1/` unless otherwise specified.


## Common Request Headers

```
Content-Type: application/json
Accept: application/json
```

## Pagination

The API uses page-based pagination for list endpoints.

**Default Pagination:**
- Page size: 20 items
- Max page size: 100 items

**Query Parameters:**
- `page` - Page number (default: 1)
- `page_size` - Number of items per page (max: 100)

**Paginated Response Format:**
```json
{
  "count": 45,
  "next": "http://api.example.com/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```

## Permissions

The API uses custom permission classes:

- **ReadOnly** - Only GET, HEAD, OPTIONS methods allowed (public read access)
- **IsAuthenticatedOrReadOnly** - Read access for all, write access for authenticated users
- **IsAdminUserOrReadOnly** - Read access for all, write access for staff/admin users
- **IsStaffUser** - Staff/admin users only

Most read endpoints are open to the public. Write operations typically require authentication.

---

## API Endpoints

### Books

#### 1. List All Books

Get a list of all published books.

**Endpoint:** `GET /books/`

**Permission:** Public (no authentication required)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Madhyasth Darshan",
    "author_name": "Baba A. Nagraj",
    "total_pages": 350,
    "verification_status": "verified",
    "category": "darshan",
    "cover_image_base64": "data:image/jpeg;base64,...",
    "cover_file": "http://example.com/media/books/cover_images/book1.jpg"
  },
  ...
]
```

**Book Categories:**
- `darshan` - Darshan
- `vaad` - Vaad
- `shastra` - Shastra
- `samvad` - Samvad
- `introductory` - Introductory
- `diary` - Diary
- `others` - Others

**Verification Status:**
- `verified` - Verified
- `unverified` - Unverified
- `rwa` - Raw

---

#### 2. Get Book Page

Retrieve a specific page from a book or the first page if no page number is specified.

**Endpoint:** `GET /books/{book_id}/`
**Endpoint:** `GET /books/{book_id}/pages/`
**Endpoint:** `GET /books/{book_id}/pages/{page_no}/`

**Permission:** Public (ReadOnly)

**URL Parameters:**
- `book_id` (integer, required) - The ID of the book
- `page_no` (integer, optional) - Page number (can be negative for preface pages, defaults to 1)

**Query Parameters:**
- `highlight` (string, optional) - Search terms to highlight in the page content

**Response:**
```json
{
  "book": {
    "id": 1,
    "title": "Madhyasth Darshan",
    "author_name": "Baba A. Nagraj",
    "total_pages": 350,
    "verification_status": "verified",
    "category": "darshan",
    "cover_file": "http://example.com/media/books/cover_images/book1.jpg"
  },
  "page": {
    "book": 1,
    "page_no": 1,
    "hard_pageno": "1",
    "content": "Plain text content of the page...",
    "html_content": "<p>HTML formatted content...</p>",
    "tables": [
      {
        "image": "http://example.com/media/page_tables/table1.jpg"
      }
    ],
    "images": [
      {
        "image": "http://example.com/media/page_images/img1.jpg"
      }
    ]
  },
  "navigation": {
    "has_next": true,
    "has_previous": false,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 350,
    "min_page": -5,
    "max_page": 350
  }
}
```

**Notes:**
- `page_no` can be negative (e.g., -1, -2) for preface pages
- `hard_pageno` is the page number as printed in the physical book
- `html_content` contains formatted HTML with images and tables inline
- Navigation data helps build page navigation UI

---

#### 3. Get Book Table of Contents

Retrieve the hierarchical table of contents for a book.

**Endpoint:** `GET /books/{book_id}/toc/`

**Permission:** Public (ReadOnly)

**URL Parameters:**
- `book_id` (integer, required) - The ID of the book

**Response:**
```json
[
  {
    "id": 1,
    "chapter_name": "Introduction",
    "page_no": 1,
    "parent": null,
    "order": 1,
    "children": [
      {
        "id": 2,
        "chapter_name": "Section 1.1",
        "page_no": 5,
        "parent": 1,
        "order": 1,
        "children": []
      }
    ]
  },
  ...
]
```

**Notes:**
- TOC entries are hierarchical with parent-child relationships
- Top-level entries have `parent: null`
- `children` array contains nested sub-chapters
- Entries are ordered by `order` and `page_no` fields

---

### Search

#### 4. Search Book Content

Search across all book content with proximity-based matching.

**Endpoint:** `GET /search/`

**Permission:** Public (ReadOnly)

**Query Parameters:**
- `q` or `query` (string, required) - Search query
- `max_distance` (integer, optional, default: 20) - Maximum word distance for proximity search
- `snippet_chars` (integer, optional, default: 300) - Number of characters in result snippet
- `highlight` (boolean, optional, default: false) - Enable highlighting of search terms
- `book_ids` (string, optional) - Comma-separated list of book IDs to search within (e.g., "1,2,3")

**Response (Paginated):**
```json
{
  "count": 15,
  "next": "http://api.example.com/search/?page=2&q=example",
  "previous": null,
  "results": [
    {
      "book_id": 1,
      "book_title": "Madhyasth Darshan",
      "page_number": 42,
      "hard_pageno": "42",
      "snippet": "...highlighted search terms appear here...",
      "query": "your search query"
    },
    ...
  ]
}
```

**Search Features:**
- Full-text search across page content
- Proximity-based search (words within specified distance)
- Context snippets with optional highlighting
- Filter by specific books using `book_ids`

**Example Requests:**
```
GET /search/?q=madhyasth&max_distance=30
GET /search/?q=samadhan&book_ids=1,2,5&highlight=true
```

---

### Events

#### 5. List Events (Paginated)

Get a paginated list of events with filtering options.

**Endpoint:** `GET /events/`

**Permission:** Public (ReadOnly)

**Query Parameters:**
- `page` (integer, optional) - Page number
- `page_size` (integer, optional) - Items per page (max: 100)
- `start_date` (date, optional) - Filter events starting on or after this date (format: YYYY-MM-DD)
- `end_date` (date, optional) - Filter events ending on or before this date (format: YYYY-MM-DD)
- `category` (integer, optional) - Filter by event category ID
- `language` (integer, optional) - Filter by language ID
- `prabodhak` (integer, optional) - Filter by speaker/prabodhak ID
- `search` (string, optional) - Search by event title (case-insensitive)
- `upcoming` (boolean, optional) - Show only upcoming events (true/1/yes)

**Response:**
```json
{
  "count": 25,
  "next": "http://api.example.com/events/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Sah-Astitva Shivir",
      "category": {
        "id": 1,
        "name": "Shivir",
        "days": 7,
        "remarks": ""
      },
      "cover_file": "http://example.com/media/event_cover_images/event1.jpg",
      "location_name": "Delhi, India",
      "location_map_link": "https://maps.google.com/?q=...",
      "date_start": "2025-03-15",
      "date_end": "2025-03-21",
      "duration_days": 7,
      "prabodhak": {
        "id": 1,
        "name": "Rakesh Kumar",
        "experience_level": "Senior",
        "remarks": ""
      },
      "language": {
        "id": 1,
        "name": "Hindi",
        "remarks": ""
      },
      "registration_link": "https://example.com/register",
      "whatsapp_group_link": "https://chat.whatsapp.com/...",
      "invitation_note": "Join us for this transformative program...",
      "fees_amount": "5000.00",
      "fees_notes": "Includes accommodation and meals",
      "contacts": [
        {
          "id": 1,
          "name": "Contact Person",
          "phone": "+91-9876543210"
        }
      ]
    },
    ...
  ]
}
```

**Example Requests:**
```
GET /events/?upcoming=true
GET /events/?category=1&language=1
GET /events/?start_date=2025-03-01&end_date=2025-03-31
GET /events/?search=shivir&prabodhak=1
```

---

#### 6. List All Events (Non-Paginated)

Get all events without pagination (useful for calendars or dropdowns).

**Endpoint:** `GET /events/all/`

**Permission:** Public (ReadOnly)

**Query Parameters:** Same as paginated events list (except `page` and `page_size`)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Sah-Astitva Shivir",
    "category": {...},
    "date_start": "2025-03-15",
    "date_end": "2025-03-21",
    ...
  },
  ...
]
```

---

#### 7. Get Event Categories

Get all available event categories.

**Endpoint:** `GET /event-categories/`

**Permission:** Public (ReadOnly)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Shivir",
    "days": 7,
    "remarks": "7-day intensive program"
  },
  {
    "id": 2,
    "name": "Workshop",
    "days": 2,
    "remarks": ""
  },
  ...
]
```

---

#### 8. Get Languages

Get all available languages.

**Endpoint:** `GET /languages/`

**Permission:** Public (ReadOnly)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Hindi",
    "remarks": ""
  },
  {
    "id": 2,
    "name": "English",
    "remarks": ""
  },
  ...
]
```

---

#### 9. Get Prabodhaks (Speakers)

Get all available prabodhaks/speakers.

**Endpoint:** `GET /prabodhaks/`

**Permission:** Public (ReadOnly)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Rakesh Kumar",
    "experience_level": "Senior",
    "remarks": "20+ years of experience"
  },
  ...
]
```

---

### Paribhasha (Word Definitions)

#### 10. Get Words with Definitions

Get all words with their paribhasha (definitions).

**Endpoint:** `GET /paribhasha/words/`

**Permission:** Public (ReadOnly)

**Query Parameters:**
- `flat` (boolean, optional) - Return paribhasha as comma-separated string instead of array (1/true/yes)

**Response (Default - Array Format):**
```json
{
  "समाधान": {
    "hindi": "समाधान",
    "hinglish": "samadhan",
    "pageno": 42,
    "paribhasha": [
      "प्रकृति में व्यवस्था की स्वीकृति",
      "मानव की परस्परता में न्याय की स्वीकृति"
    ]
  },
  "सह-अस्तित्व": {
    "hindi": "सह-अस्तित्व",
    "hinglish": "sah-astitva",
    "pageno": 15,
    "paribhasha": [
      "परस्पर पूरकता"
    ]
  },
  ...
}
```

**Response (With flat=true):**
```json
{
  "समाधान": {
    "hindi": "समाधान",
    "hinglish": "samadhan",
    "pageno": 42,
    "paribhasha": "प्रकृति में व्यवस्था की स्वीकृति, मानव की परस्परता में न्याय की स्वीकृति"
  },
  ...
}
```

**Example Requests:**
```
GET /paribhasha/words/
GET /paribhasha/words/?flat=true
```

---

### How-To Videos

#### 11. Get Active How-To Videos

Get all active how-to videos.

**Endpoint:** `GET /howto/videos/`

**Permission:** Public (ReadOnly)

**Response:**
```json
[
  {
    "id": 1,
    "title": "How to use the book reader",
    "url": "https://youtube.com/watch?v=...",
    "description": "Learn how to navigate and use the book reading interface",
    "status": "active",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  ...
]
```

**Notes:**
- Only videos with `status: "active"` are returned
- Videos are ordered by most recent first

---

### Feedback

#### 12. List Feedback

Get all feedback submissions.

**Endpoint:** `GET /feedback/`

**Permission:** Public (anyone can read feedback)

**Response (Paginated):**
```json
{
  "count": 50,
  "next": "http://api.example.com/feedback/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "mobile_number": "+91-9876543210",
      "feedback_type": "BUG",
      "page_url": "http://example.com/books/1/pages/42/",
      "description": "Found a typo on this page...",
      "remark": "Admin note: Fixed in next update",
      "screenshot": "http://example.com/media/feedback_screenshots/screenshot1.jpg",
      "created_at": "2025-01-20T14:30:00Z"
    },
    ...
  ]
}
```

---

#### 13. Submit Feedback

Submit new feedback.

**Endpoint:** `POST /feedback/`

**Permission:** Public (anyone can submit)

**Request Body:**
```json
{
  "name": "John Doe",
  "mobile_number": "+91-9876543210",
  "feedback_type": "BUG",
  "page_url": "http://example.com/books/1/pages/42/",
  "description": "Found a typo on this page...",
  "screenshot": null
}
```

**Request Body (with file upload):**
```
Content-Type: multipart/form-data

name: John Doe
mobile_number: +91-9876543210
feedback_type: BUG
page_url: http://example.com/books/1/pages/42/
description: Found a typo on this page...
screenshot: [binary file data]
```

**Feedback Types:**
- `BUG` - Bug report
- `ENHANCEMENT` - Feature request or enhancement
- `OTHER` - General feedback

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "mobile_number": "+91-9876543210",
  "feedback_type": "BUG",
  "page_url": "http://example.com/books/1/pages/42/",
  "description": "Found a typo on this page...",
  "remark": null,
  "screenshot": "http://example.com/media/feedback_screenshots/screenshot1.jpg",
  "created_at": "2025-01-20T14:30:00Z"
}
```

**Validation:**
- `name` is required
- `description` is required
- `mobile_number` is optional (max 15 characters)
- `page_url` is optional
- `screenshot` is optional (max 300KB, PNG/JPG/JPEG only)

---

### API Root

#### 14. API Root (Staff Only)

Get a dynamic list of all available API endpoints.

**Endpoint:** `GET /api/`

**Permission:** Staff users only (IsStaffUser)

**Response:**
```json
{
  "search": "/api/v1/search/",
  "book-list": "/api/v1/books/",
  "book-page": "/api/v1/books/{book_id}/pages/{page_no}/",
  "book-toc": "/api/v1/books/{book_id}/toc/",
  "all-events": "/api/v1/events/all/",
  "event-categories": "/api/v1/event-categories/",
  "languages": "/api/v1/languages/",
  "prabodhaks": "/api/v1/prabodhaks/",
  "words-with-paribhasha": "/api/v1/paribhasha/words/",
  "howto-videos": "/api/v1/howto/videos/",
  "feedback-list-create": "/api/v1/feedback/",
  ...
}
```

**Notes:**
- This endpoint requires staff authentication
- Dynamically discovers all registered API endpoints
- Useful for API exploration and development

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Search query is required"
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## CORS Configuration

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:

- https://dev.madhyasth.org
- https://app.madhyasth.org
- http://localhost:3000
- http://127.0.0.1:3000
- http://localhost:8000
- http://127.0.0.1:8000
- http://localhost:5173

Credentials (cookies, authorization headers) are supported for authenticated requests.

---

## Rate Limiting

Currently, there is no rate limiting implemented on the API. For production use, consider implementing rate limiting based on your requirements.

---

## Example Usage with cURL

### Get all books
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/books/" \
  -H "Accept: application/json"
```

### Search books
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/search/?q=samadhan&highlight=true" \
  -H "Accept: application/json"
```

### Get a book page
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/books/1/pages/42/" \
  -H "Accept: application/json"
```

### Submit feedback
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/feedback/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "feedback_type": "BUG",
    "description": "Found an issue on page 42"
  }'
```

### Get authentication token
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/login-token/" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### Use authentication token
```bash
curl -X GET "http://127.0.0.1:8000/api/v1/events/" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -H "Accept: application/json"
```

---

## Example Usage with JavaScript (Fetch API)

### Get all books
```javascript
fetch('http://127.0.0.1:8000/api/v1/books/')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Search with parameters
```javascript
const searchParams = new URLSearchParams({
  q: 'samadhan',
  highlight: true,
  max_distance: 30
});

fetch(`http://127.0.0.1:8000/api/v1/search/?${searchParams}`)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Submit feedback with authentication
```javascript
const token = 'your-auth-token-here';

fetch('http://127.0.0.1:8000/api/v1/feedback/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Token ${token}`
  },
  body: JSON.stringify({
    name: 'John Doe',
    feedback_type: 'BUG',
    description: 'Found an issue'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Get book page with pagination
```javascript
async function getBookPage(bookId, pageNo) {
  try {
    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/books/${bookId}/pages/${pageNo}/`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching book page:', error);
    throw error;
  }
}

// Usage
getBookPage(1, 42)
  .then(data => {
    console.log('Book:', data.book);
    console.log('Page:', data.page);
    console.log('Navigation:', data.navigation);
  });
```

---

## Example Usage with Python (requests library)

### Get all books
```python
import requests

response = requests.get('http://127.0.0.1:8000/api/v1/books/')
books = response.json()
print(books)
```

### Search books
```python
import requests

params = {
    'q': 'samadhan',
    'highlight': True,
    'max_distance': 30
}

response = requests.get(
    'http://127.0.0.1:8000/api/v1/search/',
    params=params
)
results = response.json()
print(f"Found {results['count']} results")
for result in results['results']:
    print(f"Book: {result['book_title']}, Page: {result['page_number']}")
```

### Submit feedback
```python
import requests

data = {
    'name': 'John Doe',
    'feedback_type': 'BUG',
    'description': 'Found an issue on page 42',
    'page_url': 'http://example.com/books/1/pages/42/'
}

response = requests.post(
    'http://127.0.0.1:8000/api/v1/feedback/',
    json=data
)
print(response.json())
```

### Authenticated request
```python
import requests

# First, get the token
auth_response = requests.post(
    'http://127.0.0.1:8000/api/v1/login-token/',
    json={
        'username': 'your_username',
        'password': 'your_password'
    }
)
token = auth_response.json()['token']

# Use the token in subsequent requests
headers = {'Authorization': f'Token {token}'}
response = requests.get(
    'http://127.0.0.1:8000/api/v1/events/',
    headers=headers
)
events = response.json()
print(events)
```

---

## Notes for Claude Code Integration

When using this API with Claude Code, consider the following:

1. **Base URL Selection:** Use the production URL for deployed applications.

2. **Authentication:** Most read endpoints are public. Only use authentication for write operations or staff-only endpoints.

3. **Pagination:** Remember to handle paginated responses when fetching lists of items. The `next` and `previous` URLs in the response can be used to navigate pages.

4. **Error Handling:** Always check response status codes and handle errors appropriately. The API returns consistent error formats.

5. **Search Optimization:** When searching, use the `book_ids` parameter to limit the search scope if you know which books to search in.

6. **Image Handling:** Book cover images are available in both base64 format (`cover_image_base64`) and as file URLs (`cover_file`). Use base64 for immediate display, file URLs for optimal performance.

7. **Date Formats:** All dates use ISO 8601 format (YYYY-MM-DD for dates, YYYY-MM-DDTHH:MM:SSZ for timestamps).

8. **Content Types:** The API primarily uses JSON for request/response bodies, except for file uploads which use `multipart/form-data`.

---

## API Changes and Versioning

**Current Version:** v1

All API endpoints are currently under the `/api/v1/` namespace. Future API changes will maintain backward compatibility within v1, or introduce a new version (v2) if breaking changes are required.

---

## Support and Contact

For API support, bug reports, or feature requests, please contact the development team or submit feedback through the feedback endpoint.

---

**Last Updated:** 2025-01-24

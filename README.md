# Portfolio & Community API

## Table of Contents

1.  [Prerequisites](#prerequisites)
2.  [Installation](#installation)
3.  [Configuration](#configuration)
4.  [Running the Server](#running-the-server)
5.  [Authentication](#authentication-jwt)
6.  [API Endpoints](#api-endpoints)
    *   [Authentication](#auth-endpoints)
    *   [Projects](#project-endpoints)
    *   [Forums](#forum-endpoints)
    *   [Comments](#comment-endpoints)
    *   [Tags & Search](#tags--search-endpoints)
    *   [Likes & Reactions](#likes--reactions-endpoints)
7.  [Potential Improvements](#potential-improvements)
8.  [License](#license)

## Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [MongoDB](https://www.mongodb.com/) (running instance accessible)

## Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd <your-project-directory>
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

## Configuration

Create a `.env` file in the project root directory and add the following environment variables:

```dotenv
# Server port
PORT=3000

# MongoDB connection string
MONGO_URI=mongodb://localhost:27017/my_portfolio_api

# JWT secret key (CHANGE THIS TO A STRONG, RANDOM SECRET!)
JWT_SECRET=your_super_secret_jwt_key_please_change_me

# JWT token expiration time (e.g., 1h, 7d, 30m)
JWT_EXPIRES_IN=1h

# Optional: Define your specific admin/owner user ID if needed for "Only You" checks
# ADMIN_USER_ID=your_mongodb_user_id
```

**Important:** Replace `your_super_secret_jwt_key_please_change_me` with a long, random, and secure string for the `JWT_SECRET`. Do *not* commit your `.env` file to version control.

## Running the Server

```bash
node src/server.js
```

The API will start, typically on `http://localhost:3000` (or the port specified in `.env`).

## Authentication (JWT)

This API uses JSON Web Tokens (JWT) for securing endpoints.

1.  **Register:** Create a new user account using `POST /api/auth/register`.
2.  **Login:** Authenticate using `POST /api/auth/login` with your username and password. You will receive a JWT token in the response.
3.  **Authorize Requests:** For protected endpoints (marked as "Authentication: Required"), include the JWT token in the `Authorization` header of your requests:
    ```
    Authorization: Bearer <your_jwt_token>
    ```
4.  **Verify:** You can use `GET /api/auth/me` to verify your token and retrieve your user profile.
5.  **Logout:** Use `POST /api/auth/logout`. This is primarily a client-side action (discard the token). The server endpoint exists for potential token blacklisting implementation (not included by default).

**"Only You" / Owner Permissions:** Certain actions (like updating or deleting projects/forums) are restricted to the user who created the resource (the "owner"). This is checked automatically on the relevant endpoints.

## API Endpoints

---

### Auth Endpoints

<a name="auth-endpoints"></a>

1.  **Register User**
    *   **`POST /api/auth/register`**
    *   **Description:** Creates a new user account.
    *   **Authentication:** None
    *   **Request Body (`JSON`):**
        ```json
        {
          "username": "testuser",
          "email": "test@example.com",
          "password": "password123"
        }
        ```
    *   **Success Response (`201 Created`):**
        ```json
        {
          "message": "User registered successfully.",
          "userId": "60d..."
        }
        ```
    *   **Error Responses:** `400 Bad Request` (Validation Error), `409 Conflict` (Username/Email exists), `500 Internal Server Error`.

2.  **Login User**
    *   **`POST /api/auth/login`**
    *   **Description:** Authenticates a user and returns a JWT token.
    *   **Authentication:** None
    *   **Request Body (`JSON`):**
        ```json
        {
          "username": "testuser",
          "password": "password123"
        }
        ```
    *   **Success Response (`200 OK`):**
        ```json
        {
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
        ```
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized` (Invalid credentials), `500 Internal Server Error`.

3.  **Logout User**
    *   **`POST /api/auth/logout`**
    *   **Description:** Intended for logout actions (primarily client-side token removal).
    *   **Authentication:** Required (JWT)
    *   **Success Response (`200 OK`):**
        ```json
        {
          "message": "Logged out successfully. Please discard your token."
        }
        ```
    *   **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.

4.  **Get Authenticated User Profile**
    *   **`GET /api/auth/me`**
    *   **Description:** Retrieves the profile of the currently authenticated user.
    *   **Authentication:** Required (JWT)
    *   **Success Response (`200 OK`):**
        ```json
        {
          "_id": "60d...",
          "username": "testuser",
          "email": "test@example.com",
          "createdAt": "2023-10-27T10:00:00.000Z",
          "updatedAt": "2023-10-27T10:00:00.000Z"
          // Password field is excluded
        }
        ```
    *   **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

---

### Project Endpoints

<a name="project-endpoints"></a>

1.  **Get All Projects**
    *   **`GET /api/projects`**
    *   **Description:** Retrieves a paginated list of projects.
    *   **Authentication:** None
    *   **Query Parameters:**
        *   `page` (integer, default: 1): Page number.
        *   `limit` (integer, default: 10, max: 100): Items per page.
    *   **Success Response (`200 OK`):**
        ```json
        {
          "data": [
            {
              "_id": "60e...",
              "title": "My Awesome Project",
              "description": "Description...",
              "tags": ["nodejs", "fastify"],
              "repoUrl": "https://github.com/...",
              "liveUrl": "https://example.com",
              "owner": { "_id": "60d...", "username": "testuser" },
              "likes": ["60f...", "60g..."],
              "createdAt": "...",
              "updatedAt": "..."
            }
            // ... more projects
          ],
          "meta": {
            "currentPage": 1,
            "totalPages": 5,
            "totalProjects": 45,
            "limit": 10
          }
        }
        ```
    *   **Error Responses:** `500 Internal Server Error`.

2.  **Get Project Details by ID**
    *   **`GET /api/projects/:id`**
    *   **Description:** Retrieves details for a specific project.
    *   **Authentication:** None
    *   **Path Parameters:**
        *   `:id` (string, MongoDB ObjectId): The ID of the project.
    *   **Success Response (`200 OK`):** (Similar structure to one item in `GET /api/projects` response, potentially with more details like populated `likes`)
    *   **Error Responses:** `400 Bad Request` (Invalid ID format), `404 Not Found`, `500 Internal Server Error`.

3.  **Create New Project**
    *   **`POST /api/projects`**
    *   **Description:** Creates a new project. The owner is automatically set to the authenticated user.
    *   **Authentication:** Required (JWT)
    *   **Request Body (`JSON`):**
        ```json
        {
          "title": "New Project Title",
          "description": "Detailed description of the project.",
          "tags": ["react", "api"],
          "repoUrl": "https://github.com/user/new-project",
          "liveUrl": "https://new-project.example.com"
        }
        ```
    *   **Success Response (`201 Created`):** (Returns the newly created project object, including `_id`, `owner`, `createdAt`, etc.)
    *   **Error Responses:** `400 Bad Request` (Validation Error), `401 Unauthorized`, `500 Internal Server Error`.

4.  **Update Project**
    *   **`PUT /api/projects/:id`**
    *   **Description:** Updates an existing project.
    *   **Authentication:** Required (JWT, Owner Only)
    *   **Path Parameters:**
        *   `:id` (string, MongoDB ObjectId): The ID of the project to update.
    *   **Request Body (`JSON`):** (Include only the fields to update)
        ```json
        {
          "title": "Updated Project Title",
          "tags": ["react", "api", "updated"]
        }
        ```
    *   **Success Response (`200 OK`):** (Returns the updated project object)
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (Not owner), `404 Not Found`, `500 Internal Server Error`.

5.  **Delete Project**
    *   **`DELETE /api/projects/:id`**
    *   **Description:** Deletes a project.
    *   **Authentication:** Required (JWT, Owner Only)
    *   **Path Parameters:**
        *   `:id` (string, MongoDB ObjectId): The ID of the project to delete.
    *   **Success Response (`204 No Content`):** (Empty response body)
    *   **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

---

### Forum Endpoints

<a name="forum-endpoints"></a>

*(These endpoints function very similarly to the Project endpoints)*

1.  **Get All Forums**
    *   **`GET /api/forums`**
    *   **Description:** Retrieves a paginated list of forums.
    *   **Authentication:** None
    *   **Query Parameters:** `page`, `limit`
    *   **Success Response (`200 OK`):** (Similar structure to `GET /api/projects`, but with forum data and `totalForums` in meta)
    *   **Error Responses:** `500 Internal Server Error`.

2.  **Get Forum Details by ID**
    *   **`GET /api/forums/:id`**
    *   **Description:** Retrieves details for a specific forum.
    *   **Authentication:** None
    *   **Path Parameters:** `:id`
    *   **Success Response (`200 OK`):** (Forum object with populated owner/likes)
    *   **Error Responses:** `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.

3.  **Create New Forum**
    *   **`POST /api/forums`**
    *   **Description:** Creates a new forum. Owner is the authenticated user.
    *   **Authentication:** Required (JWT)
    *   **Request Body (`JSON`):**
        ```json
        {
          "title": "General Discussion",
          "description": "A place to discuss various topics."
        }
        ```
    *   **Success Response (`201 Created`):** (Returns the newly created forum object)
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`.

4.  **Update Forum**
    *   **`PUT /api/forums/:id`**
    *   **Description:** Updates an existing forum.
    *   **Authentication:** Required (JWT, Owner Only)
    *   **Path Parameters:** `:id`
    *   **Request Body (`JSON`):** (Fields to update: `title`, `description`)
        ```json
        {
          "description": "An updated description for general discussion."
        }
        ```
    *   **Success Response (`200 OK`):** (Returns the updated forum object)
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

5.  **Delete Forum**
    *   **`DELETE /api/forums/:id`**
    *   **Description:** Deletes a forum.
    *   **Authentication:** Required (JWT, Owner Only)
    *   **Path Parameters:** `:id`
    *   **Success Response (`204 No Content`):**
    *   **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

---

### Comment Endpoints

<a name="comment-endpoints"></a>

1.  **Get Comments for a Project OR Forum**
    *   **`GET /api/comments`**
    *   **Description:** Retrieves comments associated with a specific project or forum. Provide *either* `projectId` or `forumId`.
    *   **Authentication:** None
    *   **Query Parameters:**
        *   `projectId` (string, MongoDB ObjectId, optional): ID of the project.
        *   `forumId` (string, MongoDB ObjectId, optional): ID of the forum.
    *   **Success Response (`200 OK`):**
        ```json
        [
          {
            "_id": "60f...",
            "content": "This is a great project!",
            "author": { "_id": "60d...", "username": "anotheruser" },
            "project": "60e...", // or "forum": "60f..."
            "createdAt": "...",
            "updatedAt": "..."
          }
          // ... more comments
        ]
        ```
    *   **Error Responses:** `400 Bad Request` (Missing/invalid query param, or both provided), `500 Internal Server Error`.

2.  **Add a Comment**
    *   **`POST /api/comments`**
    *   **Description:** Adds a new comment to a project or forum.
    *   **Authentication:** Required (JWT)
    *   **Request Body (`JSON`):** (Provide *either* `projectId` or `forumId`)
        ```json
        {
          "content": "My thoughts on this...",
          "projectId": "60e..." // OR "forumId": "60f..."
        }
        ```
    *   **Success Response (`201 Created`):** (Returns the newly created comment object with populated author)
    *   **Error Responses:** `400 Bad Request` (Validation Error, missing/both parent ID), `401 Unauthorized`, `404 Not Found` (Project/Forum not found), `500 Internal Server Error`.

3.  **Update a Comment**
    *   **`PUT /api/comments/:id`**
    *   **Description:** Updates an existing comment.
    *   **Authentication:** Required (JWT, Comment Author Only)
    *   **Path Parameters:** `:id` (Comment ID)
    *   **Request Body (`JSON`):**
        ```json
        {
          "content": "My updated thoughts..."
        }
        ```
    *   **Success Response (`200 OK`):** (Returns the updated comment object)
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (Not author), `404 Not Found`, `500 Internal Server Error`.

4.  **Delete a Comment**
    *   **`DELETE /api/comments/:id`**
    *   **Description:** Deletes a comment.
    *   **Authentication:** Required (JWT, Comment Author Only)
    *   **Path Parameters:** `:id` (Comment ID)
    *   **Success Response (`204 No Content`):**
    *   **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.

---

### Tags & Search Endpoints

<a name="tags--search-endpoints"></a>

1.  **Get All Tags**
    *   **`GET /api/tags`**
    *   **Description:** Retrieves a unique, sorted list of all tags used across projects.
    *   **Authentication:** None
    *   **Success Response (`200 OK`):**
        ```json
        [
          "api",
          "fastify",
          "javascript",
          "nodejs",
          "react"
        ]
        ```
    *   **Error Responses:** `500 Internal Server Error`.

2.  **Search Projects and Forums**
    *   **`GET /api/search`**
    *   **Description:** Performs a text search across project/forum titles, descriptions (and project tags if using regex/aggregation). Requires MongoDB text indexes on relevant fields for `$text` search.
    *   **Authentication:** None
    *   **Query Parameters:**
        *   `query` (string, required): The search term.
        *   `page` (integer, optional, default: 1): Page number for results (applies independently to projects/forums in current impl).
        *   `limit` (integer, optional, default: 10): Limit per result type.
    *   **Success Response (`200 OK`):**
        ```json
        {
          "query": "fastify",
          "results": {
            "projects": {
                "data": [ /* ... project results ... */ ],
                "total": 5 // Total projects matching query
            },
            "forums": {
                "data": [ /* ... forum results ... */ ],
                "total": 2 // Total forums matching query
             }
          },
          "meta": {
            "requestedPage": 1,
            "requestedLimit": 10,
            "totalApproximateResults": 7 // Sum of project/forum totals
          }
        }
        ```
    *   **Error Responses:** `400 Bad Request` (Missing query), `500 Internal Server Error`.

---

### Likes & Reactions Endpoints

<a name="likes--reactions-endpoints"></a>

1.  **Like / Unlike a Project**
    *   **`POST /api/projects/:id/like`**
    *   **Description:** Toggles the like status for a project for the authenticated user.
    *   **Authentication:** Required (JWT)
    *   **Path Parameters:** `:id` (Project ID)
    *   **Success Response (`200 OK`):**
        ```json
        {
          "message": "Project liked successfully." // or "Project unliked successfully."
          "likesCount": 15
        }
        ```
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

2.  **Like / Unlike a Forum**
    *   **`POST /api/forums/:id/like`**
    *   **Description:** Toggles the like status for a forum for the authenticated user.
    *   **Authentication:** Required (JWT)
    *   **Path Parameters:** `:id` (Forum ID)
    *   **Success Response (`200 OK`):**
        ```json
        {
          "message": "Forum liked successfully." // or "Forum unliked successfully."
          "likesCount": 8
        }
        ```
    *   **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.

---

## Potential Improvements

*   **Role-Based Access Control:** Implement user roles (e.g., `admin`, `moderator`, `user`) for more granular permissions.
*   **Testing:** Add comprehensive unit and integration tests.
*   **Enhanced Error Handling:** Provide more specific error details and codes.
*   **Rate Limiting:** Implement rate limiting (`@fastify/rate-limit`) to prevent abuse.
*   **Security Headers:** Use `@fastify/helmet`.
*   **Advanced Search:** Integrate with Elasticsearch or use more complex MongoDB aggregations for better search capabilities.
*   **File Uploads:** Add support for uploading images (e.g., project screenshots, user avatars).
*   **Real-time Features:** Use WebSockets for notifications or live comment updates.
*   **API Versioning:** Implement API versioning strategy (e.g., `/api/v1/...`).
*   **Transaction Support:** Use MongoDB transactions for operations involving multiple documents (e.g., deleting a project and all its comments atomically).

## License

[MIT](LICENSE) (or your chosen license)
    ```
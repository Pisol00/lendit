# LendIt API Test Guide

คู่มือนี้ใช้ทดสอบ endpoint ทั้งหมดด้วย `curl` หลังจากรัน server แล้ว

```bash
export API="http://localhost:3000/api/v1"
```

Fill an empty database with a demo library — seven members, thirty-two books
and loans in every state:

```bash
bun run create-admin   # prompts for the admin's details
bun run seed           # needs the server running
```

Every account it creates uses the password `LenditDemo123`. Substitute your own
admin address wherever `admin@lendit.local` appears below.

| Role | Email |
|---|---|
| Admin | `admin@lendit.local` (whatever you chose) |
| Member | `nara@lendit.local` |
| Member | `mint@lendit.local` |
| Member | `anan@lendit.local` |
| Member | `ploy@lendit.local`, `krit@`, `june@`, `tara@` |

## Auth

### Login admin

```bash
curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lendit.local","password":"LenditDemo123"}'
```

ตั้ง token ไว้ใช้ต่อ:

```bash
export ADMIN_TOKEN="<paste-token>"
```

### Login owner

```bash
curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mint@lendit.local","password":"LenditDemo123"}'
```

```bash
export OWNER_TOKEN="<paste-token>"
```

### Login borrower

```bash
curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nara@lendit.local","password":"LenditDemo123"}'
```

```bash
export BORROWER_TOKEN="<paste-token>"
```

### Logout

```bash
curl -i -X POST "$API/auth/logout" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

## Accounts

### List accounts `[Admin]`

```bash
curl -s "$API/accounts?page=1&limit=10&search=seed&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get account by id `[Authenticated]`

```bash
export ACCOUNT_ID="<account-id>"

curl -s "$API/accounts/$ACCOUNT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Create member accounts `[Authenticated, admin only in controller]`

```bash
curl -s -X POST "$API/accounts" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [
      {
        "firstName": "Test",
        "lastName": "Member",
        "email": "test.member@example.com",
        "password": "LenditDemo123"
      }
    ]
  }'
```

### Update member account `[Admin]`

```bash
curl -s -X PUT "$API/accounts/$ACCOUNT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Member",
    "email": "updated.member@example.com"
  }'
```

### Update my account `[Authenticated]`

```bash
curl -s -X PUT "$API/accounts/me" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Charlie",
    "lastName": "Reader",
    "email": "nara@lendit.local"
  }'
```

### Change my password `[Authenticated]`

```bash
curl -s -X PUT "$API/accounts/me" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Charlie",
    "lastName": "Reader",
    "email": "nara@lendit.local",
    "currentPassword": "LenditDemo123",
    "newPassword": "NewLenditDemo123"
  }'
```

### Suspend or activate account `[Admin]`

```bash
curl -s -X PUT "$API/accounts/$ACCOUNT_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}'
```

### Delete member account `[Admin]`

```bash
curl -i -X DELETE "$API/accounts/$ACCOUNT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Tags

### List tags `[Authenticated]`

```bash
curl -s "$API/tags" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

### Create tag `[Admin]`

```bash
curl -s -X POST "$API/tags" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"testing"}'
```

### Delete tag `[Admin]`

```bash
curl -i -X DELETE "$API/tags/testing" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Books

Book ids are encoded composite ids. Get one from the list response and assign it before testing by id/update/delete.

### List books `[Authenticated]`

```bash
curl -s "$API/books?page=1&limit=10&search=typescript&tag=programming&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

```bash
export BOOK_ID="<encoded-book-id-from-list>"
```

### Get book by id `[Authenticated]`

```bash
curl -s "$API/books/$BOOK_ID" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

### Create book `[Authenticated]`

```bash
curl -s -X POST "$API/books" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Testing Handbook",
    "author": "LendIt QA",
    "publisher": "Seed Press",
    "edition": 1,
    "isbn": "TEST-API-001",
    "cover": "https://example.com/cover.jpg",
    "tags": ["programming"],
    "quantity": 1
  }'
```

### Update book `[Owner]`

`title` and `author` are part of the composite id and cannot be changed.

```bash
curl -s -X PUT "$API/books/$BOOK_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TypeScript Basics",
    "author": "Ada Stone",
    "publisher": "Updated Press",
    "edition": 2,
    "isbn": "SEED-001",
    "cover": "https://example.com/typescript.jpg",
    "tags": ["programming"],
    "quantity": 1
  }'
```

### Delete book `[Owner]`

```bash
curl -i -X DELETE "$API/books/$BOOK_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

## Borrowings

### List borrowings as borrower `[Authenticated]`

```bash
curl -s "$API/borrowings?role=borrower&page=1&limit=10" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

### List borrowings as owner `[Authenticated]`

```bash
curl -s "$API/borrowings?role=owner&status=pending&page=1&limit=10" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

```bash
export BORROWING_ID="<borrowing-id>"
```

### Create borrowing request `[Borrower]`

Use a book owned by another member.

```bash
curl -s -X POST "$API/borrowings" \
  -H "Authorization: Bearer $BORROWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"$BOOK_ID\",
    \"startDate\": \"2026-08-01\",
    \"dueDate\": \"2026-08-08\"
  }"
```

### Approve borrowing `[Book owner]`

```bash
curl -s -X PUT "$API/borrowings/$BORROWING_ID/approve" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

### Reject borrowing `[Book owner]`

```bash
curl -s -X PUT "$API/borrowings/$BORROWING_ID/reject" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

### Cancel borrowing `[Borrower]`

```bash
curl -s -X PUT "$API/borrowings/$BORROWING_ID/cancel" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

### Return borrowing `[Book owner]`

```bash
curl -s -X PUT "$API/borrowings/$BORROWING_ID/return" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

## Dashboard

### Overview `[Admin]`

```bash
curl -s "$API/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Overview with date range `[Admin]`

```bash
curl -s "$API/dashboard?from=2026-08-01&to=2026-08-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Error Checks

### Unauthorized request

```bash
curl -i "$API/books"
```

### Wrong role

```bash
curl -i "$API/dashboard" \
  -H "Authorization: Bearer $BORROWER_TOKEN"
```

### Route not found

```bash
curl -i "$API/not-found"
```

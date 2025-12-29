# Firestore schema design (internal)

This document captures the intended Firestore collections and field expectations for
`resumiate`. It is meant as an internal design reference and should be kept in sync
with `firestore.rules` and `src/utils/firestoreSchemas.js`.

## Collections

### `users/{userId}`
Profile and preference metadata tied to the authenticated user.

- **profile**
  - `displayName` (string)
  - `email` (string)
  - `photoURL` (string | null)
  - `headline` (string | null)
- **preferences**
  - `defaultTemplateId` (string | null)
  - `theme` (string, e.g. `light`/`dark`)
  - `locale` (string, e.g. `en-US`)
- **createdAt** (timestamp)
- **updatedAt** (timestamp)

### `resumes/{resumeId}`
Resume data authored by a user.

- `userId` (string, owner UID)
- `title` (string)
- `sections` (array of section objects)
  - `id` (string)
  - `type` (string, e.g. `experience`, `education`)
  - `content` (map/object, section-specific payload)
- `visibility` (string, `private` | `public`)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `templates/{templateId}`
Reusable resume templates.

- `ownerId` (string, UID of creator)
- `type` (string, `admin` | `user`)
- `layout` (map/object, structural layout data)
- `styles` (map/object, typography/colors/spacing)
- `status` (string, e.g. `active`, `draft`, `archived`)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `published/{resumeId}`
Public-facing metadata for published resumes.

- `publicSlug` (string)
- `isPublic` (boolean)
- `viewCount` (number)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## Notes

- `published/{resumeId}` mirrors `resumes/{resumeId}` ownership and is tied to the same
  document id.
- Public access should be limited to published documents with `isPublic == true`.
- All other data should remain restricted to the authenticated owner.

/**
 * Centralized Firestore schema references.
 *
 * This file mirrors docs/firestore-schema.md and firestore.rules.
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} [displayName]
 * @property {string} [email]
 * @property {string | null} [photoURL]
 * @property {string | null} [headline]
 */

/**
 * @typedef {Object} UserPreferences
 * @property {string | null} [defaultTemplateId]
 * @property {string} [theme]
 * @property {string} [locale]
 */

/**
 * @typedef {Object} UserDocument
 * @property {UserProfile} [profile]
 * @property {UserPreferences} [preferences]
 * @property {import("firebase/firestore").Timestamp} [createdAt]
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 */

/**
 * @typedef {Object} ResumeSection
 * @property {string} id
 * @property {string} type
 * @property {Record<string, unknown>} content
 */

/**
 * @typedef {Object} ResumeDocument
 * @property {string} userId
 * @property {string} [title]
 * @property {ResumeSection[]} [sections]
 * @property {"private" | "public"} [visibility]
 * @property {import("firebase/firestore").Timestamp} [createdAt]
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 */

/**
 * @typedef {Object} TemplateDocument
 * @property {string} ownerId
 * @property {"admin" | "user"} type
 * @property {Record<string, unknown>} [layout]
 * @property {Record<string, unknown>} [styles]
 * @property {string} [status]
 * @property {import("firebase/firestore").Timestamp} [createdAt]
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 */

/**
 * @typedef {Object} PublishedDocument
 * @property {string} publicSlug
 * @property {boolean} isPublic
 * @property {number} [viewCount]
 * @property {import("firebase/firestore").Timestamp} [createdAt]
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 */

export const FirestoreCollections = Object.freeze({
  users: "users",
  resumes: "resumes",
  templates: "templates",
  published: "published",
});

export const FirestoreSchemaSummary = Object.freeze({
  users: {
    profile: {
      displayName: "string",
      email: "string",
      photoURL: "string | null",
      headline: "string | null",
    },
    preferences: {
      defaultTemplateId: "string | null",
      theme: "string",
      locale: "string",
    },
    createdAt: "timestamp",
    updatedAt: "timestamp",
  },
  resumes: {
    userId: "string",
    title: "string",
    sections: "ResumeSection[]",
    visibility: "private | public",
    createdAt: "timestamp",
    updatedAt: "timestamp",
  },
  templates: {
    ownerId: "string",
    type: "admin | user",
    layout: "object",
    styles: "object",
    status: "string",
    createdAt: "timestamp",
    updatedAt: "timestamp",
  },
  published: {
    publicSlug: "string",
    isPublic: "boolean",
    viewCount: "number",
    createdAt: "timestamp",
    updatedAt: "timestamp",
  },
});

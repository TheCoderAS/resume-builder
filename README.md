# Resume Builder

A React + Firebase starter for building a resume builder with Firebase Hosting deployments.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example` and add your Firebase web app credentials.
3. Run the local dev server:

   ```bash
   npm run dev
   ```

## Firebase setup

- Update `.firebaserc` with your Firebase project ID.
- Enable Firebase Hosting and run `firebase init hosting` if you want to manage additional settings.
- Add Firestore/Auth as needed.

## GitHub workflows

- **PR build check** runs `npm ci` and `npm run build` on pull requests.
- **Deploy to Firebase** runs on pushes to `main` and deploys using `FirebaseExtended/action-hosting-deploy`.

### Required secrets

Add the following secrets to your GitHub repo:

- `FIREBASE_SERVICE_ACCOUNT`: JSON for a Firebase service account with Hosting deploy rights.
- `FIREBASE_PROJECT_ID`: The Firebase project ID (should match `.firebaserc`).


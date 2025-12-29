import "./app.css";

const templateSections = [
  "Contact details",
  "Summary",
  "Experience",
  "Education",
  "Skills",
  "Certifications",
];

export default function App() {
  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Firebase + React</p>
          <h1>Resume Builder</h1>
          <p className="subtitle">
            Draft polished resumes fast, preview sections instantly, and store drafts
            securely with Firebase.
          </p>
        </div>
        <button className="primary" type="button">
          Start a new resume
        </button>
      </header>

      <section className="card">
        <h2>Build your resume in minutes</h2>
        <p>
          Choose a layout, fill in guided prompts, and export to PDF. Connect
          Firebase authentication and Firestore to save progress across devices.
        </p>
        <ul>
          {templateSections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Next steps</h2>
        <ol>
          <li>Add Firebase credentials in a <code>.env</code> file.</li>
          <li>Connect Firestore to store resume drafts.</li>
          <li>Enable Firebase Hosting for production deployments.</li>
        </ol>
      </section>
    </div>
  );
}

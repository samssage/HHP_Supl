import Link from "next/link";

const steps = [
  { number: "01", title: "Find your equipment", body: "Browse by course, activity, room, or item. See what’s on record and where it’s stored." },
  { number: "02", title: "Send your request", body: "Choose what you need and tell the equipment office when you need it. A day’s notice helps staff plan." },
  { number: "03", title: "Check your request status", body: "Follow your request in the app. When staff mark it ready, you’ll know it’s ready to collect." },
];

export const metadata = {
  title: "HHP Equipment Finder | Be ready for class",
  description: "Find York College HHP equipment, see where it’s stored, and request what you need for your next class.",
};

export default function Home() {
  return <div className="landing">
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-copy">
        <p className="landing-eyebrow">York College · Health &amp; Human Performance</p>
        <h1 id="hero-title">Find your equipment.<br /><span>Be ready for class.</span></h1>
        <p className="landing-lead">Less time tracking down gear. More time teaching.</p>
        <p className="landing-description">See what HHP has, where it’s stored, and request what you need for your next class—all in one place.</p>
        <div className="landing-actions">
          <Link href="/login?mode=signup" className="landing-button">Create your account <span aria-hidden="true">↗</span></Link>
          <a href="#how-it-works" className="landing-text-link">See how it works <span aria-hidden="true">↓</span></a>
        </div>
        <p className="landing-signin">Already registered? <Link href="/login">Log in</Link></p>
      </div>
      <div className="landing-visual" aria-label="Find equipment, send a request, and get ready for class">
        <svg className="landing-court" viewBox="0 0 460 500" fill="none" aria-hidden="true">
          <path d="M35 35h390v430H35zM35 250h390M35 120h90v260H35M425 120h-90v260h90" />
          <circle cx="230" cy="250" r="65" /><path d="M35 85a165 165 0 0 1 0 330M425 85a165 165 0 0 0 0 330" />
        </svg>
        <div className="landing-visual-heading"><span className="landing-dot" /> A clearer path to your next class</div>
        <div className="landing-example">
          <span className="landing-example-label">Start with what you’re teaching</span>
          <div className="landing-search"><span aria-hidden="true">⌕</span> Basketball, balance, volleyball…</div>
          <div className="landing-tags"><span>By course</span><span>By activity</span><span>By equipment</span></div>
        </div>
        <div className="landing-flow">
          <div><span className="landing-flow-number">1</span><span><strong>Find the right gear</strong><small>See items and storage locations</small></span></div>
          <div><span className="landing-flow-number">2</span><span><strong>Tell the office what you need</strong><small>One request for your equipment list</small></span></div>
          <div><span className="landing-flow-number">3</span><span><strong>Know when it’s ready</strong><small>Check your request status in the app</small></span></div>
        </div>
        <p className="landing-visual-note">Your class. Your equipment. A plan.</p>
      </div>
    </section>

    <section id="how-it-works" className="landing-steps" aria-labelledby="steps-title">
      <div className="landing-section-heading"><p className="landing-eyebrow">From lesson plan to equipment request</p><h2 id="steps-title">Three steps. One place.</h2><p>Create an account and confirm your email to get started.</p></div>
      <ol className="landing-step-grid">
        {steps.map(step => <li key={step.number}><span className="landing-step-number">{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
      <p className="landing-expectation">Requests are reviewed by the equipment office. Availability and pickup timing are confirmed by staff.</p>
    </section>

    <section className="landing-bottom" aria-labelledby="ready-title">
      <div><p className="landing-eyebrow">For the HHP teaching community</p><h2 id="ready-title">Your next class starts with a plan.</h2><p>Find the gear. Send the list. Give the equipment office a head start.</p></div>
      <Link href="/login?mode=signup" className="landing-button">Get started <span aria-hidden="true">↗</span></Link>
    </section>
    <footer className="landing-footer"><span>HHP Equipment Finder · York College</span><Link href="/login">Equipment office sign in <span aria-hidden="true">→</span></Link></footer>
  </div>;
}

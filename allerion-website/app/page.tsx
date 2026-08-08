import Logo from "@/components/Logo";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <header className="nav">
        <div className="container nav__inner">
          <Logo size={38} />
          <nav className="nav__links">
            <a href="#services">Services</a>
            <a href="#how">How it works</a>
            <a href="#contact" className="nav__cta">
              Plan your trip
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <span className="hero__eyebrow">Allerion LLC · Travel, handled</span>
          <h1>
            Connect into your <span className="accent">next trip</span>.
          </h1>
          <p>
            Allerion designs and coordinates seamless journeys end to end — flights,
            stays, routes, and the small details that make travel effortless. Tell us
            where you want to go; we connect the rest.
          </p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="#contact">
              Plan your trip
            </a>
            <a className="btn btn--ghost" href="#services">
              Explore services
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section" id="services">
        <div className="container">
          <div className="section__head">
            <h2>What we do</h2>
            <p>One team coordinating every moving piece of your itinerary.</p>
          </div>
          <div className="grid">
            <article className="card">
              <div className="card__icon">✈</div>
              <h3>Trip planning</h3>
              <p>
                Tailored itineraries built around your dates, pace, and budget — from
                a weekend away to a multi-country route.
              </p>
            </article>
            <article className="card">
              <div className="card__icon">⬡</div>
              <h3>Booking & logistics</h3>
              <p>
                Flights, lodging, transfers, and reservations connected into a single
                coordinated plan you can rely on.
              </p>
            </article>
            <article className="card">
              <div className="card__icon">◆</div>
              <h3>Concierge support</h3>
              <p>
                Real help before and during your trip, so changes and surprises are
                handled without the stress.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how">
        <div className="container">
          <div className="section__head">
            <h2>How it works</h2>
            <p>Three simple steps from idea to itinerary.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step__num">STEP 01</span>
              <h3>Share your vision</h3>
              <p>Tell us the destination, dates, and the kind of trip you want.</p>
            </div>
            <div className="step">
              <span className="step__num">STEP 02</span>
              <h3>We connect it</h3>
              <p>We assemble and book a coordinated plan, optimized end to end.</p>
            </div>
            <div className="step">
              <span className="step__num">STEP 03</span>
              <h3>You travel</h3>
              <p>Go, with everything in one place and support along the way.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section" id="contact">
        <div className="container">
          <div className="contact">
            <div className="section__head" style={{ marginBottom: 0 }}>
              <h2>Plan your trip</h2>
              <p>Tell us where you want to go — we&apos;ll take it from there.</p>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer__inner">
          <Logo size={32} />
          <small>© {new Date().getFullYear()} Allerion LLC · All rights reserved</small>
        </div>
      </footer>
    </>
  );
}

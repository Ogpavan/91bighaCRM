import type { Metadata } from "next";
import { ContactInquiryForm } from "@/components/contact-inquiry-form";

export const metadata: Metadata = {
  title: "Contact Us | 91bigha.com",
  description: "Contact 91bigha.com for property enquiries, site visits, buying, renting, and listing support."
};

const contactCards = [
  {
    icon: "call",
    title: "Call Our Team",
    body: "+91 7302166711",
    helper: "Speak directly with our property desk for buying, renting, and site visit support.",
    actionLabel: "Call Now",
    actionHref: "tel:+917302166711"
  },
  {
    icon: "forum",
    title: "WhatsApp Support",
    body: "+91 7302166711",
    helper: "Share your budget, location, and property requirement. We will guide you quickly.",
    actionLabel: "Open WhatsApp",
    actionHref: "https://wa.me/917302166711"
  },
  {
    icon: "location_city",
    title: "Markets We Cover",
    body: "Bareilly, Civil Lines, DD Puram, Rajendra Nagar, Izatnagar, Pilibhit Bypass",
    helper: "We support focused residential and rental search across Bareilly's active localities.",
    actionLabel: "Explore Buy Listings",
    actionHref: "/buy-property-grid-sidebar"
  }
];

const servicePoints = [
  "Buy-side guidance for apartments, villas, plots, and independent homes",
  "Rental assistance for families, professionals, bachelors, and company leases",
  "Quick coordination for WhatsApp enquiries and follow-up site visits",
  "Listing support for owners who want to post and market inventory"
];

export default function ContactUsPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Contact Us</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Contact Us</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-us-wrap-01">
        <div className="container">
          <div className="row align-items-center row-gap-4">
            <div className="col-lg-6">
              <div className="section-heading mb-0 text-start">
                  <h2 className="mb-3">Talk to the Bareilly property desk</h2>
                <p className="mb-3">
                  Reach out for buying, renting, project discovery, or owner listing support. The fastest path is
                  WhatsApp or a direct call, and the enquiry form below also routes to WhatsApp with your details.
                </p>
                <p className="mb-4">
                  Share your budget in INR, preferred Bareilly locality, timeline, and property type. We will help you move faster with a more
                  focused shortlist.
                </p>
                <div className="d-flex flex-wrap gap-3">
                  <a href="tel:+917302166711" className="btn btn-primary btn-lg">Call Now</a>
                  <a href="https://wa.me/917302166711" target="_blank" rel="noreferrer" className="btn btn-dark btn-lg">
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <img src="/assets/img/home/home-02.jpg" alt="Bareilly property support" className="img-fluid rounded-0 shadow-sm" />
            </div>
          </div>
        </div>
      </section>

      <section className="contact-us-wrap-02">
        <div className="container">
          <div className="row row-gap-4">
            <div className="col-lg-5">
              {contactCards.map((card) => (
                <div key={card.title} className="contact-us-item-01">
                  <div className="d-flex align-items-start">
                    <span><i className="material-icons-outlined">{card.icon}</i></span>
                    <div>
                      <h5 className="mb-2">{card.title}</h5>
                      <p className="fw-semibold text-dark mb-1">{card.body}</p>
                      <p className="mb-3">{card.helper}</p>
                      <a
                        href={card.actionHref}
                        className="btn btn-light border border-dark-subtle rounded-0 px-3"
                        target={card.actionHref.startsWith("https://") ? "_blank" : undefined}
                        rel={card.actionHref.startsWith("https://") ? "noreferrer" : undefined}
                      >
                        {card.actionLabel}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-lg-7">
              <div className="contact-us-item-02">
                <h2>Send Your Enquiry</h2>
                <p className="mb-4">
                  Fill in your requirement and we will open WhatsApp with a pre-filled enquiry so you can send it in one step.
                </p>
                <ContactInquiryForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-light">
        <div className="container">
          <div className="row row-gap-4 align-items-start">
            <div className="col-lg-6">
              <div className="section-heading text-start mb-4">
                <h2 className="mb-2">What We Can Help With</h2>
                <p className="mb-0">Use the contact desk for targeted support instead of broad browsing.</p>
              </div>
              <div className="card border-0 shadow-sm rounded-0">
                <div className="card-body p-4">
                  <ul className="contact-service-list list-unstyled mb-0">
                    {servicePoints.map((point) => (
                      <li key={point} className="d-flex align-items-start gap-2 mb-3">
                        <i className="material-icons-outlined text-primary mt-1">check_circle</i>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-0 h-100">
                <div className="card-body p-4 d-flex flex-column justify-content-between">
                  <div>
                    <h4 className="mb-3">Response Window</h4>
                    <p className="mb-3">Phone and WhatsApp enquiries are the fastest route for active leads and urgent site visit planning.</p>
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex align-items-start gap-3">
                        <i className="material-icons-outlined text-primary">schedule</i>
                        <div>
                          <h6 className="mb-1">Working Hours</h6>
                          <p className="mb-0">Monday to Saturday, 9:30 AM to 7:30 PM</p>
                        </div>
                      </div>
                      <div className="d-flex align-items-start gap-3">
                        <i className="material-icons-outlined text-primary">support_agent</i>
                        <div>
                          <h6 className="mb-1">Best For</h6>
                          <p className="mb-0">Shortlisting inventory, rental support, project discovery, and owner enquiries.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-3 pt-4">
                    <a href="/buy-property-grid-sidebar" className="btn btn-primary rounded-0">Browse Buy</a>
                    <a href="/rent-property-grid-sidebar" className="btn btn-dark rounded-0">Browse Rent</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

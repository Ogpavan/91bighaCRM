import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Team | 91bigha.com",
  description: "Meet the 91bigha.com team helping you buy, rent, and list properties in Bareilly."
};

const teamMembers = [
  {
    name: "Property Desk",
    role: "Buying & Rentals",
    image: "/assets/img/agents/agent-01.jpg",
    phoneLabel: "+91 7302166711",
    phoneHref: "tel:+917302166711",
    whatsappHref: "https://wa.me/917302166711"
  },
  {
    name: "Site Visit Coordinator",
    role: "Shortlisting & Visits",
    image: "/assets/img/agents/agent-02.jpg",
    phoneLabel: "+91 7302166711",
    phoneHref: "tel:+917302166711",
    whatsappHref: "https://wa.me/917302166711"
  },
  {
    name: "Owner Listing Support",
    role: "Sell / List Your Property",
    image: "/assets/img/agents/agent-04.jpg",
    phoneLabel: "+91 7302166711",
    phoneHref: "tel:+917302166711",
    whatsappHref: "https://wa.me/917302166711"
  }
];

export default function OurTeamPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Our Team</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Our Team</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-light">
        <div className="container">
          <div className="section-heading text-center mb-4">
            <h2 className="mb-2">Meet the 91bigha.com Team</h2>
            <div className="sec-line">
              <span className="sec-line1"></span>
              <span className="sec-line2"></span>
            </div>
            <p className="mb-0">
              For buying, renting, site visits, or owner listing support in Bareilly, reach out to the property desk.
            </p>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-10">
              {teamMembers.map((member) => (
                <div key={member.role} className="agent-profile-item bg-white">
                  <div className="agent-img">
                    <img src={member.image} alt={member.name} />
                  </div>
                  <div className="flex-grow-1">
                    <h5 className="mb-1">{member.name}</h5>
                    <p className="text-muted mb-3">{member.role}</p>
                    <div className="agent-info">
                      <p className="d-inline-flex align-items-center gap-2">
                        <i className="material-icons-outlined text-primary">call</i>
                        <span>Phone:</span>
                        <a href={member.phoneHref} className="text-decoration-none">{member.phoneLabel}</a>
                      </p>
                      <p className="d-inline-flex align-items-center gap-2">
                        <i className="material-icons-outlined text-success">forum</i>
                        <span>WhatsApp:</span>
                        <a href={member.whatsappHref} target="_blank" rel="noreferrer" className="text-decoration-none">
                          Chat Now
                        </a>
                      </p>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <a href={member.phoneHref} className="btn btn-primary rounded-0">Call Now</a>
                      <a href={member.whatsappHref} target="_blank" rel="noreferrer" className="btn btn-dark rounded-0">
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | 91bigha.com",
  description: "Support and help for 91bigha.com."
};

export default function SupportPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Support</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Support</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-light">
        <div className="container">
          <div className="card border-0 shadow-sm rounded-0">
            <div className="card-body p-4">
              <h4 className="mb-3">Need help?</h4>
              <p className="mb-3">
                For buying support, rental shortlists, owner listing help, or any website issue, contact the property
                desk.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <a href="tel:+917302166711" className="btn btn-primary rounded-0">Call Now</a>
                <a href="https://wa.me/917302166711" target="_blank" rel="noreferrer" className="btn btn-dark rounded-0">
                  WhatsApp
                </a>
                <a href="/contact-us" className="btn btn-light border rounded-0">Contact Us</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


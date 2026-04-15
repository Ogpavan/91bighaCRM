import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | 91bigha.com",
  description: "Terms and conditions for 91bigha.com."
};

export default function TermsAndConditionsPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Terms &amp; Conditions</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Terms &amp; Conditions</li>
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
              <h4 className="mb-3">Terms &amp; Conditions</h4>
              <p className="mb-3">
                By using 91bigha.com, you agree to use the website for lawful purposes only. Listings and details are
                provided for informational purposes; always verify property information before making decisions.
              </p>
              <p className="mb-3">
                We are not responsible for transactions between buyers/tenants and sellers/owners. Any deal, payment, or
                agreement is at the user&apos;s discretion and risk.
              </p>
              <p className="mb-0">
                We may update these terms from time to time. Continued use of the site indicates acceptance of the
                updated terms.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


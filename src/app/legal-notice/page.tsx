import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal Notice | 91bigha.com",
  description: "Legal notice for 91bigha.com."
};

export default function LegalNoticePage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Legal Notice</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Legal Notice</li>
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
              <h4 className="mb-3">Legal Notice</h4>
              <p className="mb-3">
                91bigha.com is a property discovery platform. Property information shown on the website is shared by
                owners/agents/builders or collected from publicly available sources. We aim to keep information accurate,
                but we do not guarantee completeness or real-time availability.
              </p>
              <p className="mb-3">
                All trademarks, logos, and brand names are the property of their respective owners. Use of the website
                indicates acceptance of our Terms &amp; Conditions and Privacy Policy.
              </p>
              <p className="mb-0">
                For corrections or legal concerns, contact us via the Contact Us page.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | 91bigha.com",
  description: "Refund policy for 91bigha.com."
};

export default function RefundPolicyPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Refund Policy</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Refund Policy</li>
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
              <h4 className="mb-3">Refund Policy</h4>
              <p className="mb-3">
                91bigha.com currently provides property discovery and enquiry support. If any paid service, promotion, or
                subscription is introduced, the refund terms will be stated clearly at the time of purchase.
              </p>
              <p className="mb-0">
                For payment-related questions, please contact support.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


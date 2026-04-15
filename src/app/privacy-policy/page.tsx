import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | 91bigha.com",
  description: "Privacy policy for 91bigha.com."
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="breadcrumb-bar">
        <div className="container">
          <div className="row align-items-center text-center">
            <div className="col-md-12 col-12">
              <h2 className="breadcrumb-title">Privacy Policy</h2>
              <nav aria-label="breadcrumb" className="page-breadcrumb">
                <ol className="breadcrumb justify-content-center">
                  <li className="breadcrumb-item"><a href="/">Home</a></li>
                  <li className="breadcrumb-item active" aria-current="page">Privacy Policy</li>
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
              <h4 className="mb-3">Privacy Policy</h4>
              <p className="mb-3">
                We collect limited information you share with us (for example, your name, phone number, and property
                requirement) when you submit an enquiry. We use it to respond to your request, coordinate site visits,
                and provide property support.
              </p>
              <p className="mb-3">
                We may use basic analytics and cookies to improve website performance and user experience. We do not sell
                your personal information.
              </p>
              <p className="mb-0">
                If you want your enquiry data removed or corrected, please contact us.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


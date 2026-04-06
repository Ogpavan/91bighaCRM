export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-dark">
      <div className="footer-bg">
        <img src="/assets/img/bg/footer-bg-01.png" className="bg-1" alt="" />
        <img src="/assets/img/bg/footer-bg-02.png" className="bg-2" alt="" />
      </div>

      <div className="footer-top">
        <div className="container">
          <div className="row row-gap-4">
            <div className="col-lg-4 col-md-6 col-sm-8">
              <div className="footer-widget footer-about">
                <h5>Get Our App</h5>
                <p>Download the app and book your property</p>
                <div className="download-app">
                  <a href="javascript:void(0);">
                    <img src="/assets/img/icons/goolge-play.svg" alt="Google Play" />
                  </a>
                  <a href="javascript:void(0);">
                    <img src="/assets/img/icons/app-store.svg" alt="App Store" />
                  </a>
                </div>
                <div className="social-links">
                  <h5>Connect with us</h5>
                  <div className="social-icon">
                    <a href="javascript:void(0);"><i className="fa-brands fa-facebook"></i></a>
                    <a href="javascript:void(0);"><i className="fa-brands fa-x-twitter"></i></a>
                    <a href="javascript:void(0);"><i className="fa-brands fa-instagram"></i></a>
                    <a href="javascript:void(0);"><i className="fa-brands fa-linkedin"></i></a>
                    <a href="javascript:void(0);"><i className="fa-brands fa-pinterest"></i></a>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-2 col-md-6 col-sm-4">
              <div className="footer-widget">
                <h5 className="footer-title">Pages</h5>
                <ul className="footer-menu">
                  <li><a href="/our-team.html">Our Team</a></li>
                  <li><a href="/pricing.html">Pricing Plans</a></li>
                  <li><a href="/gallery.html">Gallery</a></li>
                  <li><a href="javascript:void(0);">Settings</a></li>
                  <li><a href="javascript:void(0);">Profile</a></li>
                  <li><a href="/buy-property-list.html">Listings</a></li>
                </ul>
              </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-4">
              <div className="footer-widget">
                <h5 className="footer-title">Company</h5>
                <ul className="footer-menu">
                  <li><a href="/about-us">About Us</a></li>
                  <li><a href="javascript:void(0);">Careers</a></li>
                  <li><a href="/blog-grid.html">Blog</a></li>
                  <li><a href="javascript:void(0);">Affiliate Program</a></li>
                  <li><a href="/add-property-buy.html">Add Your Listing</a></li>
                  <li><a href="javascript:void(0);">Our Partners</a></li>
                </ul>
              </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-4">
              <div className="footer-widget">
                <h5 className="footer-title">Bareilly Localities</h5>
                <ul className="footer-menu">
                  <li><a href="javascript:void(0);">Civil Lines</a></li>
                  <li><a href="javascript:void(0);">Rajendra Nagar</a></li>
                  <li><a href="javascript:void(0);">DD Puram</a></li>
                  <li><a href="javascript:void(0);">Pilibhit Bypass</a></li>
                  <li><a href="javascript:void(0);">Model Town</a></li>
                  <li><a href="javascript:void(0);">Izatnagar</a></li>
                </ul>
              </div>
            </div>

            <div className="col-lg-2 col-md-4 col-sm-4">
              <div className="footer-widget">
                <h5 className="footer-title">Useful Links</h5>
                <ul className="footer-menu">
                  <li><a href="javascript:void(0);">Legal Notice</a></li>
                  <li><a href="/privacy-policy">Privacy Policy</a></li>
                  <li><a href="/terms-condition">Terms & Conditions</a></li>
                  <li><a href="javascript:void(0);">Support</a></li>
                  <li><a href="javascript:void(0);">Refund Policy</a></li>
                  <li><a href="/contact-us">Contact Us</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <div className="d-flex align-items-center justify-content-center flex-wrap gap-2">
            <div className="copyright">
              <p>Copyright &copy; {currentYear}. All Rights Reserved, 91bigha.com</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

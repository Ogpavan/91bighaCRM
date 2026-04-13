import Link from "next/link";
import { HomeLivePropertiesSection } from "@/components/home-live-properties-section";
import {
  formatPropertyAddress,
  formatPropertyArea,
  formatPropertyPrice,
  formatPublishedDate
} from "@/lib/home-property-formatters";
import type { HomepageProperty } from "@/lib/properties";
import {
  getPropertyTypeOptions,
  listHomepageProperties,
  listPropertyTypeCounts,
  type PropertyTypeCount
} from "@/lib/properties";

export default async function HomePage() {
  let saleProperties: HomepageProperty[] = [];
  let rentProperties: HomepageProperty[] = [];
  let propertyTypeCounts: PropertyTypeCount[] = [];

  const propertyTypeOptions = await getPropertyTypeOptions();

  try {
    [saleProperties, rentProperties, propertyTypeCounts] = await Promise.all([
      listHomepageProperties("sale", 6),
      listHomepageProperties("rent", 6),
      listPropertyTypeCounts(6)
    ]);
  } catch (error) {
    console.error("Failed to load homepage property data", error);
  }

  return (
    <>
<section className="Home-banner-section">
			<div className="container">
				<div className="row">
					<div className="col-lg-6">
						<div className="banner-content">
							<h1 className="mb-2">Find property in <span className="hero-city-highlight">Bareilly</span> for buying, renting, and investment.</h1>
							<p className="mb-0">Explore verified homes, plots, and rentals across Civil Lines, DD Puram, Rajendra Nagar, Izatnagar, and nearby Bareilly localities.</p>
						</div>
					</div>
				</div>

				<div className="home-search-1 home-search-2">
					<ul className="nav nav-tabs justify-content-lg-start justify-content-center" role="tablist">
						<li className="nav-item" role="presentation">
							<a className="nav-link active" data-bs-toggle="tab" href="#buy_property" role="tab" aria-controls="buy_property" aria-selected="true">
								<i className="material-icons-outlined me-2">shopping_basket</i>Buy Property
							</a>
						</li>
						<li className="nav-item" role="presentation">
							<a className="nav-link" data-bs-toggle="tab" href="#rent_property" role="tab" aria-controls="rent_property" aria-selected="false">
								<i className="material-icons-outlined me-2">king_bed</i>Rent Property
							</a>
						</li>
					</ul>

					<div className="tab-content">
						<div className="tab-pane fade show active" id="buy_property" role="tabpanel">
							<div className="search-item">
								<form action="/buy-property-grid-sidebar" method="get">
									<div className="d-flex align-items-bottom flex-wrap flex-lg-nowrap gap-3">
										<div className="flex-fill select-field w-100">
											<label className="form-label">Property Type</label>
											<select className="form-select" name="propertyType" defaultValue="">
												<option value="">All Types</option>
												{propertyTypeOptions.map((option) => (
													<option key={option.slug} value={option.name}>
														{option.name}
													</option>
												))}
											</select>
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Location</label>
											<input type="text" name="location" className="form-control" placeholder="Enter Bareilly locality" />
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Min Budget</label>
											<input type="number" name="minPrice" min="0" step="100000" className="form-control" placeholder="2500000" />
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Max Budget</label>
											<input type="number" name="maxPrice" min="0" step="100000" className="form-control" placeholder="20000000" />
										</div>
										<div className="custom-search-item d-flex align-items-end">
											<button type="submit" className="btn btn-primary">
												<i className="material-icons-outlined">search</i>
											</button>
										</div>
									</div>
								</form>
							</div>
						</div>

						<div className="tab-pane fade" id="rent_property" role="tabpanel">
							<div className="search-item">
								<form action="/rent-property-grid-sidebar" method="get">
									<div className="d-flex align-items-bottom flex-wrap flex-lg-nowrap gap-3">
										<div className="flex-fill select-field w-100">
											<label className="form-label">Property Type</label>
											<select className="form-select" name="propertyType" defaultValue="">
												<option value="">All Types</option>
												{propertyTypeOptions.map((option) => (
													<option key={option.slug} value={option.name}>
														{option.name}
													</option>
												))}
											</select>
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Location</label>
											<input type="text" name="location" className="form-control" placeholder="Enter Bareilly rental area" />
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Min Rent</label>
											<input type="number" name="minPrice" min="0" step="1000" className="form-control" placeholder="8000" />
										</div>
										<div className="flex-fill select-field w-100">
											<label className="form-label">Max Rent</label>
											<input type="number" name="maxPrice" min="0" step="1000" className="form-control" placeholder="35000" />
										</div>
										<div className="custom-search-item d-flex align-items-end">
											<button type="submit" className="btn btn-primary">
												<i className="material-icons-outlined">search</i>
											</button>
										</div>
									</div>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
			</section>
			<section className="how-work-section section-padding">
			<div className="container">

				
				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center">How It Works</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center">Follow these 3 steps to book your place</p>
				</div>
				

				
				<div className="row">
					<div className="col-lg-4 d-flex aos" data-aos="fade-up" data-aos-duration="500">
						<div className="howit-work-item text-center aos-init aos-animate flex-fill" data-aos="fade-down" data-aos-duration="1200" data-aos-delay="100">
							<div className="mb-3 bg-secondary avatar avatar-md rounded-circle p-2">
								<img src="/assets/img/home/icons/work-icon-1.svg" alt="icon" />
							</div>
							<h5 className="mb-3">01. Search for Location</h5>
							<p className="mb-0">Find properties by location quickly, matching your lifestyle and preferences easily.</p>
						</div>
					</div> 

					<div className="col-lg-4 d-flex aos" data-aos="fade-down" data-aos-duration="1000">
						<div className="howit-work-item text-center aos-init aos-animate flex-fill" data-aos="fade-down" data-aos-duration="1200" data-aos-delay="100">
							<div className=" mb-3 bg-danger avatar avatar-md rounded-circle p-2">
								<img src="/assets/img/home/icons/work-icon-2.svg" alt="icon" />
							</div>
							<h5 className="mb-3">02. Select Property Type</h5>
							<p className="mb-0">Choose your ideal property type easily, from apartments to villas.</p>
						</div>
					</div> 

					<div className="col-lg-4 d-flex aos" data-aos="fade-up" data-aos-duration="500">
						<div className="howit-work-item text-center aos-init aos-animate flex-fill" data-aos="fade-down" data-aos-duration="1200" data-aos-delay="100">
							<div className="mb-3 bg-success avatar avatar-md rounded-circle p-2">
								<img src="/assets/img/home/icons/work-icon-3.svg" alt="icon" />
							</div>
							<h5 className="mb-3">03. Book Your Property</h5>
							<p className="mb-0">Secure your dream property quickly with a simple, hassle-free booking process.</p>
						</div>
					</div> 
				</div>
				
			</div>
		</section>
		

		 
		<section className="home-property-section section-padding bg-dark position-relative overflow-hidden">
			<div className="container">
				
				
				<div className="row position-relative">
					<div className="col-lg-4">
						
						<div className="section-heading">
							<h2 className="mb-2 text-lg-start text-center text-white">Explore by  <span className="d-lg-block "> Property Type </span></h2>
							<div className="sec-line justify-content-lg-start">
								<span className="sec-line1"></span>
								<span className="sec-line2"></span>
							</div>
							<p className="mb-0 text-lg-start text-center text-light">Whether you're looking for a cozy apartment, a luxurious villa, or a commercial investment, we’ve got you covered.</p>
						</div>
						
					</div>

					<div className="col-lg-8">
						<div className="property-slider">
							{propertyTypeCounts.length ? propertyTypeCounts.map((propertyType, index) => (
								<div key={propertyType.slug} className="property-item">
									<div className="property-card-item">
										<div className="mb-3 text-center">
											<img
												src={`/assets/img/home/icons/property-icon-${(index % 4) + 1}.svg`}
												alt={propertyType.name}
												className="m-auto"
											/>
										</div>
										<h5 className="mb-1">{propertyType.name}</h5>
										<p className="mb-0">{propertyType.propertyCount} Properties</p>
									</div>
								</div>
							)) : (
								<div className="property-item">
									<div className="property-card-item">
										<h5 className="mb-1">Property inventory updates soon</h5>
										<p className="mb-0">Upload listings to see live property types here.</p>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				

			</div>

			
			<img src="/assets/img/home/icons/property-element-1.svg" alt="property-element-0" className="img-fluid custom-element-img-1 d-lg-block d-none" />
			<img src="/assets/img/home/icons/property-element-2.svg" alt="property-element-0" className="img-fluid custom-element-img-2 d-lg-block d-none" />
		</section>

		<HomeLivePropertiesSection
			saleProperties={saleProperties}
			rentProperties={rentProperties}
		/>
		

		 
		<section className="features-section featured-sales-section section-padding bg-light position-relative">
			<div className="container">

				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center">Featured Properties for Sales</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center">Hand-picked selection of quality places</p>
				</div>

				<div className="feature-slider-item features-slider position-none">
					{saleProperties.length ? saleProperties.map((property, index) => {
						const coverImage = property.coverImage?.trim() || null;
						const location = formatPropertyAddress(property) || "Bareilly";
						const price = formatPropertyPrice(property);
						const duration = 1000 + (index % 3) * 200;
						const category = property.propertyType || "Property";
						return (
							<div key={property.id} className="features-slide-card">
								<div className="d-flex aos" data-aos="fade-down" data-aos-duration={duration}>
									<div className="property-card flex-fill">
										<div className="property-listing-item p-0 mb-0 shadow-none">
											<div className="buy-grid-img mb-0 rounded-0">
												<Link href={`/buy-details/${property.slug}`}>
													{coverImage ? (
														<img className="img-fluid" src={coverImage} alt={property.title} />
													) : (
														<div className="d-flex h-100 w-100 align-items-center justify-content-center bg-light text-muted">
															No Image
														</div>
													)}
												</Link>
												<div className="d-flex align-items-center justify-content-between position-absolute top-0 start-0 end-0 p-3 z-1">
													<div className="d-flex align-items-center gap-2">
														<span className="badge badge-sm bg-secondary text-uppercase">{property.listingType}</span>
														{property.isFeatured ? (
															<span className="badge badge-sm bg-orange d-flex align-items-center gap-1">
																<i className="material-icons-outlined">loyalty</i>
																Featured
															</span>
														) : null}
														{property.isVerified ? (
															<span className="badge badge-sm bg-success d-flex align-items-center gap-1">
																<i className="material-icons-outlined">verified</i>
																Verified
															</span>
														) : null}
													</div>
													<a href="javascript:void(0)" className="favourite">
														<i className="material-icons-outlined">favorite_border</i>
													</a>
												</div>
												<div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
													<h6 className="text-white mb-0">{price}</h6>
												</div>
											</div>
											<div className="buy-grid-content">
												<div className="d-flex align-items-center justify-content-between mb-3">
													<div>
														<h6 className="title mb-1">
															<Link href={`/buy-details/${property.slug}`}>{property.title}</Link>
														</h6>
														<p className="d-flex align-items-center fs-14 mb-0">
															<i className="material-icons-outlined me-1 ms-0">location_on</i>
															{location}
														</p>
													</div>
												</div>
												<ul className="d-flex buy-grid-details mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
													<li className="d-flex align-items-center gap-1">
														<i className="material-icons-outlined bg-white text-secondary">bed</i>
														{property.bedrooms ?? "-"} Bedroom
													</li>
													<li className="d-flex align-items-center gap-1">
														<i className="material-icons-outlined bg-white text-secondary">bathtub</i>
														{property.bathrooms ?? "-"} Bath
													</li>
													<li className="d-flex align-items-center gap-1">
														<i className="material-icons-outlined bg-white text-secondary">straighten</i>
														{formatPropertyArea(property)}
													</li>
												</ul>
												<div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
													<p className="fs-14 fw-medium text-dark mb-0">
														Listed on : <span className="fw-medium text-body">{formatPublishedDate(property.publishedAt)}</span>
													</p>
													<p className="fs-14 fw-medium text-dark mb-0">
														Category : <span className="fw-medium text-body">{category}</span>
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						);
					}) : (
						<div className="features-slide-card">
							<div className="d-flex aos" data-aos="fade-down" data-aos-duration="1000">
								<div className="property-card flex-fill">
									<div className="property-listing-item p-0 mb-0 shadow-none">
										<div className="buy-grid-content">
											<p className="text-center fs-14 text-muted mb-0">No sale properties have been uploaded yet.</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
		{false ? (
		<section className="features-section featured-rent-section section-padding bg-light position-relative">
			<div className="container">

				
				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center">Featured Properties for Rent</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center">Hand-picked selection of quality places</p>
				</div>
				

				<div className="feature-slider-item features-slider position-none">
					
					<div className="features-slide-card">
						
                        <div className="d-flex aos" data-aos="fade-down" data-aos-duration="1000">
                            <div className="property-card flex-fill">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-01.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute top-0 start-0 end-0 p-3 z-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="badge badge-sm bg-danger d-flex align-items-center">
                                                    <i className="material-icons-outlined">offline_bolt</i>New
                                                </div>
                                                <div className="badge badge-sm bg-orange d-flex align-items-center">
                                                    <i className="material-icons-outlined">loyalty</i>Featured
                                                </div>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹18,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Lodge</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Civil Lines Rental Suite</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>17, Civil Lines, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                4 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                4 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                350 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-10.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Aarav Sharma<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>

						
						<div className="d-flex aos" data-aos="fade-down" data-aos-duration="1500">
                            <div className="property-card flex-fill property-card mb-0">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-04.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹22,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Residency</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Coral Bay Cabins</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>7, Model Town, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                5 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                3 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                700 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-13.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Sana Khan<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div>
                        </div>
					</div>

					
					<div className="features-slide-card">
						
						<div className="d-flex aos" data-aos="fade-down" data-aos-duration="1000">
                            <div className="property-card flex-fill">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-02.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹14,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Apartment</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Gateway Apartment</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>54, Rajendra Nagar, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                2 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                4 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                350 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-11.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Neha Verma<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>

						
						<div className="d-flex aos" data-aos="fade-down" data-aos-duration="1500">
                            <div className="property-card flex-fill mb-0">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-05.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹30,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Residency</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Majestic Stay</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>10, Green Park, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                2 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                1 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                400 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-14.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Ritika Sinha<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>
					</div>

					
					<div className="features-slide-card">
						
						<div className="d-flex aos" data-aos="fade-down" data-aos-duration="1000">
                            <div className="property-card flex-fill">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-03.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹24,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Condo</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Cozy Urban Condo</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>130, Izatnagar, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                4 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                3 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                520 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-12.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Mohit Saxena<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>

						
                        <div className="d-flex aos" data-aos="fade-down" data-aos-duration="1500">
                            <div className="property-card flex-fill mb-0">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-06.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹21,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Lodge</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Noble Nest</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>76, Prem Nagar, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                3 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                2 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                550 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-15.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Priya Agrawal<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>
					</div>

					
					<div className="features-slide-card">
						
                        <div className="d-flex aos" data-aos="fade-down" data-aos-duration="1000">
                            <div className="property-card flex-fill">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-07.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹17,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Villa</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Holiday Haven Homes</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>88, Airport Road, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                2 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                1 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                480 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-16.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Karan Gupta<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>

						
                        <div className="d-flex aos" data-aos="fade-down" data-aos-duration="1500">
                            <div className="property-card mb-0 flex-fill">
                                <div className="property-listing-item p-0 mb-0 shadow-none">
                                    <div className="buy-grid-img mb-0 rounded-0">
                                        <a href="/rent-details">
                                            <img className="img-fluid" src="/assets/img/rent/rent-grid-img-08.jpg" alt="" />
                                        </a>
                                        <div className="d-flex align-items-center justify-content-between position-absolute bottom-0 end-0 start-0 p-3 z-1">
                                            <h6 className="text-white mb-0">₹25,000 <span className="fs-14 fw-normal"> / Month </span></h6>
                                            <a href="javascript:void(0)" className="favourite">
                                                <i className="material-icons-outlined">favorite_border</i>
                                            </a>
                                        </div>
                                    </div> 
                                    <div className="buy-grid-content">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <i className="material-icons-outlined text-warning">star</i>
                                                <span className="ms-1 fs-14">Excellent</span>
                                            </div>
                                            <span className="badge bg-secondary"> Apartment</span>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <div>
                                                <h6 className="title mb-1">
                                                    <a href="/buy-details">Rentora Apartment</a> 
                                                </h6>
                                                <p className="d-flex align-items-center fs-14 mb-0"><i className="material-icons-outlined me-1 ms-0">location_on</i>305, Delapeer, Bareilly, Uttar Pradesh</p>
                                            </div>
                                        </div>
                                        <ul className="d-flex buy-grid-details d-flex mb-3 bg-light rounded p-3 justify-content-between align-items-center flex-wrap gap-1">
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bed</i>
                                                2 Bedroom
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">bathtub</i>
                                                2 Bath
                                            </li>
                                            <li className="d-flex align-items-center gap-1">
                                                <i className="material-icons-outlined bg-white text-secondary">straighten</i>
                                                350 Sq Ft
                                            </li>
                                        </ul>
                                        <div className="d-flex align-items-center justify-content-between flex-wrap border-top border-light-100 pt-3 gap-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="avatar avatar-lg user-avatar">
                                                    <img src="/assets/img/users/user-17.jpg" alt="" className="rounded-circle" />
                                                </div>
                                                <a href="javascript:void(0);" className="mb-0 fs-16 fw-medium text-dark">Ishita Kapoor<span className="d-block fs-14 text-body pt-1">Bareilly, India</span> </a>
                                            </div>
                                            <a href="/rent-details" className="btn btn-dark">Book Now</a>
                                        </div>
                                    </div>
                                </div> 
                            </div> 
                        </div>
					</div>
				</div>

				<div className="text-center d-flex align-items-center justify-content-center m-auto">
					<a href="/rent-property-grid.html" className="btn btn-lg btn-dark d-flex align-items-center gap-1"> Explore All <i className="material-icons-outlined">arrow_forward</i></a>
				</div>
			</div>
		</section>
		) : null}
		
		<section className="statistics-section section-padding bg-dark position-relative">
			<div className="container">

				
				<div className="d-flex align-items-center justify-content-lg-between justify-content-md-between justify-content-center flex-wrap gap-2">
					<div className="statistics-item d-flex align-items-center gap-2 flex-wrap aos" data-aos="fade-down" data-aos-duration="1000">
						<div>
							<img src="/assets/img/home/icons/stat-icon-1.svg" alt="stat-icon-1" className="img-fluid stat-img" />
						</div>
						<div>
							<h4 className="mb-1"><span>50K</span></h4>
							<p className="mb-0">Listings Added</p>
						</div>
					</div>

					<div className="statistics-item d-flex align-items-center gap-2 flex-wrap aos" data-aos="fade-up" data-aos-duration="1000">
						<div>
							<img src="/assets/img/home/icons/stat-icon-2.svg" alt="stat-icon-1" className="img-fluid stat-img" />
						</div>
						<div>
							<h4 className="mb-1"><span>3000+</span></h4>
							<p className="mb-0">Agents Listed</p>
						</div>
					</div>

					<div className="statistics-item d-flex align-items-center gap-2 flex-wrap aos" data-aos="fade-down" data-aos-duration="1000">
						<div>
							<img src="/assets/img/home/icons/stat-icon-3.svg" alt="stat-icon-1" className="img-fluid stat-img" />
						</div>
						<div>
							<h4 className="mb-1"><span>2000+</span></h4>
							<p className="mb-0">Sales Completed</p>
						</div>
					</div>

					<div className="statistics-item d-flex align-items-center gap-2 flex-wrap aos" data-aos="fade-up" data-aos-duration="1000">
						<div>
							<img src="/assets/img/home/icons/stat-icon-4.svg" alt="stat-icon-1" className="img-fluid stat-img" />
						</div>
						<div> 
							<h4 className="mb-1"> <span>5000+</span></h4>
							<p className="mb-0">Users </p>
						</div>
					</div>
				</div>
				

			</div>
			
			<img src="/assets/img/home/icons/property-element-1.svg" alt="property-element-0" className="img-fluid custom-element-img-1 d-lg-block d-none" />
			<img src="/assets/img/home/icons/property-element-2.svg" alt="property-element-0" className="img-fluid custom-element-img-2 d-lg-block d-none" />
		</section>
		 

		 
		<section className="buy-property-section section-padding pb-0">
			<div className="container">

				<div className="row justify-content-center">
					
					<div className="col-lg-4 col-md-6">
						<div className="buy-property-item text-center mb-lg-0 mb-md-0  mb-4 aos" data-aos="fade-down" data-aos-duration="1000">
							<div className="img-card overflow-hidden text-center">
								<a href="/buy-property-grid.html"><img src="/assets/img/home/city/property-img-1.jpg" alt="Property Image" /></a>
							</div>
							<div className="buy-property bg-white d-flex align-items-center justify-content-between">
								<h6 className="mb-0"><a href="/buy-property-grid.html">Buy a Property</a></h6>
								<a href="/buy-property-grid.html" className="arrow buy-arrow d-flex align-items-center justify-content-center bg-error rounded-circle"><i className='fa-solid fa-arrow-right'></i></a>
							</div>
						</div>
					</div>

					
					<div className="col-lg-4 col-md-6" >
						<div className="buy-property-item mb-lg-0 mb-4 text-center aos" data-aos="fade-up" data-aos-duration="1000">
							<div className="img-card overflow-hidden text-center">
								<a href="/rent-property-grid.html"><img src="/assets/img/home/city/property-img-2.jpg" alt="Property Image" /></a>
							</div>
							<div className="buy-property bg-white d-flex align-items-center justify-content-between">
								<h6 className="mb-0"><a href="/rent-property-grid.html">Sell a Property</a></h6>
								<a href="/rent-property-grid.html" className="arrow sell-arrow d-flex align-items-center justify-content-center bg-warning rounded-circle"><i className='fa-solid fa-arrow-right'></i></a>
							</div>
						</div>
					</div>

					
					<div className="col-lg-4 col-md-6" >
						<div className="buy-property-item mb-0 text-center aos" data-aos="fade-down" data-aos-duration="1000">
							<div className="img-card overflow-hidden text-center">
								<a href="/rent-property-grid.html"><img src="/assets/img/home/city/property-img-3.jpg" alt="Property Image" /></a>
							</div>
							<div className="buy-property bg-white d-flex align-items-center justify-content-between">
								<h6 className="mb-0"><a href="/rent-property-grid.html">Rent a Property</a></h6>
								<a href="/rent-property-grid.html" className="arrow rent-arrow d-flex align-items-center justify-content-center bg-info rounded-circle"><i className='fa-solid fa-arrow-right'></i></a>
							</div>
						</div>
					</div>
				</div>

			</div>
		</section>
		 

		 
		<section className="partners-section section-padding ">
			<div className="container">

				
				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center">Hundreds of Partners Around  the World</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center"> Every day, we build trust through  communication, transparency, and results.</p>
				</div>
				

				<div className="partners-slide-item partners-slider">
					<div className="partners-slide aos" data-aos="fade-right" data-aos-duration="1000">
						<div className="partners-items">
							<img src="/assets/img/home/icons/partners-img-1.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1500">
							<img src="/assets/img/home/icons/partners-img-2.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1000">
							<img src="/assets/img/home/icons/partners-img-3.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1500">
							<img src="/assets/img/home/icons/partners-img-4.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1000">
							<img src="/assets/img/home/icons/partners-img-5.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1500">
							<img src="/assets/img/home/icons/partners-img-3.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

					<div className="partners-slide">
						<div className="partners-items aos" data-aos="fade-right" data-aos-duration="1000">
							<img src="/assets/img/home/icons/partners-img-2.svg" alt="partners-icon-1.svg" className="img-fluid partners-icon" />
						</div>
					</div>

				</div>
			</div>
		</section>
		 

		 
		<section className="testimonials-section testimonials-spacing-section section-padding ">
			<div className="container">

				
				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center text-white">Testimonials</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center text-light">What our happy client says</p>
				</div>
				

				<div className="testimonials-slider-item testimonials-slider">

					<div className="testimonials-slide">
						
						<div className="testimonials-item aos" data-aos="fade-down" data-aos-duration="1000">
							<p className="mb-2"> Booking our dream home was incredibly easy with 91bigha.com The interface was user-friendly </p>
							<h6 className="mb-2"> Ananya Sharma </h6>
							<div className="d-flex align-items-center justify-content-center">
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
							</div>
						</div>
					</div>

					<div className="testimonials-slide">
						
						<div className="testimonials-item aos" data-aos="fade-up" data-aos-duration="1000">
							<p className="mb-2"> 91bigha.com made home booking a breeze. Super easy and stress-free! listing Portal of all time </p>
							<h6 className="mb-2"> Rohan Verma </h6>
							<div className="d-flex align-items-center justify-content-center">
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
							</div>
						</div>
					</div>

					<div className="testimonials-slide">
						
						<div className="testimonials-item aos" data-aos="fade-down" data-aos-duration="1000">
							<p className="mb-2"> From browsing to booking, everything felt effortless great design, clear information.</p>
							<h6 className="mb-2"> Priya Singh </h6>
							<div className="d-flex align-items-center justify-content-center">
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
							</div>
						</div>
					</div>

					<div className="testimonials-slide">
						
						<div className="testimonials-item aos" data-aos="fade-up" data-aos-duration="1000">
							<p className="mb-2"> Inding the perfect home was a breeze. The platform was smooth, intuitive, and made experience. </p>
							<h6 className="mb-2"> Vivek Mishra </h6>
							<div className="d-flex align-items-center justify-content-center">
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
							</div>
						</div>
					</div>

					<div className="testimonials-slide">
						
						<div className="testimonials-item aos" data-aos="fade-down" data-aos-duration="1000">
							<p className="mb-2"> 91bigha.com made home booking a breeze. Super easy and stress-free! listing Portal of all time </p>
							<h6 className="mb-2"> Sneha Gupta </h6>
							<div className="d-flex align-items-center justify-content-center">
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
								<i className="material-icons-outlined text-warning">star</i>
							</div>
						</div>
					</div>

				</div>

			</div>
		</section>
		 

		 
		<section className="faq-section section-padding bg-light ">
			<div className="container">

				
				<div className="section-heading aos" data-aos="fade-down" data-aos-duration="1000">
					<h2 className="mb-2 text-center">Frequently Asked Questions</h2>
					<div className="sec-line">
						<span className="sec-line1"></span>
						<span className="sec-line2"></span>
					</div>
					<p className="mb-0 text-center"> Ready to buy your dream home? find it here.</p>
				</div>
				

				
				<div className="row">
					<div className="col-lg-6 aos" data-aos="fade-up" data-aos-duration="1500">
						<img src="/assets/img/home/bg/faq-img.jpg" alt="" className="img-fluid custom-faq-img rounded" />
					</div>
					<div className="col-lg-6">
						
						<div className="card mb-0">
							<div className="card-body">
								<div>
									<h5 className="mb-4"> General FAQ’s </h5>
									<div className="accordion accordions-items-seperate faq-accordion m-0" id="faq-accordion">

										
										<div className="accordion-item">
											<div className="accordion-header aos" data-aos="fade-down" data-aos-duration="1000">
												<button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-1" aria-expanded="true">
													What is real estate?
												</button>
											</div>
											<div id="accordion-1" className="accordion-collapse collapse show" data-bs-parent="#faq-accordion">
												<div className="accordion-body">
													<p className="mb-0">Real estate refers to land and any permanent structures on it, such as homes or buildings.</p>
												</div>
											</div>
										</div>

										
										<div className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
											<div className="accordion-header">
												<button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-2" aria-expanded="false">
													What types of properties are included in real estate?
												</button>
											</div>
											<div id="accordion-2" className="accordion-collapse collapse" data-bs-parent="#faq-accordion">
												<div className="accordion-body">
													<p className="mb-0">Real estate includes residential, commercial, industrial, land, and special-purpose properties.</p>
												</div>
											</div>
										</div>

										
										<div className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
											<div className="accordion-header">
												<button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-3" aria-expanded="false">
													What is the role of a real estate agent?
												</button>
											</div>
											<div id="accordion-3" className="accordion-collapse collapse" data-bs-parent="#faq-accordion">
												<div className="accordion-body">
													<p className="mb-0">A real estate agent assists clients in buying, selling, or renting properties by guiding them through the process.</p>
												</div>
											</div>
										</div>
										
									</div>
								</div>
								<div>
									<h5 className="mb-4 mt-4"> Buying FAQ’s </h5>
									<div className="accordion accordions-items-seperate faq-accordion m-0" id="faq-accordion1">

										
										<div className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
											<div className="accordion-header">
												<button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-4" aria-expanded="true">
													How do I start the home-buying process?
												</button>
											</div>
											<div id="accordion-4" className="accordion-collapse collapse" data-bs-parent="#faq-accordion1">
												<div className="accordion-body">
													<p className="mb-0">Start the home-buying process by checking your budget, getting pre approved for a mortgage, and consulting a real estate agent.</p>
												</div>
											</div>
										</div>
										
										
										<div className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
											<div className="accordion-header">
												<button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-5" aria-expanded="false">
													How much down payment do I need?
												</button>
											</div>
											<div id="accordion-5" className="accordion-collapse collapse" data-bs-parent="#faq-accordion1">
												<div className="accordion-body">
													<p className="mb-0">The down payment typically ranges from 3% to 20% of the home's price, depending on the loan type and lender requirements.</p>
												</div>
											</div>
										</div>

										
										<div className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
											<div className="accordion-header">
												<button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion-6" aria-expanded="false">
													What is a home inspection?
												</button>
											</div>
											<div id="accordion-6" className="accordion-collapse collapse" data-bs-parent="#faq-accordion1">
												<div className="accordion-body">
													<p className="mb-0">A home inspection is a professional evaluation of a property's condition to identify any issues before finalizing the purchase.</p>
												</div>
											</div>
										</div>

									</div>
								</div>
							</div>
						</div>


					</div>
				</div>
				

			</div>
		</section>
		 

		 
		{/* <PropertyCityTabsSection /> */}

		<section className="agent-section section-padding bg-dark position-relative">
			<div className="container">

				
				<div className="row align-items-center justify-content-lg-between justify-content-md-between flex-wrap">
					<div className="col-lg-7 aos" data-aos="zoom-in" data-aos-duration="1000">
						
						<div className="section-heading mb-3 mb-lg-0">
							<h2 className="mb-2 text-center text-lg-start  text-white ">Become a Real Estate Agent</h2>
							<p className="mb-0 text-center text-lg-start text-light">At 91bigha.com, we provide the tools, training, and support you need to succeed in the competitive real estate market.</p>
						</div>
						
					</div>
					<div className="col-lg-5 position-relative z-1 aos" data-aos="zoom-in" data-aos-duration="1500">
						<div className="text-lg-end text-center ">
							<a href="" className="btn btn-xl btn-primary"> Register Now </a>
						</div>
					</div>
				</div>
				

			</div>


			<i className="fa-solid fa-circle custom-circle-line-1 d-lg-block d-none"></i>
			<i className="fa-solid fa-circle custom-circle-line-2 d-lg-block d-none"></i>


			<img src="/assets/img/home/icons/property-element-1.svg" alt="property-element-0" className="img-fluid custom-element-img-1 d-lg-block d-none" />
			<img src="/assets/img/home/icons/property-element-2.svg" alt="property-element-0" className="img-fluid custom-element-img-2 d-lg-block d-none" />
			<img src="/assets/img/home/city/cities-img.png" alt="property-element-0" className="img-fluid custom-element-img-3 position-absolute end-0 bottom-0 z-0 d-lg-block d-none" />
		</section>
		 

		<section className="home-support-section section-padding bg-light">
			<div className="container">

				
				<div className="row align-items-center">
					<div className="col-lg-6 aos" data-aos="fade-down" data-aos-duration="1000">
						
						<div className="section-heading mb-3 mb-lg-0">
							<h2 className="mb-2 text-lg-start text-center">Sign Up for Our Newsletter</h2>
							<p className="mb-0 text-lg-start text-center"> Receive news, stay updated, and special offers.</p>
						</div>
						
					</div> 

					<div className="col-lg-6 aos" data-aos="fade-down" data-aos-duration="1500">
						<div className="d-flex align-items-center justify-content-between gap-2">
							<div className="position-relative support-custom-icons">
								<div className="input-group input-group-flat">
									<input type="text" className="form-control bg-white w-100" placeholder="Enter Email Address" /> 
								</div>
								<i className="material-icons-outlined text-dark z-2">email</i>
							</div>
							<a href="" className="btn btn-lg btn-primary"> Subscribe</a>
						</div>
					</div> 

				</div>
				
				
			</div>
		</section>
    </>
  );
}

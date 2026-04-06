import { readFile } from "node:fs/promises";
import path from "node:path";

const SNAPSHOT_ROOT = path.join(process.cwd(), "src", "template-snapshots");

const rentGridReplacements: Array<[string | RegExp, string]> = [
  [/Buy Grid Sidebar/g, "Rent Grid Sidebar"],
  [/href=(['"])buy-property-list-sidebar\.html\1\s+class=(['"])list-icon\2/g, 'href=$1rent-property-list-sidebar.html$1 class=$2list-icon$2'],
  [/href=(['"])buy-grid-map\.html\1\s+class=(['"])list-icon\2/g, 'href=$1rent-grid-map.html$1 class=$2list-icon$2'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-01\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-01.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-02\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-02.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-03\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-03.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-04\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-04.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-05\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-05.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-06\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-06.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-07\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-07.jpg$1'],
  [/src=(['"])assets\/img\/buy\/buy-grid-img-08\.jpg\1/g, 'src=$1assets/img/rent/rent-grid-img-08.jpg$1'],
  [/<h6 class="text-white mb-0">\$21000<\/h6>/g, '<h6 class="text-white mb-0">₹28,000<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1940<\/h6>/g, '<h6 class="text-white mb-0">₹19,500<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1370<\/h6>/g, '<h6 class="text-white mb-0">₹14,500<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1650<\/h6>/g, '<h6 class="text-white mb-0">₹18,000<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1645<\/h6>/g, '<h6 class="text-white mb-0">₹17,500<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1950<\/h6>/g, '<h6 class="text-white mb-0">₹22,000<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$2470<\/h6>/g, '<h6 class="text-white mb-0">₹26,000<span class="fs-14 fw-normal">/month</span></h6>'],
  [/<h6 class="text-white mb-0">\$1900<\/h6>/g, '<h6 class="text-white mb-0">₹21,000<span class="fs-14 fw-normal">/month</span></h6>'],
  [/Serenity Condo Suite/g, "Lakeview Rental Suite"],
  [/17, Grove Towers, New York, USA/g, "17, Civil Lines Residency, Bareilly"],
  [/Loyal Apartment/g, "Willow Creek Apartment"],
  [/25, Willow Crest Apartment, USA/g, "25, DD Puram Extension, Bareilly"],
  [/Grand Villa House/g, "Maple Grove Villa"],
  [/10, Oak Ridge Villa, USA/g, "10, Model Town Enclave, Bareilly"],
  [/Palm Cove Bungalows/g, "Palm Cove Bungalow"],
  [/44, Palm Cove, Los Angeles, USA/g, "44, Rajendra Nagar, Bareilly"],
  [/Blue Horizon Villa/g, "Blue Horizon Homes"],
  [/76, Golden Oaks, Dallas, USA/g, "76, Green Park, Bareilly"],
  [/Wanderlust Lodge/g, "Greenfield Service Apartment"],
  [/91, Birch Residences, Boston, USA/g, "91, Izatnagar Residency, Bareilly"],
  [/Elite Suite Room/g, "Elite Studio Room"],
  [/42, Maple Grove Residences, USA/g, "42, Pilibhit Bypass, Bareilly"],
  [/Celestial Residency/g, "Celestial Rental Homes"],
  [/28, Hilltop Gardens, San Francisco, USA/g, "28, Rampur Garden, Bareilly"],
  [/Listed on :/g, "Available from :"],
  [/Category :/g, "Rental Type :"],
  [/>Villa<\/span>/g, ">Villa Rental</span>"],
  [/>Apartment<\/span>/g, ">Apartment Rental</span>"],
  [/>Lodge <\/span>/g, ">Serviced Apartment </span>"],
  [/>Suite <\/span>/g, ">Studio </span>"],
  [/>Residency <\/span>/g, ">Family Rental </span>"]
];

const globalTemplateReplacements: Array<[string | RegExp, string]> = [
  [/New York|Newyork/g, "Bareilly"],
  [/Los Angeles/g, "Civil Lines"],
  [/San Francisco/g, "DD Puram"],
  [/Dallas/g, "Rajendra Nagar"],
  [/Boston/g, "Izatnagar"],
  [/Miami/g, "Pilibhit Bypass"],
  [/Brighton, UK/g, "Model Town, Bareilly"],
  [/Manchester, UK/g, "Izatnagar, Bareilly"],
  [/Kyoto, Japan/g, "Prem Nagar, Bareilly"],
  [/Sydney, Australia/g, "Airport Road, Bareilly"],
  [/Dubai, UAE/g, "Delapeer, Bareilly"],
  [/Rome, Italy/g, "Green Park, Bareilly"],
  [/USA|United States|United Kingdom|Japan|Australia|UAE|Italy/g, "India"],
  [/Hawai/g, "Civil Lines"],
  [/Istanbul/g, "Rajendra Nagar"],
  [/San Diego/g, "DD Puram"],
  [/Belgium/g, "Pilibhit Bypass"]
];

function absolutizeTemplatePath(target: string) {
  if (/^(https?:|mailto:|tel:|#|javascript:|\/)/i.test(target)) {
    return target;
  }

  if (target.startsWith("assets/")) {
    return `/${target}`;
  }

  return `/${target}`;
}

function stripSharedChrome(markup: string) {
  let body = markup;

  body = body.replace(/<header[\s\S]*?<\/header>/i, "");
  body = body.replace(/<footer[\s\S]*?<\/footer>/i, "");
  body = body.replace(/\s*<div class=["']modal fade["'][^>]*id=["']search-modal["'][\s\S]*$/i, "");
  body = body.replace(/^\s*<div class=["']main-wrapper["']>\s*/i, "");
  body = body.replace(/\s*<\/div>\s*$/i, "");

  return body.trim();
}

function applyPathnameOverrides(pathname: string, markup: string) {
  if (pathname === "rent-property-grid-sidebar.html") {
    let next = markup;
    for (const [pattern, replacement] of rentGridReplacements) {
      next = next.replace(pattern, replacement);
    }
    return next;
  }

  return markup;
}

function normalizeTemplateMarkup(html: string, pathname: string) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;

  body = body.replace(
    /<script[^>]*>\s*document\.write\(new Date\(\)\.getFullYear\(\)\)\s*<\/script>/gi,
    String(new Date().getFullYear())
  );

  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  body = stripSharedChrome(body);
  body = applyPathnameOverrides(pathname, body);
  body = body.replace(/Dreams Estate/g, "91bigha.com");
  body = body.replace(/Dream Estate/g, "91bigha.com");
  body = body.replace(/src=(['"])assets\//gi, 'src=$1/assets/');
  body = body.replace(/href=(['"])assets\//gi, 'href=$1/assets/');
  body = body.replace(/(href|action)=(['"])index\.html\2/gi, `$1=$2/$2`);
  body = body.replace(/(href|action)=(['"])buy-details\.html\2/gi, `$1=$2/buy-details$2`);
  body = body.replace(/(href|action)=(['"])rent-details\.html\2/gi, `$1=$2/rent-details$2`);
  body = body.replace(/(href|action)=(['"])about-us\.html\2/gi, `$1=$2/about-us$2`);
  body = body.replace(/(href|action)=(['"])contact-us\.html\2/gi, `$1=$2/contact-us$2`);
  body = body.replace(/(href|action)=(['"])privacy-policy\.html\2/gi, `$1=$2/privacy-policy$2`);
  body = body.replace(/(href|action)=(['"])terms-condition\.html\2/gi, `$1=$2/terms-condition$2`);
  body = body.replace(
    /(href|action)=(['"])buy-property-grid-sidebar\.html\2/gi,
    `$1=$2/buy-property-grid-sidebar$2`
  );
  body = body.replace(
    /(href|action)=(['"])rent-property-grid-sidebar\.html\2/gi,
    `$1=$2/rent-property-grid-sidebar$2`
  );
  body = body.replace(
    /(href|action|src)=(['"])((?!https?:|mailto:|tel:|#|javascript:|\/)[^"']+)\2/gi,
    (_, attr: string, quote: string, target: string) => `${attr}=${quote}${absolutizeTemplatePath(target)}${quote}`
  );

  for (const [pattern, replacement] of globalTemplateReplacements) {
    body = body.replace(pattern, replacement);
  }

  body = body.replace(/\$(\d[\d,]*)/g, "₹$1");
  body = body.replace(/\s*\/\s*Night/gi, " / Month");
  body = body.replace(/Total Amount \(\$\)/g, "Total Amount (INR)");
  body = body.replace(/Down Payment \(\$\)/g, "Down Payment (INR)");

  return body;
}

export async function fetchRemoteTemplate(pathname: string) {
  const snapshotPath = path.join(SNAPSHOT_ROOT, pathname);
  const html = await readFile(snapshotPath, "utf8");
  return normalizeTemplateMarkup(html, pathname);
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const vendorScripts = [
  "/assets/js/jquery-3.7.1.min.js",
  "/assets/js/bootstrap.bundle.min.js",
  "/assets/plugins/select2/js/select2.min.js",
  "/assets/js/moment.min.js",
  "/assets/js/bootstrap-datetimepicker.min.js",
  "/assets/plugins/theia-sticky-sidebar/ResizeSensor.js",
  "/assets/plugins/theia-sticky-sidebar/theia-sticky-sidebar.js",
  "/assets/plugins/slick/slick.js",
  "/assets/plugins/fancybox/jquery.fancybox.min.js",
  "/assets/plugins/simplebar/simplebar.min.js",
  "/assets/js/waypoints.js",
  "/assets/js/jquery.counterup.min.js",
  "/assets/js/aos.js",
  "/assets/js/script.js"
] as const;

type AosApi = {
  init?: (options?: { duration?: number; once?: boolean }) => void;
  refresh?: () => void;
  refreshHard?: () => void;
};

declare global {
  interface Window {
    $?: unknown;
    jQuery?: unknown;
    AOS?: AosApi;
  }
}

function loadScriptSequentially(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-vendor-src="${src}"]`);

    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.vendorSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";

      if (src.includes("jquery-3.7.1.min.js")) {
        window.jQuery = window.jQuery ?? window.$;
        window.$ = window.$ ?? window.jQuery;
      }

      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function applyLightTheme() {
  document.documentElement.setAttribute("data-theme", "light");

  try {
    window.localStorage.setItem("theme", "light");
    window.localStorage.setItem("darkMode", "disabled");
  } catch {}
}

function reinitializeRoutePlugins() {
  const jq = (window.jQuery || window.$) as
    | ((selector: string | Element) => any)
    | undefined;
  const jqAny = jq as any;

  if (!jq) {
    return;
  }

  const initSlick = (selector: string, settings: Record<string, unknown>) => {
    jq(selector).each(function initEach(this: Element) {
      const slider = jq(this);
      const slickAvailable = typeof slider.slick === "function";

      if (!slickAvailable || slider.hasClass("slick-initialized")) {
        return;
      }

      slider.slick(settings);
    });
  };

  const initSelect2 = () => {
    const hasSelect2 = typeof jqAny?.fn?.select2 === "function";
    if (!hasSelect2) {
      return;
    }

    jq(".select").each(function initEach(this: Element) {
      const select = jq(this);

      if (select.hasClass("select2-hidden-accessible")) {
        return;
      }

      select.select2({
        minimumResultsForSearch: -1,
        width: "100%"
      });
    });
  };

  initSelect2();

  initSlick(".service-slider", {
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    loop: true,
    fade: true,
    asNavFor: ".slider-nav-thumbnails"
  });

  initSlick(".slider-nav-thumbnails", {
    slidesToShow: 6,
    slidesToScroll: 1,
    asNavFor: ".service-slider",
    dots: false,
    infinite: true,
    arrows: true,
    centerMode: false,
    focusOnSelect: true,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 5 } },
      { breakpoint: 992, settings: { slidesToShow: 4 } },
      { breakpoint: 768, settings: { slidesToShow: 3 } },
      { breakpoint: 576, settings: { slidesToShow: 2 } },
      { breakpoint: 400, settings: { slidesToShow: 2 } }
    ]
  });

  initSlick(".gallery-slider", {
    dots: false,
    infinite: true,
    speed: 2000,
    slidesToShow: 5,
    slidesToScroll: 1,
    autoplay: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 4, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2, slidesToScroll: 1 }
      }
    ]
  });

  initSlick(".property-slider", {
    dots: false,
    infinite: true,
    speed: 2000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: false,
    arrows: true,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1 }
      }
    ]
  });

  initSlick(".features-slider", {
    dots: false,
    infinite: true,
    speed: 2000,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    arrows: true,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1 }
      }
    ]
  });

  initSlick(".partners-slider", {
    dots: false,
    infinite: true,
    speed: 2000,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 4, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 3, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2, slidesToScroll: 1 }
      }
    ]
  });

  initSlick(".testimonials-slider", {
    dots: false,
    infinite: true,
    speed: 2000,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: false,
    arrows: true,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1 }
      }
    ]
  });

  initSlick(".cities-slider", {
    dots: true,
    infinite: true,
    speed: 2000,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    arrows: false,
    responsive: [
      {
        breakpoint: 1300,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: true }
      },
      {
        breakpoint: 992,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: true }
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1, dots: true }
      }
    ]
  });

  initSlick(".blog-carousel", {
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    prevArrow: jq(".blog-carousel-prev"),
    nextArrow: jq(".blog-carousel-next"),
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2, slidesToScroll: 1, infinite: true, dots: false }
      },
      {
        breakpoint: 600,
        settings: { slidesToShow: 1, slidesToScroll: 1 }
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, slidesToScroll: 1 }
      }
    ]
  });
}

function refreshTemplateUi() {
  document.documentElement.classList.remove("menu-opened");
  document.querySelector(".main-wrapper")?.classList.remove("slide-nav");

  document.querySelectorAll<HTMLElement>(".sidebar-overlay").forEach((overlay, index) => {
    overlay.classList.remove("opened");
    if (index > 0) {
      overlay.remove();
    }
  });

  if (window.AOS) {
    window.AOS.init?.({ duration: 1200, once: true });
    window.AOS.refreshHard?.();
    window.AOS.refresh?.();
  }

  document.querySelectorAll<HTMLElement>("[data-aos]").forEach((element) => {
    element.classList.add("aos-init", "aos-animate");
  });

  reinitializeRoutePlugins();
  window.dispatchEvent(new Event("resize"));
}

export function VendorScripts() {
  const pathname = usePathname();
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      applyLightTheme();

      for (const src of vendorScripts) {
        if (disposed) {
          return;
        }

        await loadScriptSequentially(src);
      }

      if (!disposed) {
        setScriptsReady(true);
      }
    };

    run().catch((error) => {
      console.error("Vendor script load failed", error);
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptsReady) {
      return;
    }

    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        refreshTemplateUi();
      });

      return () => window.cancelAnimationFrame(secondFrame);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, [pathname, scriptsReady]);

  return null;
}

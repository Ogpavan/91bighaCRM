"use client";

import { useMemo, useState } from "react";

type PropertyImageGalleryProps = {
  title: string;
  images: string[];
};

export function PropertyImageGallery({ title, images }: PropertyImageGalleryProps) {
  const normalizedImages = useMemo(() => images.map((image) => String(image || "").trim()).filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage = normalizedImages[activeIndex] || normalizedImages[0];
  if (!activeImage) {
    return null;
  }

  const thumbs = normalizedImages.slice(0, 7);

  return (
    <>
      <div className="property-hero-image mb-3">
        <img src={activeImage} alt={title} className="img-fluid" />
      </div>

      {thumbs.length > 1 ? (
        <div className="row g-2 mb-4">
          {thumbs.map((image, index) => (
            <div key={`${image}-${index}`} className="col-4 col-md-2">
              <button
                type="button"
                className={`property-thumb-button${index === activeIndex ? " property-thumb-button-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View image ${index + 1}`}
              >
                <img src={image} alt={`${title} ${index + 1}`} className="img-fluid property-thumb-image" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}


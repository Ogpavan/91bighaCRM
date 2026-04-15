"use client";

import { useId, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type HomeFaqAccordionsProps = {
  generalFaqs?: FaqItem[];
  buyingFaqs?: FaqItem[];
};

function Accordion({
  title,
  items,
  defaultOpenIndex = 0,
  accordionId
}: {
  title: string;
  items: FaqItem[];
  defaultOpenIndex?: number;
  accordionId: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    items.length ? Math.min(Math.max(defaultOpenIndex, 0), items.length - 1) : null
  );

  return (
    <div>
      <h5 className="mb-4">{title}</h5>
      <div className="accordion accordions-items-seperate faq-accordion m-0" id={accordionId}>
        {items.map((item, index) => {
          const collapseId = `${accordionId}-collapse-${index + 1}`;
          const headerId = `${accordionId}-heading-${index + 1}`;
          const isOpen = openIndex === index;

          return (
            <div key={collapseId} className="accordion-item aos" data-aos="fade-down" data-aos-duration="1000">
              <div className="accordion-header" id={headerId}>
                <button
                  className={`accordion-button${isOpen ? "" : " collapsed"}`}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={collapseId}
                  onClick={() => setOpenIndex((current) => (current === index ? null : index))}
                >
                  {item.question}
                </button>
              </div>
              <div
                id={collapseId}
                className="accordion-collapse"
                aria-labelledby={headerId}
                hidden={!isOpen}
              >
                <div className="accordion-body">
                  <p className="mb-0">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeFaqAccordions({
  generalFaqs = [
    {
      question: "What is real estate?",
      answer:
        "Real estate refers to land and any permanent structures on it, such as homes or buildings."
    },
    {
      question: "What types of properties are included in real estate?",
      answer:
        "Real estate includes residential, commercial, industrial, land, and special-purpose properties."
    },
    {
      question: "What is the role of a real estate agent?",
      answer:
        "A real estate agent assists clients in buying, selling, or renting properties by guiding them through the process."
    }
  ],
  buyingFaqs = [
    {
      question: "How do I start the home-buying process?",
      answer:
        "Start the home-buying process by checking your budget, getting pre approved for a mortgage, and consulting a real estate agent."
    },
    {
      question: "How much down payment do I need?",
      answer:
        "The down payment typically ranges from 3% to 20% of the home's price, depending on the loan type and lender requirements."
    },
    {
      question: "What is a home inspection?",
      answer:
        "A home inspection is a professional evaluation of a property's condition to identify any issues before finalizing the purchase."
    }
  ]
}: HomeFaqAccordionsProps) {
  const uniqueId = useId().replace(/:/g, "");

  return (
    <>
      <Accordion
        title=" General FAQ’s "
        items={generalFaqs}
        accordionId={`faq-accordion-${uniqueId}-general`}
      />
      <div className="mt-4">
        <Accordion
          title=" Buying FAQ’s "
          items={buyingFaqs}
          accordionId={`faq-accordion-${uniqueId}-buying`}
        />
      </div>
    </>
  );
}

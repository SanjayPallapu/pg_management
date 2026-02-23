import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! You get a free trial to explore all features before choosing a plan. No credit card required.",
  },
  {
    q: "Can I manage multiple PG properties?",
    a: "Absolutely. With the Automatic plan, you can manage unlimited PGs from a single dashboard.",
  },
  {
    q: "How do WhatsApp reminders work?",
    a: "You can send rent reminders directly to tenants via WhatsApp with one tap. The Automatic plan supports image-based automated reminders.",
  },
  {
    q: "Is my data safe?",
    a: "100%. Your data is encrypted and stored securely in the cloud. Only you have access to your PG data.",
  },
  {
    q: "Can tenants pay online through the app?",
    a: "The app tracks payments made via UPI, cash, or bank transfer. You record the payment and tenants get digital receipts instantly.",
  },
  {
    q: "Do I need any technical knowledge?",
    a: "Not at all. PG Manager is designed for PG owners — just sign up, add your rooms, and you're ready to go.",
  },
];

const FAQSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-lg text-muted-foreground">
          Got questions? We've got answers.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FAQSection;

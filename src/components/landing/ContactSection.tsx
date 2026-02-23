import { motion } from "framer-motion";
import { MessageCircle, Mail, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const whatsappUrl = "https://wa.me/919390418552?text=Hi%2C%20I%27m%20interested%20in%20PG%20Manager";

const contactMethods = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    subtitle: "Chat with us instantly",
    detail: "Quick responses within minutes",
    href: whatsappUrl,
    external: true,
    buttonLabel: "Start Chat",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    icon: Phone,
    title: "Call Us",
    subtitle: "+91 93904 18552",
    detail: "Available Mon–Sat, 9 AM – 8 PM",
    href: "tel:+919390418552",
    external: false,
    buttonLabel: "Call Now",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Mail,
    title: "Email",
    subtitle: "support@pgmanager.in",
    detail: "We reply within 24 hours",
    href: "mailto:support@pgmanager.in",
    external: false,
    buttonLabel: "Send Email",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
];

const ContactSection = () => (
  <section id="contact" className="py-20 bg-muted/30">
    <div className="container mx-auto px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Get in Touch
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Questions about pricing, features, or setup? We're here to help — reach out anytime.
        </p>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
        {contactMethods.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.45 }}
          >
            <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all group">
              <CardContent className="pt-8 pb-6 flex flex-col items-center text-center gap-4">
                <div className={`h-14 w-14 rounded-2xl ${m.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <m.icon className={`h-7 w-7 ${m.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{m.title}</h3>
                  <p className="text-sm font-medium text-foreground/80 mt-1">{m.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
                </div>
                <a
                  href={m.href}
                  target={m.external ? "_blank" : undefined}
                  rel={m.external ? "noopener noreferrer" : undefined}
                  className="mt-auto w-full"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    {m.buttonLabel} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="text-center mt-10"
      >
        <p className="text-sm text-muted-foreground">
          Or message us on WhatsApp for the fastest response →{" "}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            +91 93904 18552
          </a>
        </p>
      </motion.div>
    </div>
  </section>
);

export default ContactSection;

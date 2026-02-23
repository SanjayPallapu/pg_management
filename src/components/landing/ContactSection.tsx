import { motion } from "framer-motion";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactSection = () => {
  const whatsappUrl = "https://wa.me/919390418552?text=Hi%2C%20I%27m%20interested%20in%20PG%20Manager";

  return (
    <section id="contact" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Have questions? We're here to help you get started with PG Manager.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0 }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-background hover:border-primary/50 transition-all text-center"
          >
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-foreground">WhatsApp</h3>
            <p className="text-sm text-muted-foreground">Chat with us instantly</p>
            <Button variant="outline" size="sm" className="mt-auto border-green-500/50 text-green-500 hover:bg-green-500/10">
              Start Chat
            </Button>
          </motion.a>

          <motion.a
            href="tel:+919390418552"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-background hover:border-primary/50 transition-all text-center"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Call Us</h3>
            <p className="text-sm text-muted-foreground">+91 93904 18552</p>
            <Button variant="outline" size="sm" className="mt-auto">
              Call Now
            </Button>
          </motion.a>

          <motion.a
            href="mailto:support@pgmanager.in"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-background hover:border-primary/50 transition-all text-center"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Email</h3>
            <p className="text-sm text-muted-foreground">support@pgmanager.in</p>
            <Button variant="outline" size="sm" className="mt-auto">
              Send Email
            </Button>
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;

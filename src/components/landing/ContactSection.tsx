import { motion } from "framer-motion";
import { MessageCircle, Mail, Phone, ArrowRight, Clock, Shield, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

const whatsappUrl = "https://wa.me/919390418552?text=Hi%2C%20I%27m%20interested%20in%20PG%20Manager";

const ContactSection = () =>
<section id="contact" className="py-20 bg-muted/30">
    <div className="container mx-auto px-4 max-w-5xl">
      {/* Header */}
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12">

        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Get in Touch
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Have questions? We're here to help you get started.
        </p>
      </motion.div>

      {/* Main CTA - WhatsApp */}
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-8">

        <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group">

          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
              <MessageCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-1">Chat with us on WhatsApp</h3>
              <p className="text-muted-foreground text-sm">
                Get instant support, demo, or pricing info — we typically reply within minutes.
              </p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6">
              <MessageCircle className="h-4 w-4" />
              Start Chat
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </a>
      </motion.div>

      {/* Secondary contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <motion.a
        href="tel:+919390418552"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">

          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Call Us</p>
            <p className="text-sm text-primary font-medium">+91 93904 18552</p>
            <p className="text-xs text-muted-foreground">Mon–Sat, 9 AM – 8 PM</p>
          </div>
        </motion.a>

        <motion.a
        href="mailto:support@pgmanager.in"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">

          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Email Us</p>
            <p className="text-sm text-primary font-medium">sanjaypallapuu@gmail.com</p>
            <p className="text-xs text-muted-foreground">We reply within 24 hours</p>
          </div>
        </motion.a>
      </div>

      {/* Trust badges */}
      <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>Quick Response</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Free Setup Help</span>
        </div>
        <div className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" />
          <span>Dedicated Support</span>
        </div>
      </motion.div>
    </div>
  </section>;


export default ContactSection;
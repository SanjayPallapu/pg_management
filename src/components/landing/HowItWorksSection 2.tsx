import { motion } from "framer-motion";
import { UserPlus, Building2, IndianRupee } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "1",
    title: "Sign Up in 30 Seconds",
    description: "Create your account with just your phone number. No documents, no hassle.",
  },
  {
    icon: Building2,
    step: "2",
    title: "Add Your PG & Rooms",
    description: "Set up your property, floors, rooms, and rent amounts in minutes.",
  },
  {
    icon: IndianRupee,
    step: "3",
    title: "Collect Rent & Relax",
    description: "Track payments, send WhatsApp reminders, and generate receipts automatically.",
  },
];

const HowItWorksSection = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Get Started in 3 Simple Steps
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          No training needed. Set up your PG and start collecting rent in under 5 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
        {/* Connector line (desktop only) */}
        <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="text-center relative"
          >
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 relative z-10 ring-4 ring-background">
              <s.icon className="h-7 w-7 text-primary" />
            </div>
            <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
              Step {s.step}
            </span>
            <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;

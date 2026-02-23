import { motion } from "framer-motion";
import { X, Check, Smartphone, Clock, ShieldCheck } from "lucide-react";

const rows = [
  { feature: "Rent Tracking", without: false, with: true },
  { feature: "Digital Receipts", without: false, with: true },
  { feature: "WhatsApp Reminders", without: false, with: true },
  { feature: "Multi-PG Dashboard", without: false, with: true },
  { feature: "Overdue Alerts", without: false, with: true },
  { feature: "Reports & Analytics", without: false, with: true },
];

const trustItems = [
  { icon: Smartphone, label: "Works on Any Phone" },
  { icon: Clock, label: "24/7 Access" },
  { icon: ShieldCheck, label: "Bank-Grade Security" },
];

const ComparisonSection = () => (
  <section className="py-20 bg-muted/30">
    <div className="container mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Why Switch to PG Manager?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See the difference between managing manually and using PG Manager.
        </p>
      </div>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-xl mx-auto mb-16"
      >
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
            <div className="p-4 text-sm font-semibold text-foreground">Feature</div>
            <div className="p-4 text-sm font-semibold text-center text-muted-foreground">
              Paper / Excel
            </div>
            <div className="p-4 text-sm font-semibold text-center text-primary">
              PG Manager
            </div>
          </div>
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-3 border-b border-border/50 last:border-0"
            >
              <div className="p-4 text-sm text-foreground">{row.feature}</div>
              <div className="p-4 flex justify-center">
                <X className="h-5 w-5 text-destructive/60" />
              </div>
              <div className="p-4 flex justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {trustItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ComparisonSection;

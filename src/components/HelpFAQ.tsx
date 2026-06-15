import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  Building,
  CreditCard,
  Users,
  Receipt,
  Bell,
  Shield,
  Smartphone,
  MessageCircle,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SUPPORT_EMAIL = "support@pgmanagement.app";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    category: "Getting Started",
    question: "How do I add my first PG property?",
    answer: "After signing up, you'll see an onboarding wizard. Enter your PG name, number of rooms, and bed capacity per room. You can also add rooms later from the Rooms tab by tapping 'Add Room'.",
  },
  {
    category: "Getting Started",
    question: "Can I manage multiple PG properties?",
    answer: "Yes! Tap the PG icon in the top-left corner to switch between PGs or add a new one. Each PG has its own rooms, tenants, and financial data completely separated.",
  },
  {
    category: "Getting Started",
    question: "How do I add staff members?",
    answer: "Go to Settings → Staff Management. You can add staff by their email. Staff can collect rent and manage tenants but cannot access billing or delete data.",
  },
  // Rooms & Tenants
  {
    category: "Rooms & Tenants",
    question: "How do I add a new tenant?",
    answer: "Go to Rooms tab → find the room → tap 'Add Tenant'. Enter tenant name, phone number, monthly rent, join date, and due date. The tenant will appear in your rent sheet automatically.",
  },
  {
    category: "Rooms & Tenants",
    question: "How do I mark a tenant as left?",
    answer: "Open the room card → tap on the tenant → select 'Mark as Left'. The app will calculate pro-rata rent and security deposit settlement automatically.",
  },
  {
    category: "Rooms & Tenants",
    question: "What is a Day Guest?",
    answer: "Day guests are short-term visitors who stay for a few hours or days. You can track them separately per room with custom rates. Revenue from day guests shows on your dashboard.",
  },
  {
    category: "Rooms & Tenants",
    question: "Can I shift a tenant to another room?",
    answer: "Yes! Open the tenant details → tap 'Shift Room' → select the new room. The app preserves payment history and adjusts rent from the shift date.",
  },
  // Rent & Payments
  {
    category: "Rent & Payments",
    question: "How do I record a rent payment?",
    answer: "Go to Rent tab → find the tenant → tap 'Record Payment'. Select payment mode (UPI/Cash), enter amount, and save. The status updates to Paid/Partial automatically.",
  },
  {
    category: "Rent & Payments",
    question: "How do I send rent reminders via WhatsApp?",
    answer: "On the Rent tab, tap the WhatsApp icon next to any pending tenant. The app generates a pre-formatted message with tenant name, amount, and due date. You can also send bulk reminders.",
  },
  {
    category: "Rent & Payments",
    question: "What is the difference between Overdue and Pending?",
    answer: "Pending means rent is due but the due date hasn't passed yet. Overdue means the due date has passed and the tenant hasn't paid. The app color-codes them: orange for pending, red for overdue.",
  },
  {
    category: "Rent & Payments",
    question: "How do I generate a rent receipt?",
    answer: "After recording a payment, tap 'Share Receipt'. The app generates a professional receipt with your PG logo, tenant details, and payment info that you can share via WhatsApp or save as an image.",
  },
  // Reports & Analytics
  {
    category: "Reports & Analytics",
    question: "What reports are available?",
    answer: "The Reports tab shows: monthly collection summary, vacant rooms, available beds, pending rent breakdown, payment mode analysis (UPI vs Cash), and tenant movement (joins/leaves).",
  },
  {
    category: "Reports & Analytics",
    question: "Can I export rent data?",
    answer: "Yes! On the Rent tab, tap the download icon to export the monthly rent sheet as an Excel file. It includes tenant names, room numbers, amounts, payment dates, and status.",
  },
  // Billing & Subscription
  {
    category: "Billing & Subscription",
    question: "Is the app free to use?",
    answer: "The basic plan with essential features is available for all users. Premium features like bulk reminders, advanced reports, and multi-PG support require a subscription starting at ₹499/month.",
  },
  {
    category: "Billing & Subscription",
    question: "How do I cancel my subscription?",
    answer: "Email support@pgmanagement.app from your registered email with the subject 'Cancel subscription'. We'll process it before your next billing cycle.",
  },
  // Security
  {
    category: "Security",
    question: "Is my data safe?",
    answer: "Yes! All data is stored securely on Supabase with row-level security. Each owner can only see their own PG data. We use HTTPS encryption for all data in transit.",
  },
  {
    category: "Security",
    question: "Can my staff see financial reports?",
    answer: "Staff members have limited access. They can record payments and manage tenants but cannot view subscription details, export data, or access admin settings.",
  },
];

const CATEGORIES = [
  { name: "All", icon: HelpCircle },
  { name: "Getting Started", icon: Smartphone },
  { name: "Rooms & Tenants", icon: Building },
  { name: "Rent & Payments", icon: CreditCard },
  { name: "Reports & Analytics", icon: Receipt },
  { name: "Billing & Subscription", icon: CreditCard },
  { name: "Security", icon: Shield },
];

interface HelpFAQProps {
  onBack?: () => void;
}

export const HelpFAQ = ({ onBack }: HelpFAQProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesSearch =
      !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedFAQs: Record<string, FAQItem[]> = {};
  filteredFAQs.forEach((faq) => {
    if (!groupedFAQs[faq.category]) groupedFAQs[faq.category] = [];
    groupedFAQs[faq.category].push(faq);
  });

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-lg font-bold">Help & Support</h2>
          <p className="text-xs text-muted-foreground">{FAQ_DATA.length} frequently asked questions</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50 border-0"
        />
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map(({ name, icon: Icon }) => (
          <button
            key={name}
            onClick={() => setSelectedCategory(name)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              selectedCategory === name
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-3 w-3" />
            {name}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      {Object.entries(groupedFAQs).map(([category, faqs]) => (
        <Card key={category} className="overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b">
            <h3 className="text-sm font-semibold text-foreground">{category}</h3>
          </div>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`${category}-${idx}`} className="border-b last:border-0">
                  <AccordionTrigger className="px-4 py-3 text-sm text-left hover:no-underline hover:bg-accent/30 [&[data-state=open]]:bg-accent/20">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {filteredFAQs.length === 0 && (
        <div className="py-12 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No matching questions found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
        </div>
      )}

      {/* Contact Support CTA */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Still need help?</p>
              <p className="text-xs text-muted-foreground">Our support team typically replies within 24 hours</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Help%20Request`, "_blank")}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

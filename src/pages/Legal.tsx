import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const supportEmail = "support@pgmanagement.app";

const sections = [
  {
    id: "privacy",
    title: "Privacy Policy",
    icon: ShieldCheck,
    content: [
      "PG Management collects account details, property details, room and tenant records, payment status, receipts, reminders, and app usage data needed to provide the service.",
      "Data is stored in Supabase and is scoped to the signed-in owner or staff account using database access rules.",
      "We do not sell personal data. We use data only to operate the app, provide support, improve reliability, and meet legal obligations.",
      "Users may request access, correction, export, or deletion of their account data by contacting support.",
    ],
  },
  {
    id: "terms",
    title: "Terms & Conditions",
    icon: FileText,
    content: [
      "The app is provided for PG owners and managers to track rooms, tenants, rent, bills, reminders, receipts, and reports.",
      "Users are responsible for entering accurate tenant, payment, and property information.",
      "The app does not replace legal, accounting, or tax advice. Owners remain responsible for compliance with local laws.",
      "Misuse, unauthorized access, or attempts to access another user's data are not allowed.",
    ],
  },
  {
    id: "refunds",
    title: "Refund & Cancellation Policy",
    icon: FileText,
    content: [
      "Subscription cancellation requests can be sent to support before the next billing cycle.",
      "Refund eligibility depends on payment method, active usage, billing status, and applicable payment provider rules.",
      "Duplicate or accidental payments should be reported with transaction details for review.",
      "Tenant rent or utility payments are real-world PG payments and must be settled directly between the PG owner and tenant.",
    ],
  },
  {
    id: "deletion",
    title: "Account Deletion",
    icon: Trash2,
    content: [
      "To delete your account, email support from your registered email address with the subject: Account deletion request.",
      "We will verify the request and delete or anonymize account, PG, room, tenant, payment, and bill records where legally permitted.",
      "Some records may be retained if required for fraud prevention, tax, dispute, or legal compliance.",
      "Deletion requests are normally processed within 30 days after verification.",
    ],
  },
];

const Legal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Link to="/" className="text-sm font-semibold">PG Management</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Legal & Support</h1>
          <p className="text-sm text-muted-foreground">
            Privacy, terms, refunds, and account deletion information for PG Management.
          </p>
        </div>

        {sections.map(({ id, title, icon: Icon, content }) => (
          <Card key={id} id={id} className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {content.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Support Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Email support for product help, deletion requests, billing questions, and policy requests.</p>
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Legal;

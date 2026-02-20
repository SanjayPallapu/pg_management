# PG Rules & Regulations - Visual Component Layout

## 📊 Component Hierarchy & Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        DASHBOARD                            │
├─────────────────────────────────────────────────────────────┤
│  [Financials] [Tenants] [Tools & Admin] ▼                  │
├─────────────────────────────────────────────────────────────┤
│              TOOLS & ADMIN SECTION (EXPANDED)               │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │   🧮 Calculator  │  │   📊 Key Numbers │  │ 🔒 Lock   │ │
│  │                  │  │                  │  │ Tenants   │ │
│  │ Quick calc tool  │  │  PG statistics   │  │ Exclude   │ │
│  └──────────────────┘  └──────────────────┘  │ from calc │ │
│                                               └───────────┘ │
│  ┌──────────────────┐                                       │
│  │  📖 PG Rules &   │  ← NEW COMPONENT                      │
│  │   Regulations    │                                       │
│  │                  │                                       │
│  │ View and manage  │                                       │
│  │ PG rules [11]    │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎴 PGRulesCard Component

### Card View (Collapsed)
```
┌────────────────────────────┐
│📖 PG Rules & Regulations   │
│  (in Tools & Admin section)│
│                            │
│View and manage PG rules and│
│regulations for residents   │
│            [11]            │ ← Number of rules
└────────────────────────────┘
     ↓ Click to open
```

### Sheet View - Normal Mode
```
╔══════════════════════════════════════════════════════════╗
║ PG Rules & Regulations              [Edit] Button        ║
║ Manage rules for your PG residents                       ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  Rule 1: 🍽️ Meal Timings                                ║
║  ─────────────────────────────────────────────────────   ║
║  Food service timings for the PG residents              ║
║  • Breakfast (Tiffin): 7:30 AM – 9:00 AM               ║
║  • Lunch: 12:30 PM – 2:00 PM                           ║
║  • Dinner: 7:30 PM – 9:00 PM                           ║
║  • Note: If food gets over...                          ║
║                                                           ║
║  Rule 2: 🚪 Night Gate Timing                           ║
║  ─────────────────────────────────────────────────────   ║
║  Main gate closure timing                                ║
║  • The main gate will be closed at 10:00 PM.           ║
║                                                           ║
║  [... More rules ...]                                   ║
║                                                           ║
╠══════════════════════════════════════════════════════════╣
║                 [View Template] Button                    ║
╚══════════════════════════════════════════════════════════╝
```

### Sheet View - Edit Mode
```
╔══════════════════════════════════════════════════════════╗
║ PG Rules & Regulations              [Done] Button        ║
║ Manage rules for your PG residents                       ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  [Rule Card - Editable] (Highlighted in edit mode)      ║
║  ╔─────────────────────────────────────────────────╗    ║
║  ║ Rule Title: [_________________________] ✏️      ║    ║
║  ║ Description: [_________________________] 🗑️     ║    ║
║  ║                                                  ║    ║
║  ║ Details:                         [+ Add]        ║    ║
║  ║ • [__________________________________________] ✕ ║    ║
║  ║ • [__________________________________________] ✕ ║    ║
║  ║ • [__________________________________________] ✕ ║    ║
║  ║                                                  ║    ║
║  ║      [Save Rule]  [Cancel]                      ║    ║
║  ╚─────────────────────────────────────────────────╝    ║
║                                                           ║
║  [Other Rules with Edit/Delete Icons]                   ║
║                                                           ║
║  [+ Add New Rule] Button                                ║
║                                                           ║
╚══════════════════════════════════════════════════════════╝
```

## 📄 RulesTemplate Component (Printable)

### Template Preview in Sheet
```
╔══════════════════════════════════════════════════════════╗
║ PG Rules & Regulations Template     [Print] [Download]   ║
║ Printable template for residents                         ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║                    ┌─────────────┐                       ║
║                    │   PG LOGO   │ ← Shows at top middle ║
║                    └─────────────┘                       ║
║                                                           ║
║              PG RULES & REGULATIONS                      ║
║     Please read and abide by these rules for a           ║
║           harmonious community living                    ║
║                      ═════════════════                   ║
║                                                           ║
║  🍽️  MEAL TIMINGS                                       ║
║  ──────────────────────────────────────────             ║
║  • Breakfast (Tiffin): 7:30 AM – 9:00 AM               ║
║  • Lunch: 12:30 PM – 2:00 PM                           ║
║  • Dinner: 7:30 PM – 9:00 PM                           ║
║  • Note: If food gets over...                          ║
║                                                           ║
║  🚪  NIGHT GATE TIMING                                  ║
║  ──────────────────────────────────────────             ║
║  • The main gate will be closed at 10:00 PM.           ║
║                                                           ║
║  💡  CORRIDOR LIGHTS                                    ║
║  ──────────────────────────────────────────             ║
║  • Corridor lights will be switched off at 10:00 PM.   ║
║                                                           ║
║  [... More Rules ...]                                   ║
║                                                           ║
║                    Thank you for your                    ║
║                    cooperation!                         ║
║          In case of any queries or concerns,            ║
║        please contact the management                    ║
║                ═════════════════════════                ║
║                                                           ║
╚══════════════════════════════════════════════════════════╝
```

## 🎨 Color Scheme

### PGRulesCard
- **Icon**: BookOpen (primary color)
- **Badge**: Blue background with primary text
- **Hover**: Light accent background

### RulesTemplate
```
Header:
├── Logo Image (centered)
├── Title: Text in #1e40af (dark blue)
├── Border: 3px solid #2563eb (blue)
└── Subtitle: #666666 (gray)

Rules Section:
├── Rule Title: #1e40af (dark blue, bold)
├── Emoji Icon: 20px size
├── Details: Black text with bullets
└── Line-height: 1.8 (good readability)

Footer:
├── Border-top: 2px solid #e5e7eb
├── Text: #666666 (gray, small)
└── Style: Center-aligned
```

## 📱 Responsive Breakpoints

### Mobile (< 768px)
```
┌─────────────────────┐
│  📖 Rules & Regs    │ (Full width in grid)
│  Single column      │
│  for all tools      │
└─────────────────────┘

Sheet:
- Full screen width
- Scrollable content
- Buttons stack vertically
```

### Tablet (768px - 1024px)
```
┌──────────────────┐  ┌──────────────────┐
│  🧮 Calculator   │  │ 📖 Rules & Regs  │
└──────────────────┘  └──────────────────┘

┌──────────────────┐
│  📊 Key Numbers  │
└──────────────────┘
```

### Desktop (> 1024px)
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  🧮 Calculator   │  │  📊 Key Numbers  │  │ 🔒 Lock Tenants  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐
│ 📖 Rules & Regs  │
└──────────────────┘
```

## 🔄 User Flow Diagram

### Resident View Flow
```
Dashboard
    ↓
Tools & Admin Section
    ↓
Click on PG Rules Card
    ↓
View Rules Sheet (Normal Mode)
    ├─→ Read rules
    ├─→ Scroll through all rules
    └─→ Click "View Template"
        ↓
        Template Sheet Opens
        ├─→ [Print] → Browser Print Dialog
        └─→ [Download] → Save HTML File
```

### Admin Edit Flow
```
Dashboard
    ↓
Tools & Admin Section
    ↓
Click on PG Rules Card
    ↓
View Rules Sheet
    ↓
Click [Edit] Button
    ↓
Enter Edit Mode
    ├─→ Click ✏️ on rule → Edit Form
    │   ├─→ Update Title/Description
    │   ├─→ Add/Edit/Remove Details
    │   └─→ [Save Rule]
    │
    ├─→ Click 🗑️ on rule → Delete Confirmation
    │   └─→ [Delete]
    │
    └─→ Click [+ Add New Rule]
        ├─→ Fill in Title/Description/Details
        └─→ [Save Rule]
    
    ↓
Click [Done] to Save & Exit
```

## ⚡ Interaction States

### PGRulesCard States
```
Normal: ┌──────────────────┐
        │  📖 Rules & Regs │
        │  View and manage │
        └──────────────────┘

Hover:  ┌──────────────────┐ (background tint)
        │  📖 Rules & Regs │
        │  View and manage │
        └──────────────────┘

Click:  → Opens Rules Sheet
```

### Edit Mode UI Elements
```
Edit Button: [✏️ Edit]
├─ Normal → Hidden
└─ Edit Mode → Shows as [✏️ Done]

Delete Icon: [🗑️]
├─ Normal → Hidden
└─ Edit Mode → Visible for each rule

Save/Cancel: [Save Rule] [Cancel]
├─ Normal → Hidden
└─ Edit Mode → Visible when editing
```

## 📊 Component Statistics

### Total Rules: 11
```
1. 🍽️  Meal Timings (4 details)
2. 🚪 Night Gate Timing (1 detail)
3. 💡 Corridor Lights (1 detail)
4. 🧹 Room Cleaning (1 detail)
5. 👥 Visitors Policy (2 details)
6. 🔔 Noise & Behavior (3 details)
7. 💰 Rent Policy (1 detail)
8. 📅 Notice Period (1 detail)
9. 🔒 Security Deposit (1 detail)
10. 🧳 Luggage Charges (1 detail)
11. 🆘 Issues & Support (2 details)
```

Total Details: 21 detail items across all rules

## 🎯 Key Features Visual Summary

```
┌─────────────────────────────────────────────┐
│       PG RULES & REGULATIONS SYSTEM         │
├─────────────────────────────────────────────┤
│                                             │
│  ✅ View Mode (for residents)              │
│  ├─ Read organized rules                   │
│  ├─ Professional formatting                │
│  └─ Easy to understand                     │
│                                             │
│  ✅ Edit Mode (for admins)                 │
│  ├─ Add/Edit/Delete rules                  │
│  ├─ Manage rule details                    │
│  └─ Toast notifications                    │
│                                             │
│  ✅ Template/Print Mode                    │
│  ├─ Professional printable layout          │
│  ├─ PG logo at top center                  │
│  ├─ Print directly                         │
│  └─ Download as HTML                       │
│                                             │
│  ✅ Mobile Responsive                      │
│  ├─ Works on all devices                   │
│  ├─ Touch-friendly                         │
│  └─ Proper spacing                         │
│                                             │
│  ✅ User Feedback                          │
│  ├─ Toast notifications                    │
│  ├─ Alert dialogs                          │
│  └─ Confirmation dialogs                   │
│                                             │
└─────────────────────────────────────────────┘
```

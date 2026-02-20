# PG Rules & Regulations - Usage Guide

## 🎯 Quick Start

### For Residents - Viewing Rules
1. Open the Dashboard
2. Scroll to the **"Tools & Admin"** section at the bottom
3. Click on the **"PG Rules & Regulations"** card (with BookOpen icon)
4. A sheet will open showing all rules organized by category
5. Click **"View Template"** to see a printable, professional version
6. From the template, you can:
   - **Print** - Press the Print button to print directly
   - **Download** - Save the HTML file to your computer

### For Administrators - Managing Rules

#### Viewing All Rules
1. Navigate to **Tools & Admin** section
2. Click **PG Rules & Regulations** card
3. All current rules are displayed with their descriptions and details

#### Editing Rules
1. In the rules sheet, click the **"Edit"** button (top right)
2. You can now:
   - **Edit a rule**: Click the pencil icon next to any rule
   - **Delete a rule**: Click the trash icon next to any rule
   - **Add new rule**: Click "Add New Rule" button at the bottom
3. When editing a rule:
   - Update the Title
   - Update the Description
   - Add/edit/remove Details using the "+ Add" button
   - Click "Save Rule" to save changes
4. Click **"Done"** to exit edit mode

#### Adding a New Rule
1. Enter Edit mode
2. Click "Add New Rule"
3. Fill in:
   - Rule Title (e.g., "WiFi Policy")
   - Description (brief summary)
   - At least one Detail
4. Click "+ Add" to add more details if needed
5. Click "Save Rule"

#### Deleting a Rule
1. Enter Edit mode
2. Find the rule you want to delete
3. Click the trash/delete icon
4. Confirm deletion in the dialog
5. Click "Done" to save

---

## 📋 Current Rules Included

### 1. 🍽️ Meal Timings
- **Breakfast (Tiffin)**: 7:30 AM – 9:00 AM
- **Lunch**: 12:30 PM – 2:00 PM
- **Dinner**: 7:30 PM – 9:00 PM
- Extra food available if requested during timings

### 2. 🚪 Night Gate Timing
- Main gate closes at **10:00 PM**

### 3. 💡 Corridor Lights
- Switched off at **10:00 PM**

### 4. 🧹 Room Cleaning
- Rooms cleaned **once a week**

### 5. 👥 Visitors Policy
- **No outsiders** allowed in rooms
- **₹1000 fine** for bringing guests without permission

### 6. 🔔 Noise & Behavior
- No loud noise permitted
- Respect others' privacy
- Don't disturb fellow residents

### 7. 💰 Rent Policy
- **Full rent** must be paid regardless of stay duration

### 8. 📅 Notice Period
- **15-30 days notice** required before leaving

### 9. 🔒 Security Deposit
- **Refundable** upon vacating (subject to deductions)

### 10. 🧳 Luggage Charges
- Extra storage: **₹150 per day**

### 11. 🆘 Issues & Support
- Report issues to management
- We will resolve ASAP

---

## 🖨️ Printing & Sharing

### How to Print the Rules
1. Click on **PG Rules & Regulations** card
2. Click **"View Template"** button
3. Click **"Print"** button in the template sheet
4. Browser print dialog will open
5. Select printer and click "Print"

### How to Download Rules
1. Click on **PG Rules & Regulations** card
2. Click **"View Template"** button
3. Click **"Download HTML"** button
4. File will download as `PG_Rules_Regulations.html`
5. You can email this file to residents or save it

### Template Features
✅ Professional layout with PG logo
✅ Organized sections with icons
✅ Mobile & print-friendly
✅ Easy to read and understand
✅ Can be printed or saved as HTML

---

## ⚙️ Technical Details

### Files Created/Modified
- **New Files**:
  - `/src/components/PGRulesCard.tsx` - Main card component
  - `/src/components/RulesTemplate.tsx` - Printable template
  - `/RULES_IMPLEMENTATION.md` - Implementation documentation

- **Modified Files**:
  - `/src/components/Dashboard.tsx` - Integrated rules components

### Component Structure
```
Dashboard
├── Tools & Admin Section
│   └── PGRulesCard
│       ├── Rules Management Sheet
│       │   ├── View Mode (show all rules)
│       │   └── Edit Mode
│       │       ├── Add Rule
│       │       ├── Edit Rule
│       │       └── Delete Rule
│       └── "View Template" button
│           └── RulesTemplate
│               ├── Print option
│               └── Download option
```

### State Management
- Rules stored in component state
- Can be connected to Supabase for persistence
- Toast notifications for user feedback
- Alert dialogs for confirmations

---

## 🎨 Customization

### How to Modify Rules
1. Go to Dashboard → Tools & Admin
2. Click PG Rules & Regulations
3. Click Edit
4. Make your changes
5. Click Done

### How to Add Your PG Logo
1. The template automatically uses `/src/assets/pg-logo.png`
2. Replace or update this file with your logo
3. The template will display it automatically

### How to Change Colors
- Currently uses blue color scheme
- To modify, edit the `RulesTemplate.tsx` file
- Search for color classes like `text-blue-700` or `bg-blue-600`

---

## 📱 Responsive Design
- ✅ Works on mobile devices
- ✅ Tablet-friendly layout
- ✅ Desktop optimized
- ✅ Print-friendly CSS

---

## 🔐 Permissions
- All residents can **view** the rules
- Only **administrators** can **edit** the rules
- Click to view, Edit button only for admins

---

## 💡 Tips
1. **Keep rules updated** - Review monthly and update as needed
2. **Print for new residents** - Provide printed copy at check-in
3. **Share the template** - Email HTML file to all residents
4. **Use simple language** - Keep rules clear and easy to understand
5. **Add specific rules** - Customize rules based on your PG's needs

---

## ❓ Troubleshooting

### Logo not appearing?
- Check if `/src/assets/pg-logo.png` exists
- The template gracefully handles missing logos
- Template will still display correctly

### Rules not saving?
- Rules are saved in component state
- For persistence, connect to Supabase database
- Currently, refresh will reset rules to defaults

### Print not working?
- Make sure pop-ups are allowed in browser
- Try different print settings
- Download HTML as backup option

---

## 🚀 Future Features (Optional)
- Database persistence for rules
- Multi-language support
- Email delivery to residents
- Digital acknowledgment/signature
- Version history
- Per-floor specific rules
- PDF export

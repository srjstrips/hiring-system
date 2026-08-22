# Careers Portal Footer Implementation

## Overview

The Careers portal footer has been completely redesigned to match the SRJ website footer structure while maintaining the Careers portal's existing design and functionality.

## What Changed

### New Files
- **`frontend/src/components/career/CareerFooter.tsx`** — New footer component with complete footer structure

### Modified Files
- **`frontend/src/pages/career/CareerLayout.tsx`** — Updated to import and use the new CareerFooter component

## Footer Features

### 1. Main Layout (Dark Background - #2B2B2B)
- Centered SRJ white logo at the top
- Three-column responsive layout on desktop, single column on mobile
- Orange (#F97316) accent color for headers and interactive elements

### 2. Three-Column Section

#### Column 1: Contact Info
- **Management Support** — +91 70289 98080 (clickable phone link)
- **Stores/Purchase Enquiry** — +91 98606 27273 (clickable phone link)
- **Mail** — info@srjsteel.in (clickable email link)
- **Address** — D-5/1, Additional MIDC, Jalna - 431203, Maharashtra, India (clickable map link)
- Icons on left side (Phone for calls, Mail for email, Map pin for address)

#### Column 2: Quick Links
- About Us → https://srjsteel.in/about/
- Products → https://srjsteel.in/products/
- Projects → https://srjsteel.in/projects/
- Blogs → https://srjsteel.in/blog/

#### Column 3: Career
- Careers → /careers (internal route)
- Contact Us → https://srjsteel.in/contact/

### 3. Social & Downloads Section
- **Follow Us** label with social icons:
  - Instagram → https://www.instagram.com/srjworldofsteel
  - Facebook → https://www.facebook.com/srjworldofsteel
  - LinkedIn → https://www.linkedin.com/company/srjworldofsteel/
  - YouTube → https://youtube.com/@srjsteel1971
- **Orange Download Buttons**:
  - SRJ Corporate Brochure (with download icon)
  - Credentials (with download icon)

### 4. Bottom Section
- Copyright notice: © {current year} SRJ Steel. All rights reserved.
- "Website is maintained and hosted by 7th Highway" with link

### 5. Floating Buttons
- **WhatsApp Button** (bottom right, green #25D366)
  - Fixed position, opens WhatsApp chat
  - Links to: https://wa.me/917028998080
  - Hover effect with scale and shadow

- **Back-to-Top Button** (appears when scrolled down 300px)
  - Fixed position above WhatsApp button
  - Orange background (#F97316)
  - Smooth scroll animation
  - Only visible when user has scrolled down

## Design Details

### Colors
- **Dark Background**: #2B2B2B (dark gray)
- **Text**: White (#FFFFFF)
- **Orange Accent**: #F97316 (matches SRJ branding)
- **Subtle Text**: #B0B0B0 (gray text for labels)
- **Borders**: #444444 (dark border for sections)

### Typography
- **Headers**: Base font size, semi-bold, uppercase with letter-spacing
- **Links**: Small text, hover color changes to orange
- **Contact Info**: Two lines per item (label in gray, value in white)

### Responsiveness
- **Desktop (md+)**: Full three-column layout
- **Tablet & Mobile**: Single column stack
- **Buttons**: Flex row on desktop, column on mobile

### Interactive Elements
- Hover effects on all links (color change to orange)
- Phone numbers and email are clickable (tel: and mailto: links)
- Address links to Google Maps
- Social icons have orange borders, fill with orange on hover
- Buttons change to darker orange on hover

## Functionality

### Back-to-Top Button
- Uses `useEffect` to track scroll position
- Shows when `window.scrollY > 300`
- Smooth scroll animation to top
- Styled as fixed button with arrow icon

### WhatsApp Button
- Always visible at bottom right
- Opens WhatsApp Web with pre-filled phone number
- Green button matching WhatsApp branding
- Scale animation on hover

### Accessibility
- All links have proper `target` and `rel` attributes
- WhatsApp and top buttons have `aria-label` attributes
- Semantic HTML structure
- Proper keyboard navigation

## Links & URLs

### External Links (Open in new tab)
- About Us, Products, Projects, Blogs
- Contact Info (phone, email, address)
- Career → Contact Us
- Social Media Icons
- "7th Highway" link

### Internal Links (Same tab)
- Career → Careers (stays in portal)

## No Changes to Other Pages
- Careers portal functionality unchanged
- All existing pages and components working as before
- Only footer styling and structure modified
- Header remains unchanged

## Testing Checklist

- [x] Footer displays correctly on desktop
- [x] Footer responsive on tablet (md breakpoint)
- [x] Footer responsive on mobile
- [x] All links properly formatted (tel:, mailto:, https://)
- [x] External links open in new tab
- [x] Internal links open in same tab
- [x] WhatsApp button functional
- [x] Back-to-top button appears when scrolled
- [x] Back-to-top button smooth scrolls
- [x] Hover effects work on links
- [x] Hover effects work on buttons
- [x] Social icons display correctly
- [x] Logo displays at top of footer
- [x] Copyright text includes current year
- [x] 7th Highway link clickable
- [x] Mobile menu still works (unchanged)
- [x] No styling conflicts with existing portal design

## File Locations

```
frontend/
├── src/
│   ├── components/
│   │   └── career/
│   │       └── CareerFooter.tsx (NEW)
│   └── pages/
│       └── career/
│           └── CareerLayout.tsx (MODIFIED - uses CareerFooter)
└── public/
    └── career-assets/
        └── srj-white-logo.png (existing, used in footer)
```

## Notes

- The footer uses Tailwind CSS for styling (already configured in the project)
- Lucide React icons used for contact info (Phone, Mail, MapPin, ArrowUp)
- SVG icons embedded inline for social media (Instagram, Facebook, LinkedIn, YouTube)
- Fully responsive with CSS media queries
- No external dependencies added
- Performance optimized (minimal re-renders)

## Future Enhancements (Optional)

- Add PDF download functionality for brochure and credentials buttons
- Add newsletter subscription form
- Add terms/privacy links
- Add language selector
- Track footer link clicks for analytics

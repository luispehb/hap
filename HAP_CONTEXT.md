# Hap — Product Context

## What is Hap
A curated community for travelers and locals who share a growth mindset.
Filtered by how you think, not what you do. No dating. Plan-first, ephemeral.
Tagline: "Good things happen."

## Design System
Colors:
- sky: #4A90D9 (primary CTAs, active states, affinity bar)
- ink: #1A1A1A (headlines, dark surfaces, primary buttons)
- cream: #FAFAF7 (app background)
- sand: #EAE6DF (secondary surfaces, inactive chips)
- border: #E8E4DC (all borders)
- muted: #B0AA9E (secondary text)
- sunset: #E07A30 (trip cards, warm accents)
- success: #27AE60 (verified dot, confirmed states)

Typography (Inter):
- Headlines: font-weight 800, letter-spacing -0.05em
- Labels: font-weight 700, uppercase, letter-spacing 0.06em
- Body: font-weight 400, line-height 1.65
- Secondary text: color muted (#B0AA9E)

Components:
- Cards: bg white, border 1px #E8E4DC, border-radius 20px
- Photo strips: 130px profile cards, 160px plan detail, 180px full profile
  Always with dark gradient overy for text legibility
- Buttons primary: bg ink (#1A1A1A), color white, radius 12px, weight 700
- Buttons CTA: bg sky (#4A90D9), color white, radius 12px, weight 700
- Chips inactive: bg sand (#EAE6DF), color muted, radius 20px
- Chips active: bg ink (#1A1A1A), color white
- Trust Score badge: bg #F0FFD0, color #3a6010, weight 800
- Intent block: bg #111111, radius 12px, text #4A90D9, weight 700
- Bottom nav: 4 items, border-top 1px #EAE6DF, active color sky

## Database Tables
profiles, plans, plan_participants, connections, messages, ratings,
admissions, invitations

## Key Business Logic
- Trust Score: starts at 50, max 100
- Feed ranking: interest_overlap(35%) + time_window(25%) + trust(20%) 
  + has_plan(12%) + recency(8%)
- Free tier: 2 plan joins/week, 1 plan create/week
- Hap+: $8/month, unlimited everything
- Hap Day: every Thursday, plans expire in 6h, +5 trust bonus
- Double opt-in: both rate 4+ → prompt to connect → mutual yes = share socials

## Screens
1. Splash
2. Onboarding (4 steps: idey, interests, admission question, location)
3. Home Feed (People tab + Plans tab)
4. Create Plan
5. Plan Detail
6. Profile
7. Chat (realtime, per plan)
8. Post-Plan Rating
9. Hap Journal

## Admission Question
"When was the last time something — a book, a trip, a conversation — 
genuinely changed the way you see something?"
Max 280 chars. This appears at the top of every profile.

## Interests (predefined list)
architecture, gastronomy, nature, music, literature, photography,
philosophy, sport, art, technology, languages, cinema

## Social Links (optional, revealed on mutual connection)
instagram, linkedin, whatsapp, telegram, website, substack, spotify

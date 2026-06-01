# دروب (Droob) — Monetization Architecture 🇯🇴

## Strategy: Dual Revenue (Ads + Subscription)

Based on Jordan market analysis. All amounts in JOD.

---

## Tier 1: Free (إعلانات)

**Target:** 90% of users  
**Revenue:** ~0.50-1.50 JOD per 1000 ad views (Jordan CPM rates)

### Ad Placement Slots:

| Slot | Location | Type | Frequency |
|------|----------|------|-----------|
| A1 | Bottom of HomeScreen bottom sheet | Native Banner (320×50) | Persistent |
| A2 | TripPlanner results — after 3rd result | Native Card | Every 3 journeys |
| A3 | Departures board — after 10th row | Native Banner | Scroll-based |

**Implementation:** Use Google AdMob (`expo-ads-admob`) with Jordan-specific ad units.

---

## Tier 2: دروب بريميوم (Subscription)

**Target:** 10% of users (frequent commuters)  
**Price:** 1.99 JOD/month or 19.99 JOD/year

### Premium Features:
- ✅ No ads
- ✅ Unlimited saved routes/stops
- ✅ Offline maps download (entire governorate)
- ✅ Priority customer support
- ✅ Trip history export
- ✅ Custom alerts (delay threshold, route changes)
- ✅ Dark mode scheduling

### Implementation:
- Use RevenueCat for subscription management (handles Google Play + App Store)
- Store premium status in user profile (JWT claim)

---

## Future: Tickets + Commission

### E-Tickets (Phase 2):
- Sell bus tickets inside the app
- QR code validation at boarding
- Commission: 5% per ticket (negotiated with operators)
- Example: 0.50 JOD ticket × 5% = 0.025 JOD per ride
- If 10,000 daily riders use Droob: 250 JOD/day × 30 = 7,500 JOD/month

### Partnerships (Phase 3):
- Sponsored stops/routes (operator pays for visibility)
- White-label solution for transport agencies
- Data insights sold to municipalities

---

## Implementation Roadmap:

| Phase | Feature | Timeline |
|-------|---------|----------|
| 1 | AdMob integration + basic ads | Month 1 post-launch |
| 2 | RevenueCat + Premium subscription | Month 2 |
| 3 | E-tickets with QR codes | Month 4+ |

---

## Technical Architecture:

```
App (React Native)
├── AdMob SDK → Google Ad Manager
├── RevenueCat SDK → App Store / Google Play billing
├── Ticket QR → Backend validation API
└── User premium status → JWT claims → Feature gating
```

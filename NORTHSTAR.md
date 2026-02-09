# 🌟 NORTHSTAR — Mlem Garden

*Last updated: 2026-02-09 by Shober (CTO)*

## Vision

**Mlem Garden is the cutest collectible pet game on the internet.** Users create, breed, trade, and hang out with their Shobers — adorable dog creatures with DNA-driven traits, rarity tiers, and real-time social interactions. Think Tamagotchi meets CryptoKitties meets a cozy MMO garden.

The magic is in the **social loop**: you don't just collect — you *visit*, you *pet*, you *hang out*. The garden is a shared space where every Shober is alive, moving, interacting. It's not a portfolio — it's a *place*.

## Current State

**Stack:** SvelteKit 5 + Cloudflare (Workers, D1, KV, Durable Objects)
**Auth:** Google OAuth → KV sessions
**Real-time:** Durable Objects WebSocket (GardenRoom) for live garden
**Economy:** Mlem Coins (in-app currency), marketplace listings, breeding fees

### What exists and works:
- ✅ Shober creation with visual customization (SVG rendering)
- ✅ DNA/genetics system (24-hex encoding, rarity tiers: common → legendary)
- ✅ Breeding mechanics (gene mixing, mutations, cooldowns, generation tracking)
- ✅ Real-time garden with WASD movement, petting, gifting, baby spawning
- ✅ Marketplace (list/buy shobers with Mlem Coins)
- ✅ Wallet system with transaction history
- ✅ Ownership provenance tracking (mint/breed/sale/gift)
- ✅ CI pipeline (GitHub Actions: lint, test, e2e)
- ✅ Portfolio page (view your collection)

### What's rough or missing:
- ❌ No onboarding flow — users land on a blank garden if they haven't created a shober
- ❌ No notifications (breeding requests, sales, garden visitors)
- ❌ No mobile experience (WASD movement = desktop only)
- ❌ Marketplace has no social proof (no "trending", no activity feed)
- ❌ No retention mechanics beyond breeding cooldowns
- ❌ Shober personality/behavior is static (mood field exists but does nothing meaningful)
- ❌ No chat in the garden (ChatBox component exists but unclear integration)
- ❌ Gen 0 DNA placeholder ('000...') never gets retroactively generated

## Top 3 Priorities

### 1. 🎮 Mobile-First Garden Experience
The garden *is* the product. If it doesn't work on phones, we lose 70%+ of potential users. Replace WASD with tap-to-move and drag interactions. Add touch gestures for petting. The garden should feel like a living screen saver you can interact with.

### 2. 🔄 The Daily Loop
Right now there's no reason to come back daily. We need:
- **Daily login bonus** (Mlem Coins, scaling streak)
- **Mood decay** — Shobers get sad if you don't visit. Petting resets mood. Mood affects breeding success rate.
- **Garden events** — Seasonal themes, limited-time traits, community goals
- **Activity feed** — "X bred a legendary Shober!", "Y just listed a Galaxy Shober for 500 coins"

### 3. 🧬 Make Genetics *Mean Something*
The DNA system is well-built but players can't *feel* it yet. We need:
- **Trait discovery** — Players shouldn't see all possible traits upfront. Let them discover through breeding.
- **Breeding preview** — Show possible trait outcomes before committing
- **Lineage tree visualization** — Show family trees. People love genealogy, even for dogs.
- **Trait synergies** — Certain trait combos unlock special animations or titles

## Key Metrics (to track)

| Metric | Why It Matters |
|--------|---------------|
| DAU / MAU | Core engagement health |
| Shobers bred per day | Economy velocity |
| Marketplace transactions/day | Trading loop working? |
| Avg session length | Is the garden sticky? |
| D1/D7/D30 retention | Are people coming back? |
| % users with >1 shober | Collection depth |

## Architecture Direction

- **Stay on Cloudflare edge.** D1 + Durable Objects is the right call. Low latency, scales globally, cheap.
- **Durable Objects for garden rooms** — Consider sharding gardens by region/interest (e.g., "Breeding Garden", "Chill Zone") once we hit >50 concurrent users per room.
- **No blockchain. Not yet.** The ownership_history table + transaction_hash field is our hedge. If NFTs make sense later, we have provenance data ready. But adding blockchain now would kill velocity for zero user benefit.
- **SVG rendering is great** — Keep Shobers as SVG. It's lightweight, scalable, and lets us add animations easily. Consider adding CSS animations for mutations (sparkle, glow, rainbow shimmer).
- **Future: WebGL garden** — If the flat garden feels limiting, consider a 2.5D isometric view with PixiJS. But not before mobile works.

## Anti-Goals

- 🚫 **No pay-to-win.** Mlem Coins are earned, not bought (for now). If we add IAP, it's cosmetic-only.
- 🚫 **No AI-generated Shobers.** Every Shober comes from the DNA system. The constraint *is* the charm.
- 🚫 **No social graph complexity.** No followers, no DMs, no profiles. The garden IS the social layer. You interact through your Shober, not through a profile page.
- 🚫 **No feature bloat.** The core loop is: Create → Breed → Trade → Hang Out. Every feature must serve one of these.
- 🚫 **No premature scaling.** We don't need microservices, we don't need Kubernetes. Cloudflare edge handles it.

---

*This document drives issue creation via the PM. If you disagree with a priority, challenge it — but bring data or a better hypothesis.*

# Chapter 1 implementation checklist

A checked item is confirmed live. Partial and awaiting playtest are called out explicitly.

## Story and investigation

- [x] Prologue, woman on the bank, and first ranger conversation.
- [x] Rescue reconstruction: compare both stations, use a wagon, creek, or grapple approach, then recover the cut line. Verified in production source.
- [ ] Playtest all three approaches and their prompts from start to finish.
- [x] Spillway: grapple the boom into its catch, balance the gates, and recover from a flooded ford by correcting the gate settings. Verified in production source.
- [ ] Playtest boom aiming, flooded ford, bank detour, and recovery end to end.
- [x] Search the intake and recover Cal’s jacket and dispatch cassette.
- [x] Lookout minigame: play two tracks and align siren and winch cues. Audio on phone still needs testing.
- [x] Broadcast or share privately: ending choice persists and changes the post office radio response. Production source verified.
- [ ] Playtest and tune the first 30 minutes.

## Backpack

- [x] Field Bag organizes Gear, Evidence, Cargo, and Keepsakes into separate sections. Verified in production source.
- [x] Earned spare pulley can be rigged at the spillway to secure the boom and speed flood drainage. Save restoration and production source verified.
- [x] Quick slots and world tools: flashlight, receiver batteries, and field camera. Production files verified.
- [ ] Playtest receiver fitting and field camera capture in the live game on desktop and mobile.
- [x] Evidence: compare Cal’s letter and dispatch tape at the lookout and log the discrepancy without consuming either original. Production source verified.
- [x] Postmaster discusses the timestamp in the dispatch ledger after the discrepancy is logged. Production source verified.
- [ ] Playtest both evidence comparison paths and add conversations with other villagers.
- [ ] Cargo: one-slot mail packing is live. Add bulky hand and wagon cargo and job-specific packing choices.

## Villagers

- [ ] Playtest walking routes, activity stops, and work conversations for all villagers.
- [x] Post office: sort outbound mail by address, pack the correct item, and close the route at the dispatch ledger after both deliveries. Production source verified.
- [x] Postmaster walks between sorting, satchel loading, and creek advisory stops. The camp parcel diverts to an emergency drop while the ford is flooded. Production source verified.
- [ ] Playtest postmaster interactions and both camp parcel destinations in-game.
- [x] Ranger camp rounds: stops at the fire, rescue gear, and Cal’s marker. Dialogue reflects the current stop. Production deploy verified.
- [x] Ranger: visible gear repair with a handheld wrench. Verified in production source.
- [x] Ranger: distinct inspection animation at Cal’s marker on the rescue route. Production source verified.
- [x] Projectionist carries a reel to movie night, sets up the lamp, and discusses the restored reel. Production source verified.
- [x] Sheriff patrols town and heads to the lookout after tape alignment. Confrontation dialogue reflects the ending choice. Logic and production source verified.
- [x] Post office radio reacts to the flooded ford, reopening, and each ending choice. Production source verified.
- [x] Ranger reacts in person to ford flooding, drainage, and both ending choices. Production source verified.
- [ ] Playtest radio and ranger prompts. Add reactions for other villagers.

## Side quests

- [x] Last Delivery: the neighbor’s note offers a second way to learn the caretaker’s new address after delivering the Vale House letter. Production source verified.
- [ ] Playtest the full Last Delivery route with both the forwarding slip and neighbor clue.
- [x] The Line That Held: choose anchors, manage slack and tension, reset after failure, and earn the pulley and clue. Logic tests passed and production source verified.
- [ ] Playtest the rigging dialog and rewards in-game on phone.
- [x] The Wrong Reel: scrub frame descriptions, mark damaged frames, undo cuts, and recover the west-bank reel as evidence. Puzzle logic and production source verified.
- [ ] Add illustrated film frames and playtest the reel bench in-game.
- [x] Night at the Bait Shop: set bait, inspect pawprints, aim the camera, and wait for either the raccoon or the Echo. Timing logic and production source verified.
- [ ] Add visual recordings and playtest both bait shop outcomes in-game.

## Chance events

- [x] Runaway crate chase, grapple recovery, and current-changing grate jam. Production source verified.
- [x] Ranger detours to inspect the jammed grate. Production source verified.
- [ ] Playtest crate recovery and the ranger’s detour in-game.
- [x] Stalled patrol truck: alternating recovery inputs, ridge turnout, radio log, and unattended tow. Logic and production source verified.
- [x] Wrong-bank voice: trace to the bend, verify with the ranger, or log and compare the call. Logic and production source verified.
- [x] Chance events use story and location triggers, with a voice cooldown, unattended tow, and persistent grate jam until cleared. Required story clues remain independent.
- [ ] Playtest all chance event triggers, optional paths, and consequences in the live game.


## Next release pending verification

- [ ] In-world rescue winch, selectable anchors, slack control, shelf failure, and a braked zip-line ride. Automated simulation covers the clutch, shelf, clean haul, and landing.
- [ ] Camp scattergun pickup, weapon switching, signal lantern placement and recall.
- [ ] Carry a bulky crate, secure it to the wagon, drive and unload from the rear. Job-specific packing choices remain open.
- [ ] Grapple the envelope from the Vale House eave and recover Mom’s missing journal insert.
- [ ] Illustrated reel frames and both animated bait-camera outcomes.
- [ ] Inspect the supported tuning stations, relay dishes, spillway post, and keepsakes in the browser. Continue the remaining scene-wide floating-prop sweep.
- [ ] Playtest the first Chapters 2–4 route from a Chapter 1 save: emergency ledger, colored spillway gauges, Echo porch latch, and both arch endings. Expanded chapter environments and investigations remain open.
- [ ] Playtest the camp pantry, skillet timing, mess station, hand pump, portable canteen, and the ranger supper/cache quest on phone.
- [ ] Verify the creek firefly encounter in the rendered game.

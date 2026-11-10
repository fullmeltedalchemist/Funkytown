# Funkytown implementation and release checklist

A checked item is confirmed live. Live source verification, automated gameplay coverage, and hands-on playtesting are separate. See [the mission roadmap](MISSION_ROADMAP.md) for planned work.

## Story and investigation

- [x] Prologue, woman on the bank, and first ranger conversation.
- [x] Rescue reconstruction: compare both stations, use a wagon, creek, or grapple approach, then recover the cut line. Verified in production source.
- [ ] Playtest all three existing marker-reconstruction approaches and their prompts from start to finish.
- [ ] Deploy and complete a rendered playthrough of the new ford emergency before the woman/ranger conversation. Automated gameplay tests drive the radio trigger, grapple, high-bank and on-foot interventions and the missed-wagon recovery.
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
- [x] One-slot mail packing and bulky hand and wagon cargo are live. The wagon supports straps, loose-cargo motion and ejection.
- [ ] Expand job-specific packing, fragile load protection and multi-item choices.

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
- [ ] Playtest the in-world winch, stretcher haul, reward and zip-line ride on phone.
- [x] The Wrong Reel: scrub frame descriptions, mark damaged frames, undo cuts, and recover the west-bank reel as evidence. Puzzle logic and production source verified.
- [x] Illustrated film frames are live.
- [ ] Playtest the reel bench in-game.
- [x] Night at the Bait Shop: set bait, inspect pawprints, aim the camera, and wait for either the raccoon or the Echo. Timing logic and production source verified.
- [x] Animated camera outcomes are live.
- [ ] Playtest both bait shop outcomes in-game.

## Chance events

- [x] Runaway crate chase, grapple recovery, and current-changing grate jam. Production source verified.
- [x] Ranger detours to inspect the jammed grate. Production source verified.
- [ ] Playtest crate recovery and the ranger’s detour in-game.
- [x] Stalled patrol truck: alternating recovery inputs, ridge turnout, radio log, and unattended tow. Logic and production source verified.
- [x] Wrong-bank voice: trace to the bend, verify with the ranger, or log and compare the call. Logic and production source verified.
- [x] Chance events use story and location triggers, with a voice cooldown, unattended tow, and persistent grate jam until cleared. Required story clues remain independent.
- [ ] Playtest all chance event triggers, optional paths, and consequences in the live game.


## Published features and remaining playtests

- [x] In-world rescue winch, selectable anchors, slack control, shelf failure, and a braked zip-line ride. Automated simulation covers the clutch, shelf, clean haul, and landing.
- [x] Camp scattergun pickup, weapon switching, signal lantern placement and recall.
- [x] Carry a bulky crate, secure it to the wagon, drive and unload from the rear. The automated Submerged Street route verifies wagon loading and unloading.
- [x] Grapple the envelope from the Vale House eave and recover Mom’s missing journal insert.
- [ ] Playtest scattergun pickup, weapon switching, lantern use, and the Vale House eave recovery on desktop and touch.
- [ ] Inspect the supported tuning stations, relay dishes, spillway post, and keepsakes in the browser. Continue the remaining scene-wide floating-prop sweep.
- [ ] Playtest the first Chapters 2–4 route from a Chapter 1 save: emergency ledger, colored spillway gauges, Echo porch latch, and both arch endings. Expanded chapter environments and investigations remain open.
- [ ] Playtest the camp pantry, skillet timing, mess station, hand pump, portable canteen, and the ranger supper/cache quest on phone.
- [ ] Verify the creek firefly encounter in the rendered game.

## Creek supply props and pump mystery

- [ ] Verify jug glass, visible fill, the red fuel can, and the transfer pump on desktop and mobile. All three are authored Blender exports loaded via the GLB manifest.
- [ ] Carry, throw, shoot, and wagon-haul the new props in the rendered game. Rapier tests cover thrown and shot jugs, splash creation, and a shot fuel can.
- [ ] Play the water handoff and fuel delivery, follow the delayed start across the ford, and check the optional clue against the Chapter 2 ledger.

## Submerged Street

- [ ] Drive into the western pond basin, load each salvage option, and unload it at the high-bank station. The drain unlocks after recovering the original Echo recording.
- [ ] Verify the warning bell, returning water, flooded cargo loss and retreat to the ramp. Automated checks cover the clock and player recovery.
- [ ] Check that pump salvage extends later runs, water salvage opens the canteen refill, and the ledger is recorded in the bag.

## The Second Address and field equipment

- [x] Release `e85c8cb` published to the existing Funkytown site. All 16 changed production files matched the release. Thirteen automated checks passed, including production file checks.
- [x] The salvaged ledger unlocks the dry address. Entry by bluff, grapple latch or following the resident. The post office requires the stopped-clock observation and both runs of the brass-ball experiment.
- [x] Published the powered wagon winch, tow line, cargo straps, flare pistol, contact mic and cottontails. The clock, tray, flare pistol and cottontail use authored GLB models.
- [ ] Complete all three rendered Second Address routes and the post office handoff on desktop and touch. Check hints, aim targets, clue-order flexibility and save/reload before and after filing.
- [ ] Playtest flare aiming, tow-line rigging, winching, straps, mic and hunting on real iPhone and iPad.
- [ ] Complete the world-wide pass for floating props, collision, grounded furniture and authored replacements. Include porch steps, interiors, the new ranch house, creek racks and Submerged Street.
- [ ] Verify the entire opening-to-Second-Address route from a clean save. Check all three salvage deliveries, both ending paths, touch audio, objective readability and first-30-minute pacing.

### Second Address playtest fixes in the draft

- [x] Fixed missing mission-awarded Keepsakes in the Field Bag, including the salvaged ledger.
- [x] Saved the chosen entrance so the unlocked door and its dialogue survive a reload.
- [x] Moved the experiment interaction onto the receiver stand so the moving ball cannot obstruct the second run.
- [x] Automated Rapier route uses actual aiming and interaction to inspect the clock, run both tests and file the result. The test stages the approach to the post office separately.
- [x] Scripted WebGL touch run passed from a seeded salvaged-ledger save. It verified visible ledger, bluff entry, clock, both ball runs, and the post office handoff with normal Use taps.
- [ ] Complete an uninterrupted, real-device playthrough. The browser fixture positions the player at the porch, room, and post office.

### Founders’ Night first route in the draft

- [x] Automated Rapier test verifies the Second Address unlock, following the truck with normal wagon physics, the missed-tail receipt fallback, and recovery of the original tape.
- [x] The storehouse now requires a grapple release and a physical case handoff. Automated tests aim and grapple the ring, carry the case on foot across town, file it, and recover a lost case.
- [ ] Hosted touch-browser check of the receipt, grapple and pickup. Real-device playthrough still needs the full drive and handoff.
- [ ] Parade, backstage and float routes, truck collision behavior, and the full extraction aftermath.

- [x] Interaction sensors no longer block walking. The Founders’ Night return test carries the case past the receipt stand on the direct approach.

### Touch HUD and gadget controls

- [x] Draft implementation groups utilities into a field kit. Primary actions use accessible icons, with Fire/Throw switching by carry state and the prompt placed at the reticle.
- [x] Tool selection closes the panel, suppresses movement/look while open and preserves keyboard shortcuts. Field Bag is scrollable on touch.
- [ ] Confirm the hosted touch check and review the layout on real iPhone and iPad in portrait and landscape.
- [ ] Continue in-world prop, animation and interaction polish. This pass covers HUD and inputs.

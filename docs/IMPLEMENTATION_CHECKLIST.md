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
- [ ] Evidence: ranger compares Cal’s letter with the tape. Add manual comparison and more conversations. Keep essential evidence safe.
- [ ] Cargo: one-slot mail packing is live. Add bulky hand and wagon cargo and job-specific packing choices.

## Villagers

- [ ] Walkable routes, activity stops, and conversation while working.
- [ ] Postmaster: sort, load, deliver, close, and reroute after flooding.
- [x] Ranger camp rounds: stops at the fire, rescue gear, and Cal’s marker. Dialogue reflects the current stop. Production deploy verified.
- [x] Ranger: visible gear repair with a handheld wrench. Verified in production source.
- [x] Ranger: distinct inspection animation at Cal’s marker on the rescue route. Production source verified.
- [ ] Projectionist: move reels and set up movie night.
- [ ] Sheriff: patrol and head to lookout for the confrontation.
- [x] Post office radio reacts to the flooded ford, reopening, and each ending choice. Production source verified.
- [x] Ranger reacts in person to ford flooding, drainage, and both ending choices. Production source verified.
- [ ] Playtest radio and ranger prompts. Add reactions for other villagers.

## Side quests

- [x] Last Delivery: the neighbor’s note offers a second way to learn the caretaker’s new address after delivering the Vale House letter. Production source verified.
- [ ] Playtest the full Last Delivery route with both the forwarding slip and neighbor clue.
- [x] The Line That Held: choose anchors, manage slack and tension, reset after failure, and earn the pulley and clue. Logic tests passed and production source verified.
- [ ] Playtest the rigging dialog and rewards in-game on phone.
- [ ] The Wrong Reel: scrub and splice damaged footage, undo bad splices, and recover evidence.
- [ ] Night at the Bait Shop: bait, tracks, move the camera, catch the ordinary thief or stay for the Echo.

## Chance events

- [ ] Runaway crate: grapple, chase, or let it jam the grate. Jam changes current and draws ranger.
- [ ] Stalled patrol truck: rock it loose, use ridge detour, or hear sheriff radio.
- [ ] Wrong-bank voice: follow, check real villager, or record and compare it.
- [ ] Add location and story conditions, cooldowns, and ignored-event consequences. Required clues remain available.

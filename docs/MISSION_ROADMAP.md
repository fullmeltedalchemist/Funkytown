# Bellwether Hollow mission roadmap

A checked item means the feature is implemented. Playtest and deployment verification are tracked separately in [the implementation checklist](IMPLEMENTATION_CHECKLIST.md).

The central question is who returned after the reservoir evacuation. People who came back remember private conversations they never heard. Mom kept the crossing open because some of the missing were still alive on the other side. The player learns the rules through objects, sounds and witnesses before deciding what to do about the arch.

## 1. The rescue that happens twice

**Hook.** A wagon slides toward the ford. A woman shouts to cut the tow rope. Her voice on the radio insists you pull harder and predicts your next move.

- [x] Stage the wagon and a breakable rescue load at the ford.
- [x] Add three approaches: grapple the wagon to a fixed anchor, reach the woman on foot, or retrieve the tow line from the high bank.
- [x] Make load damage affect the rescue aftermath. Every route still yields the conflicting radio call.
- [x] Give the woman a follow-up scene at camp and add the radio recording to Evidence.
- [x] Author a bent tow bracket and rolled rescue sling in Blender. Use the authored field receiver for the radio.
- [ ] Verify rope tension, approach timing, breakage, radio audibility and aim in uninterrupted rendered play on desktop and touch.

## 2. The Second Address

**Hook.** A ledger from Submerged Street lists one evacuee at two addresses. The occupant at the dry address remembers a private line from Mom's kitchen.

- [x] Unlock the occupied address from the salvaged ledger and place an authored cabin with its existing collision meshes.
- [x] Give players three ways to open the entry: a utility bluff, a grapple release at the eave, or following the resident to the porch.
- [x] Place a brass test ball and a sloped survey tray. Let the player watch the ball roll downhill first, then demonstrate the Echo pulling it uphill.
- [x] Let players carry the resulting evidence to a post office drop and preserve the chosen route in their bag.
- [x] Add the resident's private-memory contradiction as a required clue at the Blender-authored kitchen clock. The post office requires both clues.
- [x] Furnish both kitchens with the same Blender-authored cupboard, enamel kettle, low chair with a red-taped leg, and stopped clock.
- [ ] Assess whether the three door approaches need a distinct roof entry or late resident route after playtesting.
- [x] Offer an optional timed wagon getaway when the utility bluff is exposed. Reaching the road earns an early archive tip. Losing the getaway leaves both clues and the post office receipt route available.
- [ ] Play all three approaches and the handoff from a live save with desktop and touch controls.

## 3. Founders' Night

**Hook.** The parade closes Main Street while the original evacuation tapes are moved out of the archive.

- [x] First playable route from the post office dispatch board to the south-road archive truck and creek storehouse. Track the truck in the wagon or read the backup receipt and retrieve the original tape.
- [x] Load a Blender-authored archive truck through the GLB pipeline. The first pass uses a scripted truck path.
- [x] Stage a walkable parade float, spectator barriers and spectators. Give the moving archive truck physical collision.
- [x] Build an open-front, collidable archive loading bay around the grapple shutter and tape case.
- [x] Add the memorial bell float and a program that reveals why Cal’s name was omitted.
- [x] Move the memorial float in its staging lane with attached collision and spectators that turn to watch.
- [x] Give the bell float a repeating staging lane route with stops for players in its path. Add Inez’s eyewitness account, Wes’s route guidance, and follow-up dialogue after filing the tape.
- [ ] Extend the procession beyond the staging lane and verify the crowd and float timing on touch.
- [x] Offer a float-mounted recorder, a backstage bluff and a wagon pursuit. The recorder preserves the order in the Field Bag. The stagehand gives an off-the-record tip. A successful tail confirms the destination by observation.
- [x] Make the truck chase recoverable if contact is lost. The delivery receipt reveals the same destination.
- [x] Add a driveable fairground ramp, loose barrels and breakable roadside crates. The wagon retains cargo shift and strap behavior.
- [ ] Verify fairground landing, loose cargo and handbrake recovery on touch.
- [x] Authored tape case through the GLB pipeline. Grapple the loading cage open, carry or haul the case, and file it with the clerk. Restore the case if lost.
- [x] Author the float through the GLB pipeline with a walkable deck, side rails and rear steps.
- [ ] Validate the truck’s ground clearance and the parade route’s readability on touch.

## 4. The rescue Mom left unfinished

**Hook.** The original records establish who may still be alive beyond the arch. The ranger witnessed a copy taking somebody's place.

- [x] Require the original evacuation tape and both witness accounts before committing to either arch ending. If the tape is missing, guide the player to the submerged ledger, the second address and the archive in order.
- [x] Explain why Mom closed the floodgate while leaving the Echo crossing open. Give Cal’s family a different response for each arch choice, with or without a successful rescue.
- [x] Unlock three extraction plans through the salvaged pump, the aligned rescue recording or guidance from Cal’s family. Each gives a different route and crossing window.
- [x] Carry Cal in a physical harness through the marked Echo crossing. Losing the harness or running out of time returns him to the shelter for another attempt.
- [x] After the extraction, reflect the arch choice in the returned man’s dialogue, the radio and both addresses.
- [x] Add a walk-in diner with a counter radio and Cal’s booth. The radio reflects the arch choice and the booth records the search or Cal’s return.
- [ ] Play the diner epilogue on desktop and touch and expand the interior art.
- [x] Author the extraction harness as a Blender GLB and place a colliding cabin as the reflected shelter.
- [x] Author a lantern-like crossing marker and a grey-sided alternate-side shelter with a walkable porch through the Blender GLB pipeline.

## Systems that serve these missions

- [x] First flare pistol, contact microphone and wagon ratchet straps. A flare is a physical projectile with a temporary light. The mic can contrast an operating pump with the silent Echo relay. Loose cargo can shift in turns and leave the rack in a hard impact.
- [x] Two-hook tow line. A real rope joint connects a movable prop or wagon to a second object or an anchor on a solid surface.
- [x] Powered wagon winch. When a tow line is attached to the wagon, Rig toggles reeling from the driver's seat.
- [x] Add the slingshot, lever rifle and contact sample recording and playback.
- [x] Build a camera crawler operated from the Foxglove workshop controller.
- [x] Baseline physical props: carryable glass water jugs, splash and shards, explosive fuel cans with nearby reactions, and cargo that can shift or be strapped down.
- [x] Give full and empty jugs different mass, flotation and break effects. Both drift in the current.
- [ ] Extend buoyancy, balance, friction and break thresholds across boards, tires and lanterns. Verify lodging against gates.
- [x] Build the Foxglove workbench and raised inspection channel with a movable tray and stool.
- [ ] Add diner tablecloth physics and surfaces that preserve physical footprints or marks.
- [x] Recover a dropped spanner, gate key, truck plate and fishing lure with the Field Kit magnet.
- [x] Drive the workshop crawler under a door, climb a steel ramp, lift the latch, and thread a pull line through the pipe.
- [ ] Expand crawler navigation to additional steel surfaces and locations.
- [x] Give flares a lookout acknowledgement, a drifting light on water and the ability to reveal Echo tracks.
- [x] Add quiet pebble distractions and breakable targets. The lever rifle can ring the distant bell, drop a counterweight and hit existing hunting targets. Preserve the scattergun’s close-range spread.
- [x] Add a portable stove, kettle and water filter for camp away from Foxglove.
- [x] Lock the climbing harness mid-grapple to work a raised latch or attach a tow line. Earn bolt cutters from the crawler repair and use them as a ground-level alternative at the chained workshop gate.
- [ ] Test two-hook and winch scenarios beyond pulling a crate: jammed gates, wreck recovery, mill wheels, lowering a load through a window and catching a runaway cooler.
- [ ] Add mission-specific wagon packing, padding for fragile evidence and multi-item choices. Tune gravel drift, body lean, ditch bounce, prop impacts and forgiving recovery. Preserve optional foot routes where appropriate.
- [ ] Add persistent quest-object recovery, and use sleeping bodies, nearby activation and bounded debris to keep mobile play responsive.
- [x] Authored cottontails that flee, can be shot and yield meat for the existing skillet and sharing loop.
- [x] Add creek birds that flush together when approached or distracted by a nearby sound.
- [x] Add a boar that charges and knocks light props aside.
- [ ] Add ordinary animals with trackable signs, meat bait, recipe variety, and sharing outcomes.
- [x] First Echo cottontail. Observe it or shoot it to learn what it does. It yields a clue and no meat.
- [x] Add separate evidence for photographing the Echo cottontail and flare-lit tracks.
- [x] Add an Echo deer whose hoofprints stop while its call continues beyond the bend.
- [ ] Expand track-following and Echo species.
- [ ] Add standalone activities: a midnight cook-off with two skillets and an unreliable stove, a runaway bait cooler, and a distress call that changes location when answered.
- [x] Build The Road That Loops. The wagon returns to the chalked mile marker until you compare the mark and find the eastern verge.
- [x] Record the flooded-house knock by contact mic and unlock the dry-house resident’s account.
- [ ] Add thrown-marker and roof approaches to the flooded-house knock.
- [x] Add aim-based contact recording and a placeable speaker with spatial playback, a light cue and wildlife response.
- [ ] Check spatial audio and visual cues on a phone.
- [ ] Expand the playable Chapters 2–4 route beyond the current first pass. Connect the late rescue choice to relationships, original evacuation evidence, and different outcomes at the diner, houses and radio.
- [ ] Prove desktop and touch controls, clean-save progression, failure recovery and alternate routes before marking any mission as release-verified.

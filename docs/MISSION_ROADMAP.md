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
- [ ] Expand the parade beyond the staged float and build out the archive loading bay.
- [x] Offer a float-mounted recorder, a backstage bluff and a wagon pursuit. The recorder preserves the order in the Field Bag. The stagehand gives an off-the-record tip. A successful tail confirms the destination by observation.
- [x] Make the truck chase recoverable if contact is lost. The delivery receipt reveals the same destination.
- [ ] Add a fairground ramp, loose barrels, breakable roadside props and wagon cargo shift. Verify handbrake recovery on touch.
- [x] Authored tape case through the GLB pipeline. Grapple the loading cage open, carry or haul the case, and file it with the clerk. Restore the case if lost.
- [x] Author the float through the GLB pipeline with a walkable deck, side rails and rear steps.
- [ ] Validate the truck’s ground clearance and the parade route’s readability on touch.

## 4. The rescue Mom left unfinished

**Hook.** The original records establish who may still be alive beyond the arch. The ranger witnessed a copy taking somebody's place.

- [x] After filing the archive tape, hear the ranger’s eyewitness account and Cal’s family disagree before deciding the arch’s fate.
- [ ] Unlock rescue approaches through the pump, the sound experiment or help earned from townspeople.
- [ ] Build an actual extraction route with physical equipment and a recoverable failure state.
- [ ] Connect the existing seal/open ending to who returned, who answers the radio and what changes at the diner and both addresses.
- [ ] Author the crossing markers, extraction harness and the alternate-side house through the asset pipeline.

## Systems that serve these missions

- [x] First flare pistol, contact microphone and wagon ratchet straps. A flare is a physical projectile with a temporary light. The mic can contrast an operating pump with the silent Echo relay. Loose cargo can shift in turns and leave the rack in a hard impact.
- [x] Two-hook tow line. A real rope joint connects a movable prop or wagon to a second object or an anchor on a solid surface.
- [x] Powered wagon winch. When a tow line is attached to the wagon, Rig toggles reeling from the driver's seat.
- [ ] Magnetic crawler, slingshot and lever-action rifle. Add a recorder and playback function to the contact microphone.
- [x] Baseline physical props: carryable glass water jugs, splash and shards, explosive fuel cans with nearby reactions, and cargo that can shift or be strapped down.
- [ ] Extend weight, balance, friction, break thresholds and buoyancy across common objects. An empty jug should float higher than a full one. Boards, tires and lanterns should float or roll, lodge against gates, and react to the current.
- [ ] Build everyday physics scenes: a diner tablecloth that drags tableware and draws the owner's attention, a workbench and inspection pit with dropped tools, movable furniture, and flour or chalk that records physical footprints and marks.
- [ ] Make the magnetic pickup recover dropped tools, keys, license plates and lures. Let the camera crawler scout under doors, traverse suitable steel surfaces, pull a latch, and thread a line through a pipe.
- [ ] Give the flare world uses beyond lighting: a lookout signal, a drifting marker on water, and a way to reveal Echo tracks or silhouettes.
- [ ] Give the slingshot quiet pebble distractions and breakable-fixture shots. Give the rifle long-range counterweights, bells and hunting targets. Preserve the scattergun's close-range role.
- [ ] Add a climbing harness so the player can stop mid-grapple and work on a latch or attach a line. Add bolt cutters for chained routes and a portable stove, kettle and water filter for camp away from Foxglove.
- [ ] Test two-hook and winch scenarios beyond pulling a crate: jammed gates, wreck recovery, mill wheels, lowering a load through a window and catching a runaway cooler.
- [ ] Add mission-specific wagon packing, padding for fragile evidence and multi-item choices. Tune gravel drift, body lean, ditch bounce, prop impacts and forgiving recovery. Preserve optional foot routes where appropriate.
- [ ] Add persistent quest-object recovery, and use sleeping bodies, nearby activation and bounded debris to keep mobile play responsive.
- [x] Authored cottontails that flee, can be shot and yield meat for the existing skillet and sharing loop.
- [ ] Creek birds that flush in a group, a boar that can charge and knock over light props, and ordinary animals with trackable signs. Add meat bait, recipe variety, and sharing outcomes.
- [x] First Echo cottontail. Observe it or shoot it to learn what it does. It yields a clue and no meat.
- [ ] Echo photography, track-following and more species, including the deer whose tracks stop while the sound keeps going. Preserve distinct outcomes for observing, photographing, following and shooting.
- [ ] Add standalone activities: a midnight cook-off with two skillets and an unreliable stove, a runaway bait cooler, and a distress call that changes location when answered.
- [ ] Build The Road That Loops around a wagon route that resets at the same mile marker. Compare physical road signs and chalk marks to escape.
- [ ] Make a flooded-house knock investigable by contact mic, a thrown marker or roof access. The evidence should change the search route or the witness the player trusts.
- [ ] Add a directional recorder with playback and a placeable speaker for distractions. Check spatial audio and accessible visual cues on phone.
- [ ] Expand the playable Chapters 2–4 route beyond the current first pass. Connect the late rescue choice to relationships, original evacuation evidence, and different outcomes at the diner, houses and radio.
- [ ] Prove desktop and touch controls, clean-save progression, failure recovery and alternate routes before marking any mission as release-verified.

# Bellwether Hollow / Funkytown game requirements

This is the project requirements reference for future work. It captures the player's requests separately from the current build and the developer's story proposals. Use it when planning, reviewing, and playtesting changes.

## World and identity

- Make a solo, first-person mystery in a colorful, eerie small town with stranger, more psychedelic spaces beyond it.
- Keep the story of following Mom's trail from Vale House through Foxglove Camp to the Echo Grid as the current foundation. Build original story beats around the established locations and inspiration.
- Preserve the improved grounded, stylized presentation of Foxglove Ridge. Keep terrain, elevation, trees and walk-in furnished buildings. Make interiors seamless to explore and realm transitions functional.
- Terrain should support traversal and tell the player where to go. Route the main trail clear of the Vale House hillside, use a readable spur to its porch, and provide a clear crossing for the larger creek or pond.
- Give the Echo Grid distinct geometry, rippling effects and iridescent materials. Let altered versions of recognizable locations matter to exploration.

## Art and assets

- Use the dedicated asset pipeline for game content. Import GLB/GLTF models through the manifest and asset loader. Use authored collision for walk-in spaces and automatic convex hulls for loose objects.
- Make the field journal, Mom's note, lanterns, tools, and puzzle hardware recognizable from their shape, materials and authored detail. Put generated imagery where it adds value, such as illustrations, handwriting, labels or material textures on the finished model. An image alone is not a 3D game prop. Basic shapes are acceptable for collision, invisible triggers and temporary prototyping.
- Match first-person hands, sleeves, weapon, and bullet effects to the world's art direction. Water should read as a stream, creek, pond, or spray rather than large blue balls.
- Preserve physical bullet travel and hits, reactive water, breakable props and debris, and the ability to pick up and throw appropriate objects.

## Controls and traversal

- Keep desktop WASD, mouse look, Space jump, and a first-person interaction control. Keep mobile movement, look, Use, Jump, Fire, Hook, and Throw controls functional.
- Support arcade driving with drift, enter and exit, and a useful role for the wagon. A wagon trip should remain optional unless a chapter is expressly designed around driving.
- Grappling should work on visible tree trunks, branches and canopy surfaces and around the whole house, including walls, eaves, porches and roof surfaces. Occluding solid objects should prevent impossible through-wall attachments.
- Make pickups, interactions, objectives and climb routes discoverable in-world. Check them on touch as well as keyboard and mouse.

## Chapter quality

- Build **full playable chapters**, with substantial objectives or minigames. A waypoint followed by pressing Use to advance dialogue does not constitute a chapter.
- Each chapter should establish a problem, require active decisions or skill, escalate through multiple beats, and pay off with a revelation or consequence. Make the objective mechanics part of the story.
- Use the world and existing systems. Suitable chapter activities include navigation and search, grappling routes, physics delivery, clue interpretation, tuning or sluice puzzles, timed signal challenges, and driving. These examples are implementation directions, not a limit.
- Provide readable rules, objective progress, clear feedback, and a safe retry when a player fails. Keep story milestones persistent. Prevent a missing or discarded quest item from permanently blocking progress.
- Test chapter routes as a player, including arrival, failure, retry, completion and the next objective. Label content as planned or playable. Use demonstrated playthroughs before claiming a chapter is complete or assigning a runtime.

## Deployment and review

- Source repository: `fullmeltedalchemist/Funkytown`. Keep this document updated when the player changes a requirement.
- Test the existing Foxglove Ridge Netlify site when a gameplay update is published. Confirm the deploy and distinguish deployment checks from gameplay checks. Keep hosting visibility intact unless requested otherwise.
- Read [CHAPTERS.md](../CHAPTERS.md) for the proposed narrative and chapter beats. It is a design outline, not a substitute for the playable campaign.

## Current scope

The base game includes the ridge, Vale House, Foxglove Camp, the Echo Grid, and the original clue sequence. The chapter work adds a receiver delivery and tuning task, a three-valve sluice puzzle, and a timed physical-projectile relay trial. These are playable objective implementations once deployed and tested; they are not the finished full-length chapters requested above. The full chapter progression, choices, consequences, and runtime remain to be built and validated.


### Art implementation status

The generated survey and handwritten letter are mapped onto the journal and letter props. The field receiver, sluice valves, camp lantern, Echo Grid relay dish, and stone arch load from the GLB asset manifest. Physics colliders and interaction markers are separate from the display models. Full chapter playthrough and art review remain part of acceptance.

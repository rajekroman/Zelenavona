# Chlum V7 approval gate

## Status
**APPROVED / READY FOR REVIEW**

Chlum is the authoritative V7 vertical slice. Later locations must inherit this runtime and presentation contract rather than reintroducing the legacy agent architecture.

## Approved baseline
- clean V7 runtime independent of legacy agent orchestration;
- authored production terrain plate for Chlum;
- separate foreground occlusion layer above actors and below HUD;
- bounded smooth player-follow camera with dead-zone, damping, orientation framing and viewport cover protection;
- desktop keyboard movement and contextual action;
- mobile joystick and contextual action with on-screen/hit-test QA;
- single contextual quest flow: Václav → search → collect → complete;
- dedicated V7 player, Václav and tractor presentation;
- idle / walk / search / pickup animation states with directional movement;
- moving tractor with collision reset and cooldown;
- compact responsive HUD;
- unit coverage for camera, world progression, animation and tractor logic;
- Playwright gameplay + visual matrix for desktop, iPhone portrait and iPhone landscape.

## Approval evidence
The final gate requires both workflows to be green on the same PR head:
- `V7 CI`;
- `Chlum E2E + Visual QA`.

The Playwright matrix executes gameplay and visual coverage across all three target viewports, including real mobile joystick movement and the complete contextual quest action path.

## Next-location rule
Nesměň, Besednice and Slávie remain outside this PR. Their visual/runtime work starts only from the reviewed/merged Chlum V7 baseline. No later location may bypass the camera, responsive input, layering or E2E contracts established here.

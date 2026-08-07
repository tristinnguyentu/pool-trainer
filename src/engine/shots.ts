// Shot library — data + teaching content.
// Imports ONLY from ./constants.ts. No cross-imports of physics/topdown/cueview.

import type { Scene, ShotDef } from './types';

export const SHOTS: ShotDef[] = [
  // ============================================================
  // 1. FUNDAMENTALS — stun, follow, draw on a dead-straight shot
  // ============================================================
  {
    id: 'stop-shot',
    name: 'Stop Shot (Stun)',
    category: 'Fundamentals',
    difficulty: 1,
    description:
      'A dead-straight shot with a level cue and zero vertical spin (sy = 0). At impact the cue ' +
      "ball's forward roll transfers entirely to the object ball along the line of centers, and " +
      'the cue ball stops dead in its tracks. This is the foundation of position play: master the ' +
      'stop shot before anything else.',
    tips: [
      'Aim the center of the cue ball straight at the ghost-ball position, the spot 2 ball-radii ' +
        'behind the object ball, on the line from the object ball to the pocket.',
      'Keep sy at 0 (no top or bottom spin) and strike the exact center of the cue ball; any follow ' +
        'or draw will pull the cue ball off the dead-stop.',
      'Classic miss: pros call this "wobble." An unlevel cue or a slightly off-center hit imparts ' +
        'accidental spin, so the cue ball creeps forward or back instead of stopping.',
      'Use firm, even speed. Stop shots actually work better a bit faster; too soft and any tiny ' +
        'spin error gets exaggerated.',
    ],
    balls: [
      { id: 'cue', x: 35.46, y: 23.69 },
      { id: '1', x: 62, y: 14 },
    ],
    aimSpec: { kind: 'pocket', ball: '1', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.45,
  },
  {
    id: 'follow-shot',
    name: 'Follow Shot',
    category: 'Fundamentals',
    difficulty: 1,
    description:
      'Same dead-straight line as the stop shot, but struck above center (sy > 0, topspin). The cue ' +
      "ball keeps rolling forward through the contact point and continues down the object ball's " +
      'line after the collision. That is essential for staying with your next shot instead of ' +
      'leaving the table.',
    tips: [
      'Aim identically to a stop shot, straight at the ghost ball. Follow changes what the cue ball ' +
        'does after contact, not where the object ball goes.',
      'Strike about halfway between center and the top of the ball (sy ≈ 0.6) with smooth, accelerating ' +
        'follow-through. Don’t "hit and stop" the stroke.',
      'Classic miss: too much elevation on the cue stick makes the ball hop instead of roll, which can ' +
        'kill the follow effect or cause a miscue.',
      'Feel cue: a true follow shot leaves the tip feeling like it "chases" the cue ball down the table.',
    ],
    balls: [
      { id: 'cue', x: 35.46, y: 26.31 },
      { id: '2', x: 62, y: 36 },
    ],
    aimSpec: { kind: 'pocket', ball: '2', pocket: 'TR' },
    spin: { sx: 0, sy: 0.6 },
    power: 0.5,
  },
  {
    id: 'draw-shot',
    name: 'Draw Shot',
    category: 'Fundamentals',
    difficulty: 2,
    description:
      'Struck below center (sy < 0, backspin) on a straight shot, the cue ball skids, grips the cloth, ' +
      'and rolls back the way it came after contact. Draw is the single most useful position-play tool ' +
      'in the game, so learn to control how far it comes back with speed, not just spin.',
    tips: [
      'Aim is unchanged from the stop shot: a straight line at the ghost ball. Draw is entirely a ' +
        'tip-placement and speed skill.',
      'Strike low (sy ≈ -0.6), keep the cue level, and follow through. Decelerating into the ball is ' +
        'the number one cause of a whiffed or weak draw.',
      'Classic miss: aiming too low causes a miscue (the tip slips off the ball); if that happens back ' +
        'off the spin slightly and add a touch more speed instead.',
      'Feel cue: a good draw stroke feels like you are trying to drive the tip through the cue ball, ' +
        'not just tap it.',
    ],
    balls: [
      { id: 'cue', x: 64.54, y: 23.69 },
      { id: '3', x: 38, y: 14 },
    ],
    aimSpec: { kind: 'pocket', ball: '3', pocket: 'BL' },
    spin: { sx: 0, sy: -0.6 },
    power: 0.55,
  },

  // ============================================================
  // 2. CUT SHOTS — 15°, 30°, 45° (side), thin 60°
  // ============================================================
  {
    id: 'cut-15',
    name: '15° Cut to the Corner',
    category: 'Cut Shots',
    difficulty: 1,
    description:
      'A gentle cut, about a 15° angle between the cue ball’s path and the object ' +
      "ball's path to the pocket, roughly a three-quarter-ball hit (fullness ≈ 0.74). This is about " +
      'as forgiving as cuts get; use it to build the ghost-ball habit before tackling sharper cuts.',
    tips: [
      'Picture the ghost ball, an imaginary cue ball touching the object ball exactly on the line to ' +
        'the pocket, and aim your real cue ball’s center at that spot.',
      'At this shallow an angle you are hitting fairly full (fullness = 1 − sin(cut) ≈ 0.74, roughly a ' +
        'three-quarter-ball hit). The classic miss is over-cutting, because the angle looks bigger than ' +
        'it is from behind the cue ball.',
      'Keep speed moderate and stun (sy = 0) so you can see the tangent-line relationship clearly before ' +
        'adding spin to later shots.',
    ],
    balls: [
      { id: 'cue', x: 55.12, y: 17.27 },
      { id: '4', x: 78, y: 30 },
    ],
    aimSpec: { kind: 'pocket', ball: '4', pocket: 'TR' },
    spin: { sx: 0, sy: 0 },
    power: 0.45,
  },
  {
    id: 'cut-30',
    name: '30° Cut to the Corner',
    category: 'Cut Shots',
    difficulty: 2,
    description:
      'A textbook 30° cut, roughly a three-quarter-ball hit. This is the angle where most players’ ' +
      'fullness estimation starts to break down, so use the ghost ball and the fraction readout together ' +
      'until the picture is automatic.',
    tips: [
      'Fullness ≈ 1 − sin(cut angle): at 30° that’s exactly 0.5, the classic half-ball hit and the ' +
        'single most useful mental anchor in cut-shot aiming.',
      'Find the ghost ball first, then find the line from your cue ball to it. Don’t aim at the ' +
        'object ball itself.',
      'Classic miss: under-cutting (hitting fuller than needed) because the eye is drawn to the object ' +
        'ball instead of the ghost-ball contact point.',
    ],
    balls: [
      { id: 'cue', x: 28.61, y: 38.05 },
      { id: '5', x: 60, y: 32 },
    ],
    aimSpec: { kind: 'pocket', ball: '5', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.5,
  },
  {
    id: 'cut-45-side',
    name: '45° Cut to the Side Pocket',
    category: 'Cut Shots',
    difficulty: 3,
    description:
      'A thinner-than-half-ball hit (fullness ≈ 0.29, well past the classic 30° "half-ball" cut) into a ' +
      'side pocket, which has a narrower effective mouth than a corner and punishes a mis-hit angle ' +
      'harder. This is the shot where the tangent line first becomes something you need to actively ' +
      'manage, not just watch.',
    tips: [
      'At 45° you are already well thinner than a half-ball hit (fullness = 1 − sin(45°) ≈ 0.29). ' +
        'Picture the ghost ball sitting mostly beside the object ball, with only a sliver of overlap.',
      'Side pockets accept the ball over a narrower window than corners. Small aiming errors that a ' +
        'corner pocket forgives will rattle or miss here.',
      'With sy = 0 (stun) the cue ball will depart along the tangent line, 90° from the object ball’s ' +
        'path. After taking this shot, watch where the cue ball goes to internalize the 90° rule.',
      'Classic miss: cutting a side pocket too full sends the object ball into the near jaw; picture the ' +
        'ghost ball precisely rather than eyeballing the pocket opening.',
    ],
    balls: [
      { id: 'cue', x: 14.36, y: 39.87 },
      { id: '6', x: 38, y: 40 },
    ],
    aimSpec: { kind: 'pocket', ball: '6', pocket: 'TM' },
    spin: { sx: 0, sy: 0 },
    power: 0.45,
  },
  {
    id: 'cut-60-thin',
    name: 'Thin 60° Cut',
    category: 'Cut Shots',
    difficulty: 4,
    description:
      'A thin cut of roughly 60°, only a sliver of the object ball is struck (fullness ≈ 0.13). Thin ' +
      'cuts need noticeably more speed than they look like they need, because so little of the cue ' +
      'ball’s energy transfers into the object ball.',
    tips: [
      'The ghost ball is now most of a ball-width away from the object ball. Trust the geometry, not ' +
        'the "feel" of the shot, which will scream that you’re about to miss.',
      'Add extra speed: a thin cut transfers only a small fraction of the cue ball’s energy, so the ' +
        'object ball needs a harder hit to reach the pocket at a useful pace.',
      'Classic miss: flinching thin and steering the cue tip off-line at the last instant. Keep the ' +
        'stroke smooth and committed all the way through.',
      'Cut-induced throw is at its largest on thin cuts like this. Expect the object ball to drift ' +
        'slightly thicker than the pure geometric line, and compensate by aiming a hair thinner.',
    ],
    balls: [
      { id: 'cue', x: 26.02, y: 19.17 },
      { id: '7', x: 22, y: 40 },
    ],
    aimSpec: { kind: 'pocket', ball: '7', pocket: 'TL' },
    spin: { sx: 0, sy: 0 },
    power: 0.55,
  },

  // ============================================================
  // 3. SPIN & ENGLISH — outside/inside cut, draw position,
  //    force follow, stun run-through
  // ============================================================
  {
    id: 'outside-english-cut',
    name: 'Outside English on a Cut',
    category: 'Spin & English',
    difficulty: 3,
    description:
      'On this cut the object ball naturally breaks to the left as it leaves the cue ball. "Outside" ' +
      'english here is right-hand spin (sx > 0), struck on the side opposite the direction of the cut. ' +
      'Outside english fights the natural cut-induced throw, so the object ball holds closer to the pure ' +
      'geometric line, which is useful when you need precision on a cut you’ve calculated carefully.',
    tips: [
      'Cut-induced throw always pushes the object ball a little extra in the direction of the cut; ' +
        'outside english (spin opposite that direction) partially cancels it out, so aim can stay ' +
        'closer to the "pure" ghost-ball line.',
      'Because outside english fights the throw, you may need to aim marginally fuller than pure ' +
        'geometry suggests to compensate for the reduced throw.',
      'Watch the cue ball after contact: outside english also curves its path off the tangent line, ' +
        'which is exactly what makes it useful for controlling position after a cut.',
      'Classic miss: overdoing the spin and catching the rail wrong afterward. Start around sx = 0.4–0.5 ' +
        'and adjust from there.',
    ],
    balls: [
      { id: 'cue', x: 51.29, y: 43.79 },
      { id: '8', x: 66, y: 20 },
    ],
    aimSpec: { kind: 'pocket', ball: '8', pocket: 'BR' },
    spin: { sx: 0.45, sy: 0 },
    power: 0.42,
  },
  {
    id: 'inside-english-cut',
    name: 'Inside English on a Cut',
    category: 'Spin & English',
    difficulty: 3,
    description:
      'This cut sends the object ball breaking to the right. "Inside" english here is right-hand spin ' +
      '(sx > 0), struck on the same side as the cut direction. Inside english adds to the natural throw, ' +
      'so the object ball drifts thicker than pure geometry, but it also sends the cue ball to useful ' +
      'positions on the rail that stun or outside english can’t reach.',
    tips: [
      'Inside english amplifies cut-induced throw, so you generally need to aim a touch thinner than the ' +
        'pure ghost-ball line to compensate.',
      'Inside english is what lets you curve the cue ball toward a rail it wouldn’t naturally reach. ' +
        'Plan the position play, then pick inside vs outside accordingly.',
      'Classic miss: not compensating for the extra throw and clipping the object ball fuller than ' +
        'intended, sending it wide of the pocket.',
      'Start conservative (sx ≈ 0.4). Inside english is less forgiving of over-application than outside.',
    ],
    balls: [
      { id: 'cue', x: 54.28, y: 10.86 },
      { id: '9', x: 70, y: 34 },
    ],
    aimSpec: { kind: 'pocket', ball: '9', pocket: 'TR' },
    spin: { sx: 0.45, sy: 0 },
    power: 0.55,
  },
  {
    id: 'draw-position',
    name: 'Draw for Position',
    category: 'Spin & English',
    difficulty: 3,
    description:
      'A soft cut where the real point is what happens after the pot: pulling the cue ball well back ' +
      'off the tangent line for a better angle on the next shot. Speed control matters as much ' +
      'as spin here; too much and you overshoot position, too little and the draw never "grabs."',
    tips: [
      'With sy < 0, the cue ball departs the tangent line and curves backward. The more draw and the ' +
        'more cloth-time before contact, the further back it comes.',
      'Play this one soft and full-blooded rather than hard and clipped. A smooth, unhurried stroke ' +
        'gives the draw time to bite before impact.',
      'Classic miss: decelerating through the stroke, which kills the draw and leaves the cue ball ' +
        'stranded near the contact point instead of at your intended position.',
      'Feel cue: think "low, slow, long follow-through" rather than "hit it low and hard."',
    ],
    balls: [
      { id: 'cue', x: 50.82, y: 24.37 },
      { id: '10', x: 30, y: 12 },
    ],
    aimSpec: { kind: 'pocket', ball: '10', pocket: 'BL' },
    spin: { sx: 0, sy: -0.5 },
    power: 0.4,
  },
  {
    id: 'force-follow',
    name: 'Force Follow',
    category: 'Spin & English',
    difficulty: 3,
    description:
      'Heavy topspin struck with real pace so the cue ball "jumps" through the tangent line right after ' +
      'contact instead of drifting onto it gradually. It is the classic power-position tool for closing ' +
      'big distances down the table.',
    tips: [
      'Load up on topspin (sy close to +0.85–1.0) and swing with authority. Force follow needs both ' +
        'spin and speed to overcome the tangent-line deflection.',
      'The harder you hit a force-follow shot, the straighter through the object ball the cue ball will ' +
        'travel, almost ignoring the 90° tangent-line rule. That’s the whole point.',
      'Classic miss: too much elevation on the back of the stroke turns this into a masse-like miscue; ' +
        'keep the cue as level as your bridge allows.',
      'Use this when you need the cue ball to cover a lot of table fast. It is a blunt instrument, not ' +
        'a precision one.',
    ],
    balls: [
      { id: 'cue', x: 48.04, y: 35.09 },
      { id: '11', x: 74, y: 38 },
    ],
    aimSpec: { kind: 'pocket', ball: '11', pocket: 'TR' },
    spin: { sx: 0, sy: 0.85 },
    power: 0.75,
  },
  {
    id: 'stun-run-through',
    name: 'Stun Run-Through',
    category: 'Spin & English',
    difficulty: 2,
    description:
      'A pure stun shot (sy = 0) on a moderate cut, played with enough speed that the cue ball "runs ' +
      'through" a good distance along the tangent line before friction pulls it into natural roll. This ' +
      'is the cleanest demonstration of the tangent-line (90°) rule you will find.',
    tips: [
      'With zero vertical spin, the cue ball must depart at exactly 90° from the object ball’s path. ' +
        'Watch it happen and commit that picture to memory.',
      'Speed determines how far the cue ball slides along the tangent line before rolling naturally: ' +
        'more speed, more slide, more distance.',
      'Classic miss: an accidental sliver of follow or draw from an off-center hit, which bends the cue ' +
        'ball off the true tangent line and ruins your position read.',
      'This is the shot to groove until the 90° rule becomes instinctive. It underlies almost all ' +
        'cut-shot position play.',
    ],
    balls: [
      { id: 'cue', x: 30.49, y: 13.53 },
      { id: '12', x: 58, y: 18 },
    ],
    aimSpec: { kind: 'pocket', ball: '12', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.55,
  },

  // ============================================================
  // 4. BANK SHOTS — cross-side, cross-corner, long-rail, running english
  // ============================================================
  {
    id: 'bank-cross-side',
    name: 'Cross-Table Bank to the Side',
    category: 'Bank Shots',
    difficulty: 3,
    description:
      'The object ball banks off the near (bottom) rail and travels the width of the table into the top ' +
      'side pocket. Use the mirror system: reflect the pocket across the rail line, and the reflected ' +
      'aim point tells you exactly where to send the object ball.',
    tips: [
      'Mirror system: imagine the side pocket reflected through the rail like a mirror image below the ' +
        'table. Aim the object ball at that mirrored point and the rail does the rest.',
      'The cue-to-object hit is fairly full here (~15° cut). Banks are hard enough without adding a ' +
        'tricky cut on top, so keep this contact clean.',
      'Classic miss: aiming at the rail itself instead of the mirrored pocket point. The mirror point is ' +
        'usually well past where your eye wants to look.',
      'Banks lose some energy at the cushion, so hit with a bit more pace than the equivalent straight shot.',
    ],
    balls: [
      { id: 'cue', x: 35.5, y: 33.5 },
      { id: '13', x: 35, y: 12 },
    ],
    aimSpec: { kind: 'bank', ball: '13', rail: 'bottom', pocket: 'TM' },
    spin: { sx: 0, sy: 0 },
    power: 0.55,
  },
  {
    id: 'bank-cross-corner',
    name: 'Cross-Corner Bank',
    category: 'Bank Shots',
    difficulty: 3,
    description:
      'A one-rail bank off the top cushion into the far corner pocket. Corner-pocket banks are more ' +
      'forgiving than side-pocket banks because the pocket mouth is wider, which makes this a good shot ' +
      'for learning to trust the mirror system under a bit less pressure.',
    tips: [
      'Reflect the corner pocket across the top-rail line to get your mirror aim point, then aim the ' +
        'object ball at it exactly as you would a normal pocket shot.',
      'Keep the cue-to-object contact fairly full (~15° here) so the bank angle itself is the main ' +
        'variable you’re controlling.',
      'Classic miss: misjudging the rail’s cushion return. Real cushions aren’t perfect mirrors, so ' +
        'once you’re comfortable with the geometry, start noting whether your table’s rail runs a ' +
        'touch long or short and adjust your aim point slightly.',
    ],
    balls: [
      { id: 'cue', x: 42, y: 14 },
      { id: '14', x: 60, y: 35 },
    ],
    aimSpec: { kind: 'bank', ball: '14', rail: 'top', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.5,
  },
  {
    id: 'bank-long-rail',
    name: 'Long-Rail Bank',
    category: 'Bank Shots',
    difficulty: 4,
    description:
      'The object ball sits near the left cushion and banks the long way down that same rail into the ' +
      'far corner, a long, shallow-angle bank that magnifies any aiming error, so precision with the ' +
      'mirror point matters even more than usual.',
    tips: [
      'Because the bank travels almost the full length of the table after the rail, small errors in the ' +
        'mirror aim point are magnified. Take extra care lining up the object ball’s initial direction.',
      'The rail entry angle into the pocket is shallow and forgiving here, but getting there requires an ' +
        'accurate line off the cushion. Trust the mirrored pocket point over instinct.',
      'Classic miss: under-hitting it. A long-rail bank needs noticeably more speed than it looks like, ' +
        'or the object ball dies before it ever reaches the pocket.',
    ],
    balls: [
      { id: 'cue', x: 34.31, y: 39.01 },
      { id: '15', x: 14, y: 30 },
    ],
    aimSpec: { kind: 'bank', ball: '15', rail: 'left', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.5,
  },
  {
    id: 'bank-running-english',
    name: 'Bank with Running English',
    category: 'Bank Shots',
    difficulty: 4,
    description:
      'A long diagonal bank off the bottom rail into the far top-left corner, struck with running ' +
      '(outside) english on the cue ball. The english alters cut-induced throw at the moment of contact, ' +
      'subtly changing the object ball’s angle into the rail, and therefore the bank’s angle out. ' +
      'This is an intentionally fuller-contact shot, so it’s exempt from the tight cut-angle rule that ' +
      'governs the other banks.',
    tips: [
      'Running english (spin that matches the roll direction the object ball will take off the rail) ' +
        'subtly changes throw at contact, which shortens or lengthens the resulting bank angle. It’s a ' +
        'fine-tuning tool once your basic mirror-system aim is close.',
      'Start with the pure mirror-system aim point, then dial in english to nudge the bank angle rather ' +
        'than trying to compute the adjustment analytically at the table.',
      'Classic miss: using so much english that the throw adjustment overwhelms your base aim. Apply it ' +
        'as a small correction, not the primary aiming method.',
      'Because this bank is longer and fuller-hit than the others, it can take extra pace; don’t be ' +
        'afraid to commit to the stroke.',
    ],
    balls: [
      { id: 'cue', x: 83.11, y: 36.6 },
      { id: '1', x: 70, y: 14 },
    ],
    aimSpec: { kind: 'bank', ball: '1', rail: 'bottom', pocket: 'TL' },
    spin: { sx: 0.5, sy: 0 },
    power: 0.55,
  },

  // ============================================================
  // 5. KICK SHOTS — one-rail full hit, kick to the opposite end
  // ============================================================
  {
    id: 'kick-one-rail',
    name: 'One-Rail Kick (Full Hit)',
    category: 'Kick Shots',
    difficulty: 3,
    description:
      'The cue ball has no straight path to the object ball, so it banks off the bottom rail first. Use ' +
      'the same mirror system as a bank shot, but in reverse: mirror the object ball across the rail and ' +
      'send the cue ball straight at the mirrored point for a full, direct hit.',
    tips: [
      'Mirror system for kicks: reflect the object ball across the rail you’ll use, then aim the cue ' +
        'ball at that mirrored position exactly as if it were a straight shot to that spot.',
      'This is set up as a full hit. The cue ball should contact the object ball squarely, not cut it, ' +
        'so precision on the rail line is everything.',
      'Classic miss: aiming at the rail cushion by eye instead of computing the true mirror point. The ' +
        'correct aim spot is often further along the rail than intuition suggests.',
      'Kick with a firm, stun-like stroke (sy = 0) so the rail rebound behaves predictably.',
    ],
    balls: [
      { id: 'cue', x: 30, y: 15 },
      { id: '2', x: 70, y: 35 },
    ],
    aimSpec: { kind: 'kick', ball: '2', rail: 'bottom' },
    spin: { sx: 0, sy: 0 },
    power: 0.6,
  },
  {
    id: 'kick-opposite-end',
    name: 'Kick to the Opposite End',
    category: 'Kick Shots',
    difficulty: 4,
    description:
      'A long kick from one corner of the table to the object ball waiting near the far corner, banking ' +
      'off the top rail along the way. The distance magnifies any error in the mirror point, and the ' +
      'shot needs real pace to survive the full length of the table plus the rail.',
    tips: [
      'Same mirror system as any kick, just over a much longer distance. Small angular errors near the ' +
        'cue ball become large positional errors by the time the ball reaches the rail.',
      'Commit to extra speed: this kick has to cross nearly the whole table twice (down to the rail, then ' +
        'back across) and will die short if struck timidly.',
      'Classic miss: misjudging cushion speed loss over a long kick. Real cushions return a bit less ' +
        'cleanly the harder and longer the shot, so lean toward more pace than the pure geometry implies.',
    ],
    balls: [
      { id: 'cue', x: 15, y: 10 },
      { id: '3', x: 85, y: 45 },
    ],
    aimSpec: { kind: 'kick', ball: '3', rail: 'top' },
    spin: { sx: 0, sy: 0 },
    power: 0.78,
  },

  // ============================================================
  // 6. ADVANCED — combination, carom off the tangent line, frozen rail
  // ============================================================
  {
    id: 'combo-basic',
    name: 'Basic Combination',
    category: 'Advanced',
    difficulty: 4,
    description:
      'Cue ball drives the first object ball into a second ball, which then drops in the corner. Combos ' +
      'compound aiming error at every link in the chain: the first ball must send the second ball’s ' +
      'ghost ball nearly dead-on, so treat this as two ghost-ball problems chained together, not one.',
    tips: [
      'Work backward: find the ghost ball for the second ball’s pocket first, then aim the first ball ' +
        'at that ghost-ball spot as if it were the pocket.',
      'Keep the "kink" where the balls change direction small. The straighter the three balls line up, ' +
        'the more forgiving the combo is to small errors.',
      'Classic miss: aiming the cue ball at the first object ball’s pocket line instead of at the point ' +
        'that actually sends it into the second ball’s ghost-ball position.',
      'Use stun (sy = 0) and no side spin. Spin adds throw uncertainty on the first contact that then ' +
        'gets amplified through the second.',
    ],
    balls: [
      { id: 'cue', x: 36.27, y: 28.67 },
      { id: '4', x: 60.13, y: 24.91 },
      { id: '12', x: 80, y: 15 },
    ],
    aimSpec: { kind: 'combo', first: '4', second: '12', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.55,
  },
  {
    id: 'carom-tangent',
    name: 'Carom off the Tangent Line',
    category: 'Advanced',
    difficulty: 5,
    description:
      'Pot the object ball with a pure stun stroke (sy = 0), and the cue ball, instead of stopping, ' +
      'slides off along the tangent line (90° from the object ball’s path) and caroms into a second ' +
      'ball waiting on that exact line. This shot only works because a stun shot always departs the ' +
      'tangent line, which makes the carom’s destination fully predictable.',
    tips: [
      'The tangent line runs perpendicular to the object ball’s path through the ghost-ball contact ' +
        'point. The second ball is sitting right on it, which is why a pure stun sends the cue ball ' +
        'straight into it.',
      'Any vertical spin (follow or draw) will pull the cue ball off this line and miss the carom entirely. ' +
        'sy must stay at 0.',
      'Pocket the first ball with a clean, moderate-paced stroke; too soft and the cue ball won’t carry ' +
        'the 12–20 inches to the second ball, too hard and it may run past or scatter it wildly.',
      'This is about as clear a proof of the 90° rule as you’ll find: once you can call this carom, you ' +
        'understand the tangent line at a level most players never reach.',
    ],
    balls: [
      { id: 'cue', x: 27.09, y: 31.85 },
      { id: '5', x: 55, y: 30 },
      { id: '13', x: 59.43, y: 14.46 },
    ],
    aimSpec: { kind: 'pocket', ball: '5', pocket: 'TR' },
    spin: { sx: 0, sy: 0 },
    power: 0.5,
  },
  {
    id: 'frozen-rail',
    name: 'Frozen-to-the-Rail Cut',
    category: 'Advanced',
    difficulty: 3,
    description:
      'The object ball sits frozen against the bottom cushion. Because it’s touching the rail, the cue ' +
      'ball can only approach from above, and the object ball can only travel along or away from the rail, ' +
      'never into it. This is a common leave in real games and rewards a precise, low-nerves cut.',
    tips: [
      'Approach only from the open side. The rail blocks any contact angle that would require the object ' +
        'ball to travel toward the cushion it’s frozen to.',
      'Aim the ghost ball exactly as usual; frozen-rail shots are unusually precise because there is zero ' +
        'margin for error on the "into the rail" side of the ghost ball.',
      'Classic miss: too much follow, which can drive the cue ball into the rail right behind the object ' +
        'ball and kill your position. Keep spin modest and stun-leaning on frozen-rail shots.',
      'Because the object ball is hugging the cushion, throw is slightly reduced on that side. Aim true ' +
        'to the geometric line rather than over-compensating.',
    ],
    balls: [
      { id: 'cue', x: 60, y: 12 },
      { id: '6', x: 78, y: 1.125 },
    ],
    aimSpec: { kind: 'pocket', ball: '6', pocket: 'BR' },
    spin: { sx: 0, sy: 0 },
    power: 0.45,
  },
];

export function getShot(id: string): ShotDef | undefined {
  return SHOTS.find((s) => s.id === id);
}

/**
 * Deep-copies a ShotDef's balls into a fresh scene. No shared references with the ShotDef.
 */
export function buildScene(shotDef: ShotDef): Scene {
  return {
    balls: shotDef.balls.map((b) => ({ id: b.id, x: b.x, y: b.y, pocketed: false })),
    shot: shotDef,
    aim: {
      angleOffsetDeg: 0,
      power: shotDef.power,
      spin: { sx: shotDef.spin.sx, sy: shotDef.spin.sy },
    },
  };
}

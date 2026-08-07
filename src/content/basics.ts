// Basics library: plain instructional content for the "Learn the basics" section.
// Plain data only, no JSX. Imports nothing (self-contained, like shots.ts).

export type BasicsBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'term'; term: string; def: string };

export interface BasicsArticle {
  id: string;
  title: string;
  blurb: string;
  body: BasicsBlock[];
  /** Shot ids (from SHOTS) worth trying right after reading this article. */
  relatedShotIds?: string[];
}

export const BASICS_ARTICLES: BasicsArticle[] = [
  // ============================================================
  {
    id: 'stance-posture',
    title: 'Stance & posture',
    blurb: 'How to plant your feet and get your body behind the cue so the stroke has a stable base to work from.',
    body: [
      {
        kind: 'p',
        text:
          'Everything about a good stroke depends on a stance that does not move. If your body sways ' +
          'or shifts during the swing, the cue drifts off line no matter how good your aim was. Build ' +
          'the stance from the ground up, then check that your eyes end up over the shot line.',
      },
      { kind: 'h', text: 'Feet' },
      {
        kind: 'p',
        text:
          'Stand with your feet roughly shoulder-width apart, back foot offset behind and to the side ' +
          'of the front foot rather than square to it. For a right-handed player, the right foot sits ' +
          'back and the body angles slightly open to the shot line; the front foot points more or less ' +
          'at the target. This staggered stance gives you a stable tripod with the cue as the third leg, ' +
          'and it lets your right arm swing straight back and through without your hip getting in the way.',
      },
      { kind: 'h', text: 'Alignment over the cue' },
      {
        kind: 'p',
        text:
          'Once your feet are set, lower into the shot so your chin sits close to the cue, ideally right ' +
          'down the line of the shot. Your dominant eye should end up directly above the cue, not off to ' +
          'one side. If you are not sure which eye is dominant, point at something across the room with ' +
          'both eyes open, then close one eye at a time; the eye that keeps your finger on target is the ' +
          'dominant one, and that is the eye that should be tracking the line.',
      },
      {
        kind: 'p',
        text:
          'The cue should travel forward from your shoulder in a straight line, brushing your shirt or ' +
          'chest lightly on the way through. An elbow that drifts out to the side turns the swing into ' +
          'an arc, and that arc is where accuracy goes.',
      },
      { kind: 'h', text: 'Staying down' },
      {
        kind: 'p',
        text:
          'Keep your head and body still through contact and for a beat after the ball leaves the tip. ' +
          'Popping up early to watch the shot is one of the most common habits in the game, and it is ' +
          'also one of the most damaging: your body rises before the stroke finishes, which pulls the ' +
          'cue off line right at the moment it matters most. Practice finishing the stroke and holding ' +
          'your position for a full second before standing up, even on shots you are sure you have made.',
      },
      { kind: 'h', text: 'Common beginner mistakes' },
      {
        kind: 'list',
        items: [
          'Standing too upright, which puts your eye above the cue instead of on the line.',
          'A stance that is too narrow or too square, so the body has nothing to brace against and sways ' +
            'during the stroke.',
          'Gripping the table or bridge hand too tightly, which stiffens the swing.',
          'Rising out of the shot before the tip has finished following through.',
          'Standing so close to the cue ball that the bridge hand and grip hand crowd each other, cramping ' +
            'the swing.',
        ],
      },
    ],
    relatedShotIds: ['stop-shot'],
  },

  // ============================================================
  {
    id: 'grip-bridge',
    title: 'Grip & bridge',
    blurb: 'A loose back hand and a steady front hand: how to hold the cue and support it so the tip travels true.',
    body: [
      {
        kind: 'p',
        text:
          'The grip and the bridge do two different jobs. The grip hand swings the cue; the bridge hand ' +
          'holds it steady on a fixed line. Confusing the two, gripping tight or bridging loosely, is a ' +
          'common source of wild shots.',
      },
      { kind: 'h', text: 'The grip' },
      {
        kind: 'p',
        text:
          'Hold the butt of the cue with a loose, relaxed hand, more like holding a bird than a hammer. ' +
          'Your fingers wrap around the cue without squeezing; the wrist should hang naturally rather than ' +
          'lock. A tight grip stiffens the whole arm and turns a smooth pendulum swing into a jerky push.',
      },
      {
        kind: 'p',
        text:
          'Find your grip position by resting the cue in your hand at the point where your forearm hangs ' +
          'roughly vertical at the moment of contact. Too far back and you lose control at the moment of ' +
          'the hit; too far forward and you run out of stroke length before you reach the ball.',
      },
      { kind: 'h', text: 'Open vs closed bridge' },
      {
        kind: 'p',
        text:
          'The bridge hand rests flat on the table and forms a channel for the cue to slide through. An ' +
          'open bridge, where the cue rests in the V formed by your thumb and forefinger, is faster to set ' +
          'up and lets you see the cue clearly; it is the standard bridge for most shots. A closed bridge ' +
          'loops a finger over the top of the cue, which locks it in place more firmly and helps beginners ' +
          'who are still fighting a wandering stroke. Learn the open bridge first since it is what you will ' +
          'use most, then add the closed bridge for shots that call for extra stability, like a hard force ' +
          'follow.',
      },
      { kind: 'h', text: 'Bridging over a rail' },
      {
        kind: 'p',
        text:
          'When the cue ball sits too close to a cushion for a normal hand bridge, rest the cue directly on ' +
          'the rail instead, guiding it with your fingers spread against the wood. Keep the stroke short and ' +
          'controlled; a rail bridge gives you less feel than a hand bridge, so this is not the shot to swing ' +
          'hard on.',
      },
      { kind: 'h', text: 'Bridge distance' },
      {
        kind: 'p',
        text:
          'For most shots, place your bridge hand somewhere between 6 and 10 inches from the cue ball. ' +
          'Closer gives you more precision and is worth it on delicate position shots; farther gives the cue ' +
          'more room to build speed, which helps on shots that need real pace, like a force follow or a long ' +
          'draw. As a beginner, start closer than feels natural. A shorter bridge is far easier to keep ' +
          'steady than a long one.',
      },
    ],
  },

  // ============================================================
  {
    id: 'the-stroke',
    title: 'The stroke',
    blurb: 'A pendulum swing from the elbow, a calm backswing, and a full follow-through. The mechanics behind every shot in this app.',
    body: [
      {
        kind: 'p',
        text:
          'The stroke is a simple pendulum: the forearm swings from the elbow while the upper arm, ' +
          'shoulder, and head stay still. Everything you have set up with your stance, grip, and bridge ' +
          'exists to let that pendulum swing freely and repeat the same motion every time.',
      },
      { kind: 'h', text: 'Backswing' },
      {
        kind: 'p',
        text:
          'Draw the cue back slowly and smoothly, roughly the same distance you intend to swing forward. ' +
          'A backswing that is rushed or jerky throws off the timing of everything that follows. Think of ' +
          'the backswing as loading the pendulum, not as part of the hit; there is no need to hurry it.',
      },
      { kind: 'h', text: 'The pause' },
      {
        kind: 'p',
        text:
          'At the top of the backswing, most good strokes include a brief, still pause before the cue ' +
          'starts forward. This pause gives your body a moment to settle and confirms the stroke is about ' +
          'to travel on the line you aimed, rather than blending backswing and forward swing into one messy ' +
          'motion.',
      },
      { kind: 'h', text: 'The hit and follow-through' },
      {
        kind: 'p',
        text:
          'Accelerate smoothly through the cue ball rather than decelerating into it. The cue should keep ' +
          'moving well past the point of contact, following the ball down the intended line for several ' +
          'inches before you stop. A stroke that dies right at contact transfers less energy and gives you ' +
          'far less control over spin, because the tip is not staying on the ball long enough to grip it ' +
          'properly.',
      },
      { kind: 'h', text: 'Classic errors' },
      {
        kind: 'list',
        items: [
          'Jabbing: a short, stabbing stroke with no follow-through. It can still pot the ball but gives you ' +
            'almost no control over spin or cue-ball position afterward.',
          'Steering: guiding the cue off a straight line during the forward swing to correct a bad aim at ' +
            'the last instant. Fix the aim before the stroke starts, not during it.',
          'Jumping up: lifting your head or shoulders before the tip finishes its follow-through, which pulls ' +
            'the cue off line right at contact.',
          'Decelerating into the ball instead of through it, which weakens both power and spin.',
          'A death-grip on the backswing that tenses the whole arm and turns the pendulum into a push.',
        ],
      },
      {
        kind: 'p',
        text:
          'Grooving a clean pendulum stroke on straight, simple shots pays off everywhere else in the ' +
          'game. Every cut, bank, and spin shot in this app is the same stroke, aimed differently and ' +
          'struck at a different point on the cue ball.',
      },
    ],
    relatedShotIds: ['stop-shot', 'stun-run-through'],
  },

  // ============================================================
  {
    id: 'aiming-basics',
    title: 'Aiming basics',
    blurb: 'The ghost ball, the contact point, and how to picture the fraction of the ball you need to hit.',
    body: [
      {
        kind: 'p',
        text:
          'Pool is a game of angles, but almost every angle problem reduces to the same trick: find the ' +
          'spot where your cue ball needs to be at the instant it touches the object ball, and aim there. ' +
          'That spot is called the ghost ball.',
      },
      { kind: 'h', text: 'The ghost ball' },
      {
        kind: 'p',
        text:
          'Picture a second cue ball frozen against the object ball, sitting exactly on the line between ' +
          'the object ball and the pocket, on the far side from the pocket. If your real cue ball’s ' +
          'center travels to that spot, the collision sends the object ball straight into the pocket. ' +
          'This app draws that ghost ball as a dashed circle whenever guides are on, so you can check your ' +
          'read against the real geometry.',
      },
      { kind: 'h', text: 'The contact point' },
      {
        kind: 'p',
        text:
          'Where the ghost ball touches the object ball is the contact point, and the two balls travel ' +
          'apart along the line running through their centers at that instant. A straight-in shot has the ' +
          'ghost ball directly behind the object ball; a cut shot has it off to one side, and the sharper ' +
          'the cut, the further off to the side it sits.',
      },
      { kind: 'h', text: 'Fractional aiming' },
      {
        kind: 'p',
        text:
          'Players often describe a cut by how much of the object ball’s face the cue ball strikes: a ' +
          'full hit is dead straight, a three-quarter-ball hit is a shallow cut, a half-ball hit is the ' +
          'classic 30-degree cut, and a quarter-ball hit is a thin cut where only a sliver of the ball is ' +
          'struck. Fullness follows a clean formula: fullness equals 1 minus the sine of the cut angle. ' +
          'That is worth memorizing in rough form, since a half-ball hit at 30 degrees is the single most ' +
          'useful mental anchor in the whole system. This app’s shooter’s view shows the live cut ' +
          'angle and fullness for the shot you have set up, so you can compare what you are picturing ' +
          'against the actual numbers.',
      },
      { kind: 'h', text: 'Sighting with your dominant eye' },
      {
        kind: 'p',
        text:
          'Once you have found the ghost ball, line up your dominant eye directly over the cue and over ' +
          'the shot line before you settle into your final stance. If your dominant eye is off to one side ' +
          'of the cue, your brain will compensate by aiming slightly crooked without you noticing, and the ' +
          'miss will look mysterious even though the cause is simple.',
      },
      {
        kind: 'p',
        text:
          'The Cut Shots lessons in this app step through 15, 30, 45, and 60-degree cuts in order, each ' +
          'one thinner than the last, which is the fastest way to build the ghost-ball picture into muscle ' +
          'memory. Start there once the idea makes sense on paper.',
      },
    ],
    relatedShotIds: ['cut-15', 'cut-30'],
  },

  // ============================================================
  {
    id: 'spin-explained',
    title: 'Spin, explained simply',
    blurb: 'What follow, draw, and english actually do, and why the tip contact point is the whole story.',
    body: [
      {
        kind: 'p',
        text:
          'Every kind of spin comes from one thing: where the tip strikes the cue ball. This app’s ' +
          'spin control is exactly that: a small target on the cue ball’s face, where up means the ' +
          'follow label, down means draw, and left and right mean english on that side. Center of the face ' +
          'is a plain, spin-free hit.',
      },
      { kind: 'h', text: 'Follow and draw (vertical spin)' },
      {
        kind: 'p',
        text:
          'Strike above center and you get follow, or topspin: the cue ball keeps rolling forward after it ' +
          'hits the object ball, continuing down the object ball’s general direction instead of ' +
          'stopping. Strike below center and you get draw, or backspin: the cue ball grips the cloth and ' +
          'rolls back toward where it came from after contact. Strike dead center and you get stun: no ' +
          'vertical spin at all, so the cue ball departs along the tangent line, 90 degrees from the object ' +
          'ball’s path, and holds there until friction gradually rolls it forward.',
      },
      { kind: 'h', text: 'Left and right english (side spin)' },
      {
        kind: 'p',
        text:
          'Strike left or right of center and the cue ball spins sideways around its vertical axis. This ' +
          'does two things: it changes how the cue ball rebounds off a cushion, adding or subtracting angle ' +
          'depending on which side you strike, and it very slightly changes how the object ball departs at ' +
          'contact, an effect called throw. English is a fine-tuning tool for position play once you have ' +
          'the basics down. It is not something you need on most shots.',
      },
      { kind: 'h', text: 'Throw' },
      {
        kind: 'p',
        text:
          'Throw is the small extra push a cut shot gives the object ball beyond the pure geometric line, ' +
          'caused by friction at the contact point. It shows up most on thin cuts and grows or shrinks ' +
          'depending on which side spin you use: english on the side opposite the cut fights the throw, ' +
          'english on the same side as the cut adds to it. It is a small effect, but on a thin cut it is ' +
          'large enough to matter.',
      },
      { kind: 'h', text: 'Learn center-ball first' },
      {
        kind: 'p',
        text:
          'It is tempting to reach for spin on every shot once you know it exists, but every added spin ' +
          'moves the contact point, changes the throw, and changes how the cue ball leaves the shot. Learn ' +
          'to pot balls and control distance with a dead-center hit first. Once stun feels automatic, add ' +
          'follow and draw for position, and only bring in english once you have a specific reason for it, ' +
          'like curving off a rail or fighting throw on a precise cut.',
      },
    ],
    relatedShotIds: ['stop-shot', 'follow-shot', 'draw-shot'],
  },

  // ============================================================
  {
    id: 'equipment-chalk',
    title: 'Equipment & chalk',
    blurb: 'Cue weight, tip care, when to chalk, and the table this app simulates.',
    body: [
      {
        kind: 'p',
        text:
          'You do not need expensive gear to play well, but understanding what the gear does helps you ' +
          'get consistent results from whatever cue you pick up.',
      },
      { kind: 'h', text: 'Cue weight and length' },
      {
        kind: 'p',
        text:
          'Most cues weigh between 18 and 21 ounces; a standard cue runs about 58 inches long. A heavier ' +
          'cue carries more momentum into the ball with less swing effort, which some players like for ' +
          'power shots, while a lighter cue is easier to swing quickly and precisely on finesse shots. ' +
          'There is no single correct weight. Try a few and notice which one lets your stroke feel loose ' +
          'and repeatable rather than forced.',
      },
      { kind: 'h', text: 'Tip hardness and care' },
      {
        kind: 'p',
        text:
          'The tip is the only part of the cue that touches the ball, and its hardness changes how it ' +
          'feels at contact. A softer tip holds the ball a fraction of a second longer and is more ' +
          'forgiving on off-center hits, but wears down and mushrooms faster. A harder tip transfers energy ' +
          'more crisply and holds its shape longer, but punishes an off-center hit more sharply. Keep the ' +
          'tip shaped like a gentle dome rather than flat; a flat tip is more prone to miscuing on anything ' +
          'but a dead-center hit.',
      },
      { kind: 'h', text: 'Chalking' },
      {
        kind: 'p',
        text:
          'Chalk puts friction on the tip so it grips the cue ball at contact instead of sliding off, which ' +
          'is what causes a miscue. Chalk up every shot or two, more often on shots using heavy spin, since ' +
          'chalk wears off faster on off-center hits. Twist the cube gently onto the tip rather than ' +
          'grinding it in; a light touch coats the tip evenly, while heavy grinding wastes chalk and can ' +
          'wear the tip down unevenly.',
      },
      { kind: 'h', text: 'House cue vs your own cue' },
      {
        kind: 'p',
        text:
          'A house cue at a public table can be perfectly playable, but the tip, straightness, and weight ' +
          'vary from cue to cue, and a warped one will fight you on every stroke. Roll a house cue on the ' +
          'table before you play with it; if it wobbles, pick another. A cue you own stays consistent, which ' +
          'is worth a lot once your fundamentals are solid enough to notice the difference.',
      },
      { kind: 'h', text: 'Gloves and hand powder' },
      {
        kind: 'p',
        text:
          'Some players wear a glove on the bridge hand, or use hand powder, so the cue slides smoothly ' +
          'through the bridge instead of catching on a sweaty hand. Neither is required. Try one only if a ' +
          'sticky bridge is actually giving you trouble.',
      },
      { kind: 'h', text: 'Table size and cloth speed' },
      {
        kind: 'p',
        text:
          'This app simulates a 9-foot table, the standard size used in most serious competition; bar tables ' +
          'are commonly 7 feet, and 8-foot tables sit in between. A bigger table demands more accurate long ' +
          'shots and firmer pace on position play. Cloth speed matters too: newer, faster cloth carries a ' +
          'ball farther on the same stroke than an older, slower cloth, so the first few shots on an ' +
          'unfamiliar table are as much about calibrating your speed as anything else.',
      },
    ],
  },

  // ============================================================
  {
    id: 'etiquette-rules',
    title: 'Etiquette & rules basics',
    blurb: 'The fouls every beginner should know, how to behave at the table, and the basics of racking.',
    body: [
      {
        kind: 'p',
        text:
          'Most pool rules exist to keep the game fair when nobody is watching every shot closely. Learn ' +
          'the common fouls, and the etiquette that goes with them, before you play anywhere with other ' +
          'people.',
      },
      { kind: 'h', text: 'Common fouls' },
      {
        kind: 'list',
        items: [
          'Scratch: the cue ball falls into a pocket. Play passes to the opponent, usually with ball in ' +
            'hand (they can place the cue ball anywhere before their shot).',
          'No rail after contact: after the cue ball hits an object ball, either a ball must be pocketed or ' +
            'some ball must reach a cushion, or it is a foul.',
          'Touching a ball: nudging any ball with your hand, clothing, or the cue outside of a legal stroke ' +
            'is a foul, even if it was an accident.',
          'Wrong ball first: hitting a ball other than the one you are legally on (an opponent’s ball, ' +
            'or the wrong group in 8-ball) before your own ball is a foul.',
          'Double hit or push shot: striking the cue ball twice in one stroke, usually from being too close ' +
            'to the object ball, is a foul in most rule sets.',
        ],
      },
      { kind: 'h', text: 'Table manners' },
      {
        kind: 'p',
        text:
          'Stay out of your opponent’s eyeline and out of their way while they are down on a shot; ' +
          'wait until they have finished before moving around the table. Do not lean or sit on the rails, ' +
          'since it can throw off the cloth and cushions over time. Call your pocket clearly when the rules ' +
          'you are playing require it, and if there is a dispute about a foul or a ball’s position, ' +
          'settle it calmly before playing on rather than after the next shot has changed the table.',
      },
      { kind: 'h', text: 'Racking' },
      {
        kind: 'p',
        text:
          'Whatever the game, the rack should be as tight as you can get it: balls frozen against each ' +
          'other with no gaps, since a loose rack breaks unpredictably and unfairly. Use the triangle (or ' +
          'the diamond rack in some 9-ball rooms), press the balls together from behind, and lift the ' +
          'frame straight up without disturbing the pack.',
      },
      { kind: 'h', text: '8-ball and 9-ball differences' },
      {
        kind: 'p',
        text:
          'In 8-ball, players split into solids and stripes after the break and must pocket their whole ' +
          'group before legally shooting the 8-ball; in 9-ball, everyone shoots at whatever the lowest ' +
          'numbered ball on the table is, in order, and the game ends when the 9-ball drops legally, even on ' +
          'a combination. The fundamentals covered here, fouls, table manners, tight racking, apply the same ' +
          'way in both games; only the pocketing order changes.',
      },
    ],
  },

  // ============================================================
  {
    id: 'glossary',
    title: 'Glossary',
    blurb: 'Twenty-five terms you will hear at any pool table, defined plainly.',
    body: [
      { kind: 'term', term: 'Cue ball', def: 'The white ball you strike directly with the cue tip.' },
      { kind: 'term', term: 'Object ball', def: 'Any ball other than the cue ball that you are trying to pocket.' },
      { kind: 'term', term: 'Pocket', def: 'One of the six openings around the table that balls drop into.' },
      { kind: 'term', term: 'Rail / cushion', def: 'The cushioned edge running around the inside of the table that balls bounce off.' },
      { kind: 'term', term: 'Diamond', def: 'One of the small inlaid markers along the rails, used as reference points for aiming banks and kicks.' },
      { kind: 'term', term: 'Kitchen', def: 'The area behind the head string, where the cue ball starts on the break in many games.' },
      { kind: 'term', term: 'Break', def: 'The opening shot of a game, which scatters the racked balls.' },
      { kind: 'term', term: 'Rack', def: 'Both the triangular frame used to arrange the balls and the tight cluster of balls itself before the break.' },
      { kind: 'term', term: 'Cut shot', def: 'A shot where the cue ball strikes the object ball off-center, sending it off at an angle rather than straight ahead.' },
      { kind: 'term', term: 'Bank', def: 'A shot where the object ball is aimed off one or more cushions on its way to the pocket.' },
      { kind: 'term', term: 'Kick', def: 'A shot where the cue ball itself bounces off one or more cushions before reaching the object ball.' },
      { kind: 'term', term: 'Carom', def: 'A shot where the cue ball or an object ball glances off one ball and continues on into another.' },
      { kind: 'term', term: 'Combination', def: 'A shot where the cue ball drives one object ball into a second object ball, which is the one that pockets.' },
      { kind: 'term', term: 'English', def: 'Side spin applied by striking the cue ball left or right of center, which affects both cushion rebounds and throw.' },
      { kind: 'term', term: 'Follow', def: 'Topspin from striking above center, which keeps the cue ball rolling forward after contact.' },
      { kind: 'term', term: 'Draw', def: 'Backspin from striking below center, which pulls the cue ball back after contact.' },
      { kind: 'term', term: 'Stun', def: 'A dead-center hit with no vertical spin, sending the cue ball off along the tangent line after contact.' },
      { kind: 'term', term: 'Tangent line', def: 'The line, 90 degrees from the object ball’s departure path, that a stunned cue ball follows right after contact.' },
      { kind: 'term', term: 'Ghost ball', def: 'The imaginary position the cue ball’s center must reach at contact to send the object ball where you want it.' },
      { kind: 'term', term: 'Throw', def: 'A small extra deflection of the object ball’s path caused by friction at contact, influenced by cut angle and side spin.' },
      { kind: 'term', term: 'Squirt / deflection', def: 'Sideways cue-ball movement at the moment of the tip strike, caused by english pushing the ball slightly off the aimed line.' },
      { kind: 'term', term: 'Position play / shape', def: 'Controlling where the cue ball ends up after a shot so the next shot is easy.' },
      { kind: 'term', term: 'Safety', def: 'A defensive shot played to leave your opponent with no good option, rather than to pocket a ball yourself.' },
      { kind: 'term', term: 'Scratch', def: 'A foul where the cue ball falls into a pocket.' },
      { kind: 'term', term: 'Run out', def: 'Pocketing every ball you need, in order, without missing or giving up your turn.' },
      { kind: 'term', term: 'Miscue', def: 'A mis-hit where the tip slides off the cue ball instead of gripping it, usually from too little chalk or too extreme a spin.' },
    ],
  },

  // ============================================================
  {
    id: 'practice-path',
    title: 'From beginner to pro: a practice path',
    blurb: 'A staged roadmap through the fundamentals, mapped to the lesson categories in this app.',
    body: [
      {
        kind: 'p',
        text:
          'Pool skills stack on top of each other. Trying to learn banks before you can control a stop ' +
          'shot just means you are guessing at two things at once. Work through these stages roughly in ' +
          'order, and do not rush past one until it is boring rather than difficult.',
      },
      { kind: 'h', text: '1. Stance and stroke drills' },
      {
        kind: 'p',
        text:
          'Before worrying about potting anything, hit the cue ball dead straight into a rail and back, ' +
          'over and over, checking that your stance stays still and your stroke swings on a true line. This ' +
          'is unglamorous work, but every shot in the game inherits whatever is wrong with your stroke.',
      },
      { kind: 'h', text: '2. Stop shot mastery' },
      {
        kind: 'p',
        text:
          'Move to straight-in shots struck dead center and learn to make the cue ball stop cold at ' +
          'contact. The Fundamentals category in this app, starting with the Stop Shot lesson, is built ' +
          'exactly for this stage.',
      },
      { kind: 'h', text: '3. Cuts at growing angles' },
      {
        kind: 'p',
        text:
          'Add angle. Work through shallow cuts first and progress to thinner ones, building the ghost-ball ' +
          'picture until it is automatic rather than calculated. The Cut Shots category runs through exactly ' +
          'this progression, from a 15-degree cut up to a thin 60-degree cut.',
      },
      { kind: 'h', text: '4. Follow and draw distance control' },
      {
        kind: 'p',
        text:
          'Bring vertical spin back in, this time focused on how far the cue ball travels afterward rather ' +
          'than just making the shot. The Follow Shot and Draw Shot lessons, and the Draw for Position lesson ' +
          'in Spin & English, are the right place to drill this.',
      },
      { kind: 'h', text: '5. English and rail play' },
      {
        kind: 'p',
        text:
          'Add side spin, both for controlling how the object ball throws on a cut and for steering the cue ' +
          'ball off a cushion into a useful position. The rest of the Spin & English category covers both ' +
          'sides of this.',
      },
      { kind: 'h', text: '6. Banks and kicks' },
      {
        kind: 'p',
        text:
          'Once straight shots, cuts, and spin are solid, learn the mirror system and apply it to shots that ' +
          'bounce the object ball off a rail, then to shots where the cue ball itself has to bank first. The ' +
          'Bank Shots and Kick Shots categories cover this in increasing distance and difficulty.',
      },
      { kind: 'h', text: '7. Position play and patterns' },
      {
        kind: 'p',
        text:
          'Start thinking a shot or two ahead: where the object ball goes, and where the cue ball ends up ' +
          'for the next one. The Advanced category, including the combination and tangent-line carom ' +
          'lessons, starts asking you to plan more than one ball at a time.',
      },
      { kind: 'h', text: '8. Competitive play' },
      {
        kind: 'p',
        text:
          'Bring everything together under real conditions: a full rack, an opponent, safeties, and the ' +
          'pressure of a shot that actually matters. At this stage the drills stop being separate skills and ' +
          'start being one continuous read of the table.',
      },
    ],
    relatedShotIds: [
      'stop-shot',
      'cut-15',
      'draw-position',
      'outside-english-cut',
      'bank-cross-side',
      'kick-one-rail',
      'combo-basic',
    ],
  },
];

export function getBasicsArticle(id: string): BasicsArticle | undefined {
  return BASICS_ARTICLES.find((a) => a.id === id);
}

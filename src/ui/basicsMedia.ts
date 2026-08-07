// Hero images for the Basics articles. All files live in the repo (no
// hotlinking) and come from Wikimedia Commons under licenses that allow
// redistribution with attribution; the credit line for each image is
// rendered under it and links back to the Commons file page.

import stanceImg from '../assets/basics/stance.jpg';
import bridgeImg from '../assets/basics/bridge.jpg';
import strokeImg from '../assets/basics/stroke.jpg';
import aimingImg from '../assets/basics/aiming.png';
import spinImg from '../assets/basics/spin.jpg';
import equipmentImg from '../assets/basics/equipment.jpg';
import etiquetteImg from '../assets/basics/etiquette.jpg';
import glossaryImg from '../assets/basics/glossary.png';
import practiceImg from '../assets/basics/practice.jpg';

export interface BasicsHero {
  src: string;
  alt: string;
  /** Attribution line: author · license · source. */
  credit: string;
  /** Link to the source file page (license details live there). */
  href: string;
  /** Diagrams on white need a light backing plate in the dark theme. */
  light?: boolean;
}

export const BASICS_HEROES: Record<string, BasicsHero> = {
  'stance-posture': {
    src: stanceImg,
    alt: 'A professional player down on the shot: chin over the cue, back leg straight, eyes level',
    credit: 'Christian Werner · CC BY 3.0 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:MC2008_M10_015_-_Shane_van_Boening.JPG',
  },
  'grip-bridge': {
    src: bridgeImg,
    alt: 'A stable bridge hand guides the cue while the player sights down the line',
    credit: 'Evdcoldeportes · CC BY-SA 2.5 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:EVD-billar-378.jpg',
  },
  'the-stroke': {
    src: strokeImg,
    alt: 'Head-on view of a straight cue delivery, tip finishing at the cue ball',
    credit: 'Christian Werner · CC BY 3.0 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:MC2008_M11_029_-_Jeremy_Jones.JPG',
  },
  'aiming-basics': {
    src: aimingImg,
    alt: "The half-ball hit: aiming the cue ball's center at the object ball's edge sends it off at about 30 degrees",
    credit: 'Yoimjamie (English Wikipedia) · public domain · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:Billiards_half-ball_striking_diagram.png',
    light: true,
  },
  'spin-explained': {
    src: spinImg,
    alt: 'The cue tip meets the cue ball; chalk marks show where earlier tip strikes landed',
    credit: 'MichaelMaggs · CC BY-SA 3.0 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:To_pot_the_red.jpg',
  },
  'equipment-chalk': {
    src: equipmentImg,
    alt: 'Chalking the tip: a light brush leaves an even coat that grips the cue ball',
    credit: 'Fcb981 · CC BY-SA 3.0 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:Billiard_Chalk_and_Cue.jpg',
  },
  'etiquette-rules': {
    src: etiquetteImg,
    alt: 'A billiard room around 1810: the game has always come with house manners',
    credit: 'Artist unknown · public domain · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:Studenten_Billard.JPG',
  },
  glossary: {
    src: glossaryImg,
    alt: "A pool table's named landmarks: the kitchen, head string, and the three spots",
    credit: 'CC BY-SA 3.0 · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:American_pool_table-diagram.png',
    light: true,
  },
  'practice-path': {
    src: practiceImg,
    alt: 'A time-lapse of the break: every drill on this path ends up in this moment',
    credit: 'Jollytime (English Wikipedia) · public domain · Wikimedia Commons',
    href: 'https://commons.wikimedia.org/wiki/File:8_ball_break_time_lapse.jpg',
  },
};

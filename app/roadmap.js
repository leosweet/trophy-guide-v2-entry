// The roadmap to the platinum: five stages in the order to play them,
// built from the trophies' own stage field in trophies.json.
export const STAGES = [
  {
    n: 1,
    title: 'Stage 1 — Play the story (60–80 hours)',
    text: 'Finish all five chapters. Do the Chapter 1 balcony meditation for Positive Mental Attitude before Chapter 1 ends — it is the only missable step in the whole game. Scan vehicles and study animals with binoculars as you go; both count toward 100% later.',
  },
  {
    n: 2,
    title: 'Stage 2 — Side characters & strangers',
    text: 'Work through the questlines for Andy, Kenton, Billy, Randy, Tyrone and Bret, plus Cal’s fishing line and 8 Strangers & Freaks strands. All of them stay available after the story, so there is no rush — but their missions unlock features (Key Cloner, Snap Gun, bank vaults) that the later stages need.',
  },
  {
    n: 3,
    title: 'Stage 3 — Partner stunts & free-roam firsts',
    text: 'Once both characters are together, do the partner trophies (Hot Together, Retail Therapy), the one-off stunts (tank, plane, Combat Focus, jewelry stealth) and the gym grind for Personal Best. Most of these take under an hour each.',
  },
  {
    n: 4,
    title: 'Stage 4 — Collectibles & counts',
    text: 'Meditations, card sets, WAiNK scans, vehicles, stunts, shooting ranges, drone races and exploration. These are the long grinds — chip away at them between story beats, or clear them in one pass after the credits.',
  },
  {
    n: 5,
    title: 'Stage 5 — Money, challenges & 100%',
    text: 'Bank vaults, marked-bill laundering, garages, vehicle registrations and the last challenges. Finish the 100% checklist (A Long Road), clean up anything left, and the platinum pops.',
  },
];

export function stageTrophies(trophies, stage) {
  return trophies
    .filter((t) => t.stage === stage)
    .sort((a, b) => a.id - b.id);
}

export function renderRoadmap(container, trophies, earned, onOpen) {
  container.replaceChildren();
  for (const stage of STAGES) {
    const box = document.createElement('div');
    box.className = 'stage';
    const head = document.createElement('h3');
    head.textContent = stage.title;
    const text = document.createElement('p');
    text.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-chips';
    for (const t of stageTrophies(trophies, stage.n)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'stage-chip' + (earned.has(t.name) ? ' done' : '');
      chip.textContent = (earned.has(t.name) ? '✓ ' : '') + t.name;
      chip.addEventListener('click', () => onOpen(t.id));
      chips.append(chip);
    }
    box.append(head, text, chips);
    container.append(box);
  }
}

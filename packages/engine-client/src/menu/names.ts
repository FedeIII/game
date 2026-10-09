import { NAME_MAX, type Gender, type Race } from '@game/engine';

/**
 * Random names for the character builder ("Random name"): the example names of each race in the
 * SRD 5.1 (CC-BY-4.0), and a family name when it fits in NAME_MAX characters. A half-elf takes a
 * human or an elven name; an undetermined gender takes from both lists.
 */
interface NameList {
  readonly male: readonly string[];
  readonly female: readonly string[];
  readonly family: readonly string[];
}

const HUMAN: NameList = {
  male: ['Ander', 'Bran', 'Darvin', 'Dorn', 'Evendur', 'Geth', 'Gorstag', 'Grim', 'Helm', 'Malark', 'Morn', 'Randal', 'Stedd', 'Taman', 'Urth'],
  female: ['Arveene', 'Betha', 'Esvele', 'Jhessail', 'Kerri', 'Lureene', 'Mara', 'Miri', 'Natali', 'Rowan', 'Shandri', 'Tessele', 'Thola'],
  family: ['Amblecrown', 'Brightwood', 'Dundragon', 'Evenwood', 'Greycastle', 'Helder', 'Hornraven', 'Marivaldi', 'Stormwind', 'Tallstag'],
};
const ELF: NameList = {
  male: ['Adran', 'Aelar', 'Berrian', 'Carric', 'Erevan', 'Galinndan', 'Ivellios', 'Peren', 'Riardon', 'Soveliss', 'Thamior', 'Varis'],
  female: ['Adrie', 'Althaea', 'Birel', 'Caelynn', 'Enna', 'Keyleth', 'Lia', 'Naivara', 'Sariel', 'Shava', 'Silaqui', 'Valanthe'],
  family: ['Amakiir', 'Amastacia', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Siannodel', 'Xiloscient'],
};

const NAMES: Readonly<Record<Exclude<Race, 'half-elf'>, NameList>> = {
  human: HUMAN,
  elf: ELF,
  dwarf: {
    male: ['Adrik', 'Baern', 'Bruenor', 'Dain', 'Eberk', 'Harbek', 'Kildrak', 'Orsik', 'Rurik', 'Taklinn', 'Thorin', 'Vondal'],
    female: ['Amber', 'Artin', 'Bardryn', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Riswynn', 'Torbera', 'Vistra'],
    family: ['Balderk', 'Battlehammer', 'Fireforge', 'Gorunn', 'Ironfist', 'Loderr', 'Rumnaheim', 'Strakeln', 'Torunn'],
  },
  gnome: {
    male: ['Alston', 'Boddynock', 'Brocc', 'Dimble', 'Eldon', 'Fonkin', 'Gimble', 'Glim', 'Orryn', 'Roondar', 'Seebo', 'Zook'],
    female: ['Bimpnottin', 'Breena', 'Carlin', 'Donella', 'Ellyjobell', 'Lilli', 'Nissa', 'Nyx', 'Orla', 'Roywyn', 'Tana', 'Zanna'],
    family: ['Beren', 'Daergel', 'Folkor', 'Garrick', 'Nackle', 'Murnig', 'Ningel', 'Raulnor', 'Scheppen', 'Turen'],
  },
  halfling: {
    male: ['Alton', 'Cade', 'Errich', 'Finnan', 'Garret', 'Lindal', 'Lyle', 'Merric', 'Milo', 'Osborn', 'Perrin', 'Reed', 'Roscoe', 'Wellby'],
    female: ['Andry', 'Bree', 'Callie', 'Cora', 'Jillian', 'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Shaena', 'Vani'],
    family: ['Brushgather', 'Goodbarrel', 'Greenbottle', 'Highhill', 'Hilltopple', 'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough'],
  },
  'half-orc': {
    male: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren', 'Ront', 'Shump', 'Thokk'],
    female: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Ownka', 'Shautha', 'Sutha', 'Vola', 'Volen', 'Yevelda'],
    family: [],
  },
};

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)]!;

/** A random name for a race and a gender: a first name, and a family name when it fits. */
export function randomName(race: Race, gender: Gender, random: () => number = Math.random): string {
  const list = race === 'half-elf' ? (random() < 0.5 ? HUMAN : ELF) : NAMES[race];
  const firsts = gender === 'male' ? list.male : gender === 'female' ? list.female : [...list.male, ...list.female];
  const first = pick(firsts, random);
  if (list.family.length === 0 || random() < 0.4) return first;
  const full = `${first} ${pick(list.family, random)}`;
  return full.length <= NAME_MAX ? full : first;
}

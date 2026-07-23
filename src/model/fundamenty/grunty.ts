export interface RodzajGruntu {
  id: string;
  nazwa: string;
  /** Orientacyjna dopuszczalna nośność (nacisk) [kPa]. */
  nosnosc: number;
}

/** Orientacyjne nośności gruntów rodzimych (wartości poglądowe, nie z badań geotechnicznych). */
export const GRUNTY: RodzajGruntu[] = [
  { id: 'skala', nazwa: 'Skała / grunt bardzo nośny', nosnosc: 400 },
  { id: 'zwir', nazwa: 'Żwir, pospółka zagęszczona', nosnosc: 300 },
  { id: 'piasek', nazwa: 'Piasek średni/gruby, zagęszczony', nosnosc: 200 },
  { id: 'glina-tw', nazwa: 'Glina twardoplastyczna', nosnosc: 150 },
  { id: 'glina-pl', nazwa: 'Glina plastyczna, grunt słaby', nosnosc: 100 },
  { id: 'nasyp', nazwa: 'Nasyp / grunt bardzo słaby', nosnosc: 75 },
];

export const znajdzGrunt = (nosnosc: number): RodzajGruntu | undefined =>
  GRUNTY.find((g) => g.nosnosc === nosnosc);

// src/utils/translate-note.ts
// Dictionnaire de traduction EN → FR pour les notes de parfum et accords.
// ⚠️  Traduit à l'affichage uniquement — NE PAS utiliser au stockage.
// Le fallback retourne la note originale si non trouvée.

// ─── NOTES (ingrédients olfactifs) ──────────────────────────

const NOTE_DICT: Record<string, string> = {
  // Agrumes
  "bergamot": "bergamote",
  "lemon": "citron",
  "grapefruit": "pamplemousse",
  "mandarin orange": "mandarine",
  "orange": "orange",
  "bitter orange": "orange amère",
  "lime": "citron vert",
  "citruses": "agrumes",
  "citrus": "agrumes",
  "yuzu": "yuzu",
  "petitgrain": "petitgrain",

  // Fruits
  "apple": "pomme",
  "pear": "poire",
  "peach": "pêche",
  "blackberry": "mûre",
  "black currant": "cassis",
  "cassis": "cassis",
  "raspberry": "framboise",
  "pineapple": "ananas",
  "plum": "prune",
  "damask plum": "prune de Damas",
  "litchi": "litchi",
  "cherry": "cerise",
  "coconut": "noix de coco",
  "melon": "melon",
  "boysenberry": "mûre de Boysen",
  "red berries": "fruits rouges",
  "watermelon": "pastèque",
  "fig": "figue",

  // Épicés
  "pink pepper": "poivre rose",
  "black pepper": "poivre noir",
  "saffron": "safran",
  "cardamom": "cardamome",
  "cinnamon": "cannelle",
  "cloves": "clou de girofle",
  "nutmeg": "noix de muscade",
  "ginger": "gingembre",
  "caraway": "carvi",
  "coriander": "coriandre",
  "curry tree": "kaloupilé",
  "basil": "basilic",
  "thyme": "thym",
  "sage": "sauge",
  "clary sage": "sauge sclarée",
  "rosemary": "romarin",
  "tarragon": "estragon",

  // Floraux
  "rose": "rose",
  "bulgarian rose": "rose de Bulgarie",
  "turkish rose": "rose de Turquie",
  "jasmine": "jasmin",
  "lavender": "lavande",
  "iris": "iris",
  "white iris": "iris blanc",
  "violet": "violette",
  "tuberose": "tubéreuse",
  "gardenia": "gardénia",
  "ylang-ylang": "ylang-ylang",
  "neroli": "néroli",
  "orange blossom": "fleur d'oranger",
  "magnolia": "magnolia",
  "peony": "pivoine",
  "muguet": "muguet",
  "lily of the valley": "muguet",
  "lily": "lys",
  "water lily": "nénuphar",
  "freesia": "freesia",
  "hyacinth": "jacinthe",
  "narcissus": "narcisse",
  "orchid": "orchidée",
  "geranium": "géranium",
  "heliotrope": "héliotrope",
  "mimosa": "mimosa",
  "osmanthus": "osmanthus",
  "chamomile": "camomille",
  "honeysuckle": "chèvrefeuille",
  "floral notes": "notes florales",

  // Boisés
  "cedar": "cèdre",
  "sandalwood": "bois de santal",
  "vetiver": "vétiver",
  "patchouli": "patchouli",
  "oakmoss": "mousse de chêne",
  "guaiac wood": "bois de gaïac",
  "cypress": "cyprès",
  "pine": "pin",
  "fir": "sapin",
  "birch": "bouleau",
  "ebony": "ébène",
  "cashmere wood": "bois de cachemire",
  "amberwood": "bois d'ambre",
  "oud": "oud",
  "agarwood": "bois d'agar",

  // Résines & Baumes
  "amber": "ambre",
  "incense": "encens",
  "frankincense": "oliban",
  "myrrh": "myrrhe",
  "benzoin": "benjoin",
  "labdanum": "labdanum",
  "tolu balsam": "baume de Tolu",
  "balsamic notes": "notes balsamiques",
  "resins": "résines",
  "opoponax": "opoponax",
  "elemi": "élémi",
  "styrax": "styrax",

  // Muscs & Cuir
  "musk": "musc",
  "white musk": "musc blanc",
  "ambrette (musk mallow)": "ambrette",
  "ambrette": "ambrette",
  "castoreum": "castoréum",
  "civet": "civette",
  "civetta": "civette",
  "leather": "cuir",
  "suede": "daïm",

  // Verts & Aquatiques
  "green notes": "notes vertes",
  "water notes": "notes aquatiques",
  "marine notes": "notes marines",
  "sea salt": "sel marin",
  "grass": "herbe coupée",
  "galbanum": "galbanum",
  "artemisia": "armoise",
  "wormwood": "absinthe",
  "ivy": "lierre",
  "moss": "mousse",
  "oak": "chêne",
  "tea": "thé",
  "green tea": "thé vert",
  "mate": "maté",
  "verbena": "verveine",
  "angelica": "angélique",
  "papyrus": "papyrus",

  // Gourmands
  "vanilla": "vanille",
  "tonka bean": "fève tonka",
  "caramel": "caramel",
  "chocolate": "chocolat",
  "cocoa": "cacao",
  "honey": "miel",
  "almond": "amande",
  "praline": "praliné",
  "coffee": "café",
  "chestnut": "marron",
  "marshmallow": "guimauve",
  "cotton candy": "barbe à papa",
  "sugar": "sucre",
  "lactonic": "lacté",
  "milk": "lait",

  // Synthétiques
  "ambroxan": "ambroxan",
  "iso e super": "iso e super",
  "hedione": "hédione",
  "cashmeran": "cashmeran",
  "norlimbanol": "norlimbanol",
  "sylkolide": "sylkolide",
  "mahonial": "mahonial",
  "pomarose": "pomarose",
  "belambra tree": "belambra",
  "calone": "calone",

  // Alcooliques & Tabac
  "cannabis": "cannabis",
  "rum": "rhum",
  "whiskey": "whisky",
  "gin": "gin",
  "cognac": "cognac",
  "tobacco": "tabac",
  "smoke": "fumée",

  // Divers
  "powder": "poudré",
  "aldehydes": "aldéhydes",
  "ozonic": "ozoné",
  "mineral": "minéral",
  "earthy notes": "notes terreuses",
  "spices": "épices",
  "woods": "bois",
  "acacia": "acacia",
  "melon or sweet clover": "mélilot",
};

// ─── ACCORDS (familles olfactives) ──────────────────────────

const ACCORD_DICT: Record<string, string> = {
  "citrus": "agrumes",
  "woody": "boisé",
  "floral": "floral",
  "white floral": "floral blanc",
  "yellow floral": "floral jaune",
  "rose": "rosé",
  "aromatic": "aromatique",
  "fresh spicy": "épicé frais",
  "warm spicy": "épicé chaud",
  "soft spicy": "épicé doux",
  "amber": "ambré",
  "musky": "musqué",
  "powdery": "poudré",
  "sweet": "sucré",
  "fruity": "fruité",
  "green": "vert",
  "fresh": "frais",
  "aquatic": "aquatique",
  "balsamic": "balsamique",
  "smoky": "fumé",
  "earthy": "terreux",
  "leather": "cuir",
  "animalic": "animal",
  "camphor": "camphré",
  "cannabis": "cannabis",
  "gourmand": "gourmand",
  "herbal": "herbacé",
  "iris": "iris",
  "lavender": "lavande",
  "patchouli": "patchouli",
  "violet": "violette",
};

// ─── Dictionnaire fusionné ──────────────────────────────────

const FULL_DICT: Record<string, string> = { ...ACCORD_DICT, ...NOTE_DICT };

// ─── Fonction publique ──────────────────────────────────────

/** Traduit une note ou un accord EN → FR. Fallback : retourne la valeur originale. */
export function translateNote(note: string): string {
  if (!note) return note;
  const key = note.toLowerCase().trim();
  return FULL_DICT[key] ?? note;
}

import BladeMaster from "../pages/BladeMaster";
import SliceStorm from "./SliceStorm/Game";
import { NutCraft } from "./NutCraft";
import { BowlExa } from "./BowlExa";
import { BlockCrush } from "./BlockCrush";
import { CosmoWarrior } from "./CosmoWarrior";
import { ToiletTactics } from "./ToiletTactics";
import { WordHunt } from "./WordHunt";
import { BubbleBlast } from "./BubbleBlast";
import { MergeMaster } from "./MergeMaster";
import { Wormzy } from "./Wormzy";
import { AquaFill } from "./AquaFill";
import { RealmClash } from "./RealmClash";

export const GAME_COMPONENTS = {
  "blade-master": (props) => <BladeMaster embedded autoStart {...props} />,
  "nut-craft": NutCraft,
  "bowlexa": BowlExa,
  "block-crush": BlockCrush,
  "slice-storm": SliceStorm,
  "cosmo-warrior": CosmoWarrior,
  "toilet-tactics": ToiletTactics,
  "word-hunt": WordHunt,
  "bubble-blast": BubbleBlast,
  "merge-master": MergeMaster,
  "wormzy": Wormzy,
  "aqua-fill": AquaFill,
  "realm-clash": RealmClash,
};

export const rewardFor = (slug, score) => {
  const table = {
    "blade-master": Math.min(20, Math.max(5, Math.floor(score / 80))),
    "slice-storm":  Math.min(12, Math.max(3, Math.floor(score / 40) + 5)),
  };
  if (table[slug] !== undefined) return table[slug];
  return Math.min(20, Math.max(4, Math.floor(score / 50) + 4));
};

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Clock01Icon,
  ChampionIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Location01Icon,
  UserGroupIcon,
  Search01Icon,
  Settings02Icon,
  Tv01Icon,
  TemperatureIcon,
  CloudIcon,
  WhistleIcon,
  FootballIcon,
  FilterIcon,
  AppleIcon,
  PlayStoreIcon,
  Shield01Icon,
  Note03Icon,
  Analytics01Icon,
  Idea01Icon,
  StarIcon,
  Tick02Icon,
  Cancel01Icon,
  PlusSignIcon,
  MinusSignIcon,
  FloppyDiskIcon,
  RefreshIcon,
  FlashIcon,
  Maximize01Icon,
  Minimize01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Login03Icon,
  Logout03Icon,
  DiscordIcon,
  InstagramIcon,
  WhatsappIcon,
  UserCircleIcon,
  User03Icon,
} from "@hugeicons/core-free-icons";

// Central icon registry. Every icon in the app resolves through here so the
// underlying set (Hugeicons free) can be swapped in one place.
const registry = {
  calendar: Calendar03Icon,
  clock: Clock01Icon,
  history: Clock01Icon,
  trophy: ChampionIcon,
  chevronUp: ArrowUp01Icon,
  chevronDown: ArrowDown01Icon,
  chevronLeft: ArrowLeft01Icon,
  chevronRight: ArrowRight01Icon,
  location: Location01Icon,
  users: UserGroupIcon,
  search: Search01Icon,
  settings: Settings02Icon,
  tv: Tv01Icon,
  temperature: TemperatureIcon,
  cloud: CloudIcon,
  whistle: WhistleIcon,
  football: FootballIcon,
  filter: FilterIcon,
  apple: AppleIcon,
  playstore: PlayStoreIcon,
  shield: Shield01Icon,
  note: Note03Icon,
  insights: Analytics01Icon,
  idea: Idea01Icon,
  star: StarIcon,
  check: Tick02Icon,
  close: Cancel01Icon,
  plus: PlusSignIcon,
  minus: MinusSignIcon,
  save: FloppyDiskIcon,
  refresh: RefreshIcon,
  flash: FlashIcon,
  maximize: Maximize01Icon,
  minimize: Minimize01Icon,
  edit: PencilEdit01Icon,
  delete: Delete02Icon,
  login: Login03Icon,
  logout: Logout03Icon,
  discord: DiscordIcon,
  instagram: InstagramIcon,
  whatsapp: WhatsappIcon,
  profile: UserCircleIcon,
  player: User03Icon,
} as const;

export type IconName = keyof typeof registry;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <HugeiconsIcon
      icon={registry[name]}
      size={size}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
}

// Drop-in wrappers that mirror the previous lucide-react API (className-driven
// sizing) so existing call sites only need their import path changed.
type IconProps = { className?: string };
const wrap = (name: IconName) =>
  function WrappedIcon({ className }: IconProps) {
    return <Icon name={name} size={18} strokeWidth={2} className={className} />;
  };

export const Check = wrap("check");
export const CheckIcon = wrap("check");
export const XIcon = wrap("close");
export const Save = wrap("save");
export const Users = wrap("users");
export const Clock3 = wrap("clock");
export const Maximize2 = wrap("maximize");
export const Minimize2 = wrap("minimize");
export const Minus = wrap("minus");
export const Plus = wrap("plus");
export const RotateCcw = wrap("refresh");
export const Zap = wrap("flash");
export const Pencil = wrap("edit");
export const Trash2 = wrap("delete");
export const Search = wrap("search");
export const ChevronDownIcon = wrap("chevronDown");
export const ChevronUpIcon = wrap("chevronUp");

/**
 * Design-system icon component — the single chokepoint for all iconography.
 *
 * Usage:
 *   import { Icon } from '@/components/ui/icon';
 *   <Icon name="check" className="h-4 w-4" />
 *   <Icon name="spinner" className="h-4 w-4 animate-spin" />
 *   <Icon name="star" weight="fill" className="h-4 w-4" />   // filled state via weight
 *
 * Why it's built this way:
 *   - Backed by Phosphor (https://phosphoricons.com). Every glyph is imported via
 *     its deep `/dist/ssr/<Name>` path so the 9k-module barrel is never pulled and
 *     dev compile times stay fast. The only barrel reference is a TYPE import, which
 *     is erased at build time.
 *   - The `/ssr` (context-free) variant means this stays a plain, server-compatible
 *     component — no `'use client'` boundary is forced on consumers.
 *   - Default weight is `regular` (Phosphor's canonical look). Override per-icon with
 *     the `weight` prop. For previously "filled" Lucide icons, pass `weight="fill"`.
 *   - Sizing/color stay in `className` (e.g. `h-4 w-4 text-muted-foreground`); Tailwind
 *     width/height override the SVG's intrinsic size and `currentColor` inherits text color.
 *
 * To add an icon: find it on phosphoricons.com, add a deep import + a map entry.
 * To swap icon libraries ever again: change this one file.
 */
import type { IconProps } from '@phosphor-icons/react';

import { ArrowClockwise } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowLineDown } from '@phosphor-icons/react/dist/ssr/ArrowLineDown';
import { ArrowLineUp } from '@phosphor-icons/react/dist/ssr/ArrowLineUp';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { ArrowsLeftRight } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { Aperture } from '@phosphor-icons/react/dist/ssr/Aperture';
import { Bell } from '@phosphor-icons/react/dist/ssr/Bell';
import { Books } from '@phosphor-icons/react/dist/ssr/Books';
import { Brain } from '@phosphor-icons/react/dist/ssr/Brain';
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { Camera } from '@phosphor-icons/react/dist/ssr/Camera';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretLeft } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CaretUp } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { ChatCentered } from '@phosphor-icons/react/dist/ssr/ChatCentered';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Checks } from '@phosphor-icons/react/dist/ssr/Checks';
import { Circle } from '@phosphor-icons/react/dist/ssr/Circle';
import { ClipboardText } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Clock } from '@phosphor-icons/react/dist/ssr/Clock';
import { Code } from '@phosphor-icons/react/dist/ssr/Code';
import { Coins } from '@phosphor-icons/react/dist/ssr/Coins';
import { Copy } from '@phosphor-icons/react/dist/ssr/Copy';
import { CornersOut } from '@phosphor-icons/react/dist/ssr/CornersOut';
import { Crosshair } from '@phosphor-icons/react/dist/ssr/Crosshair';
import { Crown } from '@phosphor-icons/react/dist/ssr/Crown';
import { CircleNotch } from '@phosphor-icons/react/dist/ssr/CircleNotch';
import { Cursor } from '@phosphor-icons/react/dist/ssr/Cursor';
import { DoorOpen } from '@phosphor-icons/react/dist/ssr/DoorOpen';
import { DotsSixVertical } from '@phosphor-icons/react/dist/ssr/DotsSixVertical';
import { DotsThreeVertical } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { Eye } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { FileCode } from '@phosphor-icons/react/dist/ssr/FileCode';
import { FileText } from '@phosphor-icons/react/dist/ssr/FileText';
import { FloppyDisk } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { Folder } from '@phosphor-icons/react/dist/ssr/Folder';
import { Gear } from '@phosphor-icons/react/dist/ssr/Gear';
import { GitBranch } from '@phosphor-icons/react/dist/ssr/GitBranch';
import { GitMerge } from '@phosphor-icons/react/dist/ssr/GitMerge';
import { Hand } from '@phosphor-icons/react/dist/ssr/Hand';
import { Heart } from '@phosphor-icons/react/dist/ssr/Heart';
import { Image } from '@phosphor-icons/react/dist/ssr/Image';
import { ImageSquare } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { Info } from '@phosphor-icons/react/dist/ssr/Info';
import { Layout } from '@phosphor-icons/react/dist/ssr/Layout';
import { Lightbulb } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { Lightning } from '@phosphor-icons/react/dist/ssr/Lightning';
import { Link } from '@phosphor-icons/react/dist/ssr/Link';
import { LinkBreak } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { List } from '@phosphor-icons/react/dist/ssr/List';
import { ListChecks } from '@phosphor-icons/react/dist/ssr/ListChecks';
import { ListNumbers } from '@phosphor-icons/react/dist/ssr/ListNumbers';
import { Lock } from '@phosphor-icons/react/dist/ssr/Lock';
import { MagicWand } from '@phosphor-icons/react/dist/ssr/MagicWand';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapTrifold } from '@phosphor-icons/react/dist/ssr/MapTrifold';
import { Minus } from '@phosphor-icons/react/dist/ssr/Minus';
import { Monitor } from '@phosphor-icons/react/dist/ssr/Monitor';
import { Moon } from '@phosphor-icons/react/dist/ssr/Moon';
import { Palette } from '@phosphor-icons/react/dist/ssr/Palette';
import { PaperPlaneTilt } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Pause } from '@phosphor-icons/react/dist/ssr/Pause';
import { Pencil } from '@phosphor-icons/react/dist/ssr/Pencil';
import { PencilSimpleLine } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { Play } from '@phosphor-icons/react/dist/ssr/Play';
import { Plus } from '@phosphor-icons/react/dist/ssr/Plus';
import { PlusCircle } from '@phosphor-icons/react/dist/ssr/PlusCircle';
import { Presentation } from '@phosphor-icons/react/dist/ssr/Presentation';
import { Printer } from '@phosphor-icons/react/dist/ssr/Printer';
import { Pulse } from '@phosphor-icons/react/dist/ssr/Pulse';
import { RadioButton } from '@phosphor-icons/react/dist/ssr/RadioButton';
import { Rocket } from '@phosphor-icons/react/dist/ssr/Rocket';
import { Shield } from '@phosphor-icons/react/dist/ssr/Shield';
import { ShareNetwork } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { SidebarSimple } from '@phosphor-icons/react/dist/ssr/SidebarSimple';
import { SignOut } from '@phosphor-icons/react/dist/ssr/SignOut';
import { SkipForward } from '@phosphor-icons/react/dist/ssr/SkipForward';
import { Smiley } from '@phosphor-icons/react/dist/ssr/Smiley';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Square } from '@phosphor-icons/react/dist/ssr/Square';
import { SquaresFour } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Stack } from '@phosphor-icons/react/dist/ssr/Stack';
import { Star } from '@phosphor-icons/react/dist/ssr/Star';
import { Sun } from '@phosphor-icons/react/dist/ssr/Sun';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { ThumbsUp } from '@phosphor-icons/react/dist/ssr/ThumbsUp';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';
import { Trash } from '@phosphor-icons/react/dist/ssr/Trash';
import { TreeStructure } from '@phosphor-icons/react/dist/ssr/TreeStructure';
import { TrendUp } from '@phosphor-icons/react/dist/ssr/TrendUp';
import { UploadSimple } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { User } from '@phosphor-icons/react/dist/ssr/User';
import { UserCircle } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { UserPlus } from '@phosphor-icons/react/dist/ssr/UserPlus';
import { UserSquare } from '@phosphor-icons/react/dist/ssr/UserSquare';
import { Users } from '@phosphor-icons/react/dist/ssr/Users';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import { XCircle } from '@phosphor-icons/react/dist/ssr/XCircle';
import { BookOpen } from '@phosphor-icons/react/dist/ssr/BookOpen';
import { Table } from '@phosphor-icons/react/dist/ssr/Table';
import { Swap } from '@phosphor-icons/react/dist/ssr/Swap';
import { Tag } from '@phosphor-icons/react/dist/ssr/Tag';
import { Prohibit } from '@phosphor-icons/react/dist/ssr/Prohibit';
import { ChatCenteredSlash } from '@phosphor-icons/react/dist/ssr/ChatCenteredSlash';
import { Question } from '@phosphor-icons/react/dist/ssr/Question';
import { Briefcase } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Flag } from '@phosphor-icons/react/dist/ssr/Flag';
import { CursorClick } from '@phosphor-icons/react/dist/ssr/CursorClick';
import { Package } from '@phosphor-icons/react/dist/ssr/Package';
import { Path } from '@phosphor-icons/react/dist/ssr/Path';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { Highlighter } from '@phosphor-icons/react/dist/ssr/Highlighter';
import { TextT } from '@phosphor-icons/react/dist/ssr/TextT';
import { Eraser } from '@phosphor-icons/react/dist/ssr/Eraser';
import { Diamond } from '@phosphor-icons/react/dist/ssr/Diamond';
import { ChatCircle } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { Stamp } from '@phosphor-icons/react/dist/ssr/Stamp';
import { PersonSimple } from '@phosphor-icons/react/dist/ssr/PersonSimple';
import { DeviceMobile } from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import { Car } from '@phosphor-icons/react/dist/ssr/Car';
import { AppWindow } from '@phosphor-icons/react/dist/ssr/AppWindow';
import { Chats } from '@phosphor-icons/react/dist/ssr/Chats';
import { TextAlignLeft } from '@phosphor-icons/react/dist/ssr/TextAlignLeft';
import { TextAlignCenter } from '@phosphor-icons/react/dist/ssr/TextAlignCenter';
import { TextAlignRight } from '@phosphor-icons/react/dist/ssr/TextAlignRight';
import { Quotes } from '@phosphor-icons/react/dist/ssr/Quotes';
import { ChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { DotsSix } from '@phosphor-icons/react/dist/ssr/DotsSix';
import { Paperclip } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { Cloud } from '@phosphor-icons/react/dist/ssr/Cloud';
import { Database } from '@phosphor-icons/react/dist/ssr/Database';
import { Globe } from '@phosphor-icons/react/dist/ssr/Globe';
import { CreditCard } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Translate } from '@phosphor-icons/react/dist/ssr/Translate';
import { Wrench } from '@phosphor-icons/react/dist/ssr/Wrench';
import { Shuffle } from '@phosphor-icons/react/dist/ssr/Shuffle';
import { FlowArrow } from '@phosphor-icons/react/dist/ssr/FlowArrow';
import { Handshake } from '@phosphor-icons/react/dist/ssr/Handshake';
import { Megaphone } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Footprints } from '@phosphor-icons/react/dist/ssr/Footprints';
import { Barricade } from '@phosphor-icons/react/dist/ssr/Barricade';
import { HandPointing } from '@phosphor-icons/react/dist/ssr/HandPointing';

/**
 * Semantic, kebab-case name → Phosphor glyph. Names mirror intent (not the
 * underlying Phosphor component) so call sites read naturally.
 */
const ICONS = {
  activity: Pulse,
  'alert-circle': WarningCircle,
  'alert-triangle': Warning,
  aperture: Aperture,
  'arrow-down-to-line': ArrowLineDown,
  'arrow-left': ArrowLeft,
  'arrow-left-right': ArrowsLeftRight,
  'arrow-right': ArrowRight,
  'arrow-up-to-line': ArrowLineUp,
  bell: Bell,
  brain: Brain,
  calendar: CalendarBlank,
  camera: Camera,
  check: Check,
  'check-circle': CheckCircle,
  'chevron-down': CaretDown,
  'chevron-left': CaretLeft,
  'chevron-right': CaretRight,
  'chevron-up': CaretUp,
  circle: Circle,
  'circle-dot': RadioButton,
  'clipboard-check': ClipboardText,
  clock: Clock,
  close: X,
  code: Code,
  coins: Coins,
  copy: Copy,
  crown: Crown,
  cursor: Cursor,
  'door-open': DoorOpen,
  download: DownloadSimple,
  'external-link': ArrowSquareOut,
  eye: Eye,
  'eye-off': EyeSlash,
  'file-check': FileText,
  'file-code': FileCode,
  'file-text': FileText,
  'folder-cog': Folder,
  fullscreen: CornersOut,
  'git-branch-plus': GitBranch,
  'grip-vertical': DotsSixVertical,
  hand: Hand,
  heart: Heart,
  image: Image,
  'image-up': ImageSquare,
  info: Info,
  layers: Stack,
  layout: Layout,
  'layout-grid': SquaresFour,
  library: Books,
  lightbulb: Lightbulb,
  link: Link,
  list: List,
  'list-checks': ListChecks,
  'list-ordered': ListNumbers,
  'locate-fixed': Crosshair,
  lock: Lock,
  'log-out': SignOut,
  'magic-wand': MagicWand,
  map: MapTrifold,
  maximize: CornersOut,
  menu: List,
  merge: GitMerge,
  'message-square': ChatCentered,
  minus: Minus,
  monitor: Monitor,
  moon: Moon,
  'more-vertical': DotsThreeVertical,
  'mouse-pointer': Cursor,
  network: TreeStructure,
  palette: Palette,
  'panel-left': SidebarSimple,
  pause: Pause,
  pencil: Pencil,
  'pencil-line': PencilSimpleLine,
  play: Play,
  plus: Plus,
  'plus-circle': PlusCircle,
  presentation: Presentation,
  printer: Printer,
  redo: ArrowClockwise,
  refresh: ArrowsClockwise,
  rocket: Rocket,
  'rotate-ccw': ArrowCounterClockwise,
  save: FloppyDisk,
  search: MagnifyingGlass,
  send: PaperPlaneTilt,
  settings: Gear,
  share: ShareNetwork,
  shield: Shield,
  'skip-forward': SkipForward,
  smile: Smiley,
  sparkles: Sparkle,
  spinner: CircleNotch,
  square: Square,
  'square-user': UserSquare,
  star: Star,
  sun: Sun,
  target: Target,
  'thumbs-up': ThumbsUp,
  timer: Timer,
  trash: Trash,
  'trending-up': TrendUp,
  undo: ArrowCounterClockwise,
  unlink: LinkBreak,
  upload: UploadSimple,
  user: User,
  'user-circle': UserCircle,
  'user-plus': UserPlus,
  users: Users,
  vote: Checks,
  zap: Lightning,
  'x-circle': XCircle,
  'book-open': BookOpen,
  table: Table,
  replace: Swap,
  tag: Tag,
  ban: Prohibit,
  'message-square-x': ChatCenteredSlash,
  'help-circle': Question,
  briefcase: Briefcase,
  flag: Flag,
  'mouse-pointer-click': CursorClick,
  package: Package,
  route: Path,
  mail: Envelope,
  highlighter: Highlighter,
  type: TextT,
  eraser: Eraser,
  diamond: Diamond,
  'message-circle': ChatCircle,
  stamp: Stamp,
  'person-standing': PersonSimple,
  smartphone: DeviceMobile,
  car: Car,
  'app-window': AppWindow,
  'messages-square': Chats,
  'align-left': TextAlignLeft,
  'align-center': TextAlignCenter,
  'align-right': TextAlignRight,
  quote: Quotes,
  'bar-chart': ChartBar,
  'grip-horizontal': DotsSix,
  paperclip: Paperclip,
  cloud: Cloud,
  database: Database,
  globe: Globe,
  'credit-card': CreditCard,
  languages: Translate,
  wrench: Wrench,
  shuffle: Shuffle,
  workflow: FlowArrow,
  handshake: Handshake,
  megaphone: Megaphone,
  footprints: Footprints,
  construction: Barricade,
  pointer: HandPointing,
} as const;

export type IconName = keyof typeof ICONS;

export interface IconComponentProps extends Omit<IconProps, 'ref'> {
  name: IconName;
}

export function Icon({ name, weight = 'regular', ...props }: IconComponentProps) {
  const Glyph = ICONS[name];
  return <Glyph weight={weight} {...props} />;
}

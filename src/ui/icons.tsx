import {
  IconBabyCarriage,
  IconBarbell,
  IconBeer,
  IconBolt,
  IconBook,
  IconBus,
  IconCar,
  IconCoffee,
  IconConfetti,
  IconCut,
  IconDeviceMobile,
  IconDots,
  IconGasStation,
  IconGift,
  IconHeartbeat,
  IconHome,
  IconMovie,
  IconMusic,
  IconPaw,
  IconPill,
  IconPizza,
  IconPlane,
  IconPlant2,
  IconSchool,
  IconShirt,
  IconShoppingCart,
  IconToolsKitchen2,
  IconWifi,
  type Icon,
} from '@tabler/icons-react';

/**
 * Pictogrammes disponibles pour les catégories.
 * La clé est stockée en base : ne jamais renommer une clé existante.
 */
export const CATEGORY_ICONS: Record<string, Icon> = {
  cart: IconShoppingCart,
  kitchen: IconToolsKitchen2,
  coffee: IconCoffee,
  pizza: IconPizza,
  beer: IconBeer,
  bus: IconBus,
  car: IconCar,
  gas: IconGasStation,
  plane: IconPlane,
  home: IconHome,
  bolt: IconBolt,
  wifi: IconWifi,
  phone: IconDeviceMobile,
  confetti: IconConfetti,
  movie: IconMovie,
  music: IconMusic,
  sport: IconBarbell,
  heart: IconHeartbeat,
  pill: IconPill,
  shirt: IconShirt,
  cut: IconCut,
  gift: IconGift,
  book: IconBook,
  school: IconSchool,
  baby: IconBabyCarriage,
  pet: IconPaw,
  plant: IconPlant2,
  dots: IconDots,
};

export function CategoryGlyph({ name, size = 22, stroke = 2 }: { name: string; size?: number; stroke?: number }) {
  const Glyph = CATEGORY_ICONS[name] ?? IconDots;
  return <Glyph size={size} stroke={stroke} />;
}

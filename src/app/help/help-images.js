export const HELP_IMAGES = Object.freeze({
  backpack: { src: "/assets/generated/icon_backpack.png", alt: "Backpack", i18n: { da: { alt: "Backpack" } } },
  city: { src: "/assets/generated/icon_city.png", alt: "Valtoria city", i18n: { da: { alt: "Valtoria by" } } },
  map: { src: "/assets/generated/icon_map.png", alt: "World map", i18n: { da: { alt: "Verdenskort" } } },
  wilderness: { src: "/assets/generated/icon_wilderness.png", alt: "Wilderness", i18n: { da: { alt: "Wilderness" } } },
  hero: { src: "/assets/generated/ui_hero.png", alt: "Hero panel", i18n: { da: { alt: "Hero panel" } } },
  lorebook: { src: "/assets/generated/lorebook.png", alt: "Lorebook", i18n: { da: { alt: "Lorebook" } } },
  blacksmith: { src: "/assets/generated/house/house_blacksmith.png", alt: "Blacksmith", i18n: { da: { alt: "Smedje" } } },
  bank: { src: "/assets/generated/house/house_bank.png", alt: "Bank", i18n: { da: { alt: "Bank" } } },
  inn: { src: "/assets/generated/house/house_inn.png", alt: "Inn", i18n: { da: { alt: "Kro" } } },
  sanctuary: { src: "/assets/generated/house/house_sanctury.png", alt: "Sanctuary", i18n: { da: { alt: "Sanctuary" } } },
  library: { src: "/assets/generated/house/house_library.png", alt: "Library", i18n: { da: { alt: "Bibliotek" } } },
  cityMob: { src: "/assets/generated/achievement/defenderofthecity.png", alt: "City defender", i18n: { da: { alt: "Byens forsvarer" } } },
  ironBar: { src: "/assets/generated/item/item_res_ironbar.png", alt: "Iron Bar", i18n: { da: { alt: "Jernbar" } } },
  readables: { src: "/assets/generated/item/item_book_lore.png", alt: "Readable book", i18n: { da: { alt: "Læsbar bog" } } },
});

export function helpImage(id) {
  return HELP_IMAGES[id] ?? null;
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function flattenText(value, output = []) {
  if (typeof value === "string" || typeof value === "number") output.push(String(value));
  else if (Array.isArray(value)) value.forEach((entry) => flattenText(entry, output));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => flattenText(entry, output));
  return output;
}

export function localizedHelpBlocks(topic, language, localize) {
  const baseBlocks = Array.isArray(topic?.blocks) ? topic.blocks : [];
  const selectedBlocks = localize(topic, "blocks", { language });
  const translations = Array.isArray(selectedBlocks) ? selectedBlocks : [];
  return baseBlocks.map((block, index) => ({
    ...block,
    i18n: {
      ...(block.i18n ?? {}),
      [language]: translations[index] ?? {},
    },
  }));
}

export function helpTopicSearchText(topic, language, localize) {
  const localized = [
    localize(topic, "title", { language }),
    localize(topic, "summary", { language }),
    localize(topic, "keywords", { language }),
    localize(topic, "blocks", { language }),
  ];
  const englishFallback = [
    localize(topic, "title", { language: "en" }),
    localize(topic, "summary", { language: "en" }),
    localize(topic, "keywords", { language: "en" }),
  ];
  return normalizeSearchValue(flattenText([...localized, ...englishFallback]).join(" "));
}

export function searchHelpSections(sections, query, language, localize) {
  const terms = normalizeSearchValue(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return sections;
  return sections.map((section) => ({
    ...section,
    topics: section.topics.filter((topic) => {
      const haystack = helpTopicSearchText(topic, language, localize);
      return terms.every((term) => haystack.includes(term));
    }),
  })).filter((section) => section.topics.length > 0);
}

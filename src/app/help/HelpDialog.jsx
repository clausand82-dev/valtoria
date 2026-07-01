import React, { useEffect, useMemo, useState } from "react";
import historyMarkdown from "../../../history.md?raw";
import { useLocalization } from "../../i18n/index.js";
import { HELP_SECTIONS, HELP_TOPIC_BY_ID, helpTemplateParams } from "./help-content.js";
import { helpImage } from "./help-images.js";
import { localizedHelpBlocks, searchHelpSections } from "./help-search.js";
import { MarkdownDocument } from "./MarkdownDocument.jsx";
import "./help.css";

const HISTORY_TOPIC_ID = "history";

function HelpImage({ imageId, localize, caption = "" }) {
  const [failed, setFailed] = useState(false);
  const image = helpImage(imageId);
  if (!image || failed) return null;
  return (
    <figure className="help-image">
      <img src={image.src} alt={localize(image, "alt")} onError={() => setFailed(true)} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function HelpBlock({ block, localize, renderTemplate, params, onOpenTopic, t }) {
  const value = (field) => renderTemplate(localize(block, field), params);
  const values = (field) => {
    const result = localize(block, field);
    return Array.isArray(result) ? result : [];
  };
  const title = value("title");

  switch (block.type) {
    case "heading":
      return <h3 className="help-block-heading">{value("text") || title}</h3>;
    case "paragraph":
      return <p className="help-paragraph">{value("text")}</p>;
    case "smallNote":
      return <p className="help-small-note">{value("text")}</p>;
    case "tip":
    case "warning":
      return <aside className={`help-callout ${block.type}`}><b>{title}</b><p>{value("text")}</p></aside>;
    case "image":
      return <HelpImage imageId={localize(block, "image") || block.image} localize={localize} caption={value("caption")} />;
    case "steps":
      return <section className="help-block"><h3>{title}</h3><ol>{values("items").map((item, index) => <li key={`${index}:${item}`}>{renderTemplate(item, params)}</li>)}</ol></section>;
    case "list":
      return <section className="help-block"><h3>{title}</h3><ul>{values("items").map((item, index) => <li key={`${index}:${item}`}>{renderTemplate(item, params)}</li>)}</ul></section>;
    case "statList":
      return <section className="help-block"><h3>{title}</h3><div className="help-stat-list">{values("items").map((item, index) => <div key={`${index}:${item?.stat}`}><b>{renderTemplate(item?.stat, params)}</b><span>{renderTemplate(item?.text, params)}</span></div>)}</div></section>;
    case "keyValue":
      return <section className="help-block"><h3>{title}</h3><dl className="help-key-values">{values("items").map((item, index) => <React.Fragment key={`${index}:${item?.key}`}><dt>{renderTemplate(item?.key, params)}</dt><dd>{renderTemplate(item?.value, params)}</dd></React.Fragment>)}</dl></section>;
    case "recipe":
      return <section className="help-block help-recipe"><h3>{title}</h3><div><b>{t("help.recipeOutput")}</b><span>{value("output")}</span></div><div><b>{t("help.recipeMaterials")}</b><span>{value("materials")}</span></div><div><b>{t("help.recipeStation")}</b><span>{value("station")}</span></div></section>;
    case "faq":
      return <section className="help-block"><h3>{title}</h3><div className="help-faq">{values("items").map((item, index) => <details key={`${index}:${item?.q}`}><summary>{renderTemplate(item?.q, params)}</summary><p>{renderTemplate(item?.a, params)}</p></details>)}</div></section>;
    case "related":
      return <section className="help-block"><h3>{title}</h3><div className="help-related">{values("topicIds").map((id) => { const topic = HELP_TOPIC_BY_ID[id]; return topic ? <button type="button" key={id} onClick={() => onOpenTopic(id)}>{localize(topic, "title")}</button> : null; })}</div></section>;
    case "table": {
      const columns = values("columns");
      const rows = values("rows");
      return <section className="help-block"><h3>{title}</h3><div className="help-table-wrap"><table><thead><tr>{columns.map((column, index) => <th key={`${index}:${column}`}>{renderTemplate(column, params)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderTemplate(cell, params)}</td>)}</tr>)}</tbody></table></div></section>;
    }
    default:
      return null;
  }
}

export function HelpDialog({ topicId = null, onClose }) {
  const { language, localize, renderTemplate, t } = useLocalization();
  const initialTopicId = HELP_TOPIC_BY_ID[topicId] ? topicId : HELP_SECTIONS[0]?.topics[0]?.id;
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId);
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState(() => new Set([HELP_SECTIONS[0]?.id]));
  const params = useMemo(() => helpTemplateParams(language, localize), [language, localize]);
  const filteredSections = useMemo(
    () => searchHelpSections(HELP_SECTIONS, query, language, localize),
    [language, localize, query],
  );
  const historySelected = selectedTopicId === HISTORY_TOPIC_ID;
  const selectedTopic = historySelected ? null : (HELP_TOPIC_BY_ID[selectedTopicId] ?? HELP_SECTIONS[0]?.topics[0]);
  const selectedBlocks = selectedTopic ? localizedHelpBlocks(selectedTopic, language, localize) : [];

  useEffect(() => {
    if (!topicId || !HELP_TOPIC_BY_ID[topicId]) return;
    setSelectedTopicId(topicId);
    const section = HELP_SECTIONS.find((entry) => entry.topics.some((topic) => topic.id === topicId));
    if (section) setExpandedSections((current) => new Set([...current, section.id]));
  }, [topicId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query) return;
    setExpandedSections(new Set(filteredSections.map((section) => section.id)));
  }, [filteredSections, query]);

  const selectTopic = (id) => {
    setSelectedTopicId(id);
    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 760px)").matches) setQuery("");
  };
  const toggleSection = (id) => setExpandedSections((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-dialog-title">
        <header className="help-dialog-header">
          <div><span className="help-kicker">{t("help.contents")}</span><h2 id="help-dialog-title">{t("panel.help.title")}</h2></div>
          <button type="button" className="help-close" aria-label={t("ui.close")} onClick={onClose}>×</button>
        </header>
        <div className="help-layout">
          <nav className="help-sidebar" aria-label={t("help.contents")}>
            <label className="help-search">
              <span>{t("help.searchLabel")}</span>
              <input autoFocus type="search" value={query} placeholder={t("placeholder.searchHelp")} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="help-menu">
              {filteredSections.map((section) => {
                const expanded = expandedSections.has(section.id) || Boolean(query);
                return <div className="help-menu-section" key={section.id}>
                  <button type="button" className="help-section-toggle" aria-expanded={expanded} onClick={() => toggleSection(section.id)}><span>{localize(section, "title")}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
                  {expanded && <div className="help-topic-links">{section.topics.map((topic) => <button type="button" className={topic.id === selectedTopicId ? "active" : ""} key={topic.id} onClick={() => selectTopic(topic.id)}>{localize(topic, "title")}</button>)}</div>}
                </div>;
              })}
              {!filteredSections.length && <p className="help-no-results">{t("help.noResults")}</p>}
            </div>
            <button
              type="button"
              className={`help-history-link ${historySelected ? "active" : ""}`}
              onClick={() => selectTopic(HISTORY_TOPIC_ID)}
            >
              {t("help.history")}
            </button>
          </nav>
          <article className="help-content" key={`${language}:${historySelected ? HISTORY_TOPIC_ID : selectedTopic?.id}`}>
            {historySelected && <>
              <header className="help-topic-header help-history-header">
                <div><span className="help-kicker">Valtoria</span><h1>{t("help.history")}</h1></div>
              </header>
              <MarkdownDocument source={historyMarkdown} />
            </>}
            {selectedTopic && <>
              <header className="help-topic-header"><div><span className="help-kicker">{localize(HELP_SECTIONS.find((section) => section.topics.includes(selectedTopic)), "title")}</span><h1>{renderTemplate(localize(selectedTopic, "title"), params)}</h1><p>{renderTemplate(localize(selectedTopic, "summary"), params)}</p></div>{selectedTopic.image && <HelpImage imageId={selectedTopic.image} localize={localize} />}</header>
              <div className="help-blocks">{selectedBlocks.map((block, index) => <HelpBlock key={`${selectedTopic.id}:${index}`} block={block} localize={localize} renderTemplate={renderTemplate} params={params} onOpenTopic={selectTopic} t={t} />)}</div>
            </>}
          </article>
        </div>
      </section>
    </div>
  );
}

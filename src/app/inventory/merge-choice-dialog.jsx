import React from "react";
import { potionDefById } from "../../game/config/potion-config.js";
import { READABLE_DEF_BY_ID } from "../../game/config/readable-config.js";
import { RESOURCE_DEFS } from "../../game/config/resource-config.js";
import { InventoryIcon } from "../ui/icons.jsx";
import { useLocalization } from "../../i18n/index.js";

export function MergeChoiceDialog({ choice, onCancel, onChoose }) {
  const { t } = useLocalization();
  const mergeTitle = choice?.type === "readable-choice" ? "Choose assembled item" : "Choose merge result";
  const mergeBody = choice?.type === "readable-choice"
    ? "These fragments can assemble more than one item."
    : "This resource can be used in more than one recipe.";
  return (
    <div className="confirm-backdrop" role="presentation">
      <section className="confirm-dialog merge-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="merge-choice-title">
        <h2 id="merge-choice-title">{mergeTitle}</h2>
        <p>{mergeBody}</p>
        <div className="merge-choice-list">
          {choice.options.map((option) => (
            <button type="button" className="merge-choice-option" key={option.output} onClick={() => onChoose(option.output)}>
              <InventoryIcon iconIndex={option.iconIndex} iconSheet={option.iconSheet} iconUrl={option.iconUrl} />
              <span>
                <b>{option.name}</b>
                <em>{formatMergeInputs(option.inputs, choice?.type)}</em>
              </span>
            </button>
          ))}
        </div>
        <div>
          <button type="button" onClick={onCancel}>{t("ui.cancel")}</button>
        </div>
      </section>
    </div>
  );
}

function formatMergeInputs(inputs, type = "resource-choice") {
  return Object.entries(inputs)
    .map(([resourceId, count]) => {
      if (type === "readable-choice") return `${count} ${READABLE_DEF_BY_ID[resourceId]?.title ?? resourceId}`;
      if (type === "potion-choice") return `${count} ${potionDefById(resourceId)?.name ?? RESOURCE_DEFS[resourceId]?.name ?? resourceId}`;
      return `${count} ${RESOURCE_DEFS[resourceId]?.name ?? resourceId}`;
    })
    .join(" + ");
}

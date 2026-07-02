import React from "react";
import { potionDefById } from "../../game/config/potion-config.js";
import { READABLE_DEF_BY_ID } from "../../game/config/readable-config.js";
import { RESOURCE_DEFS } from "../../game/config/resource-config.js";
import { InventoryIcon } from "../ui/icons.jsx";
import { useLocalization } from "../../i18n/index.js";

export function MergeChoiceDialog({ choice, onCancel, onChoose }) {
  const { localize, t } = useLocalization();
  const mergeTitle = choice?.type === "readable-choice" ? t("inventory.mergeChoice.readableTitle") : t("inventory.mergeChoice.title");
  const mergeBody = choice?.type === "readable-choice"
    ? t("inventory.mergeChoice.readableBody")
    : t("inventory.mergeChoice.body");
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
                <em>{formatMergeInputs(option.inputs, choice?.type, localize)}</em>
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

function formatMergeInputs(inputs, type = "resource-choice", localize = null) {
  return Object.entries(inputs)
    .map(([resourceId, count]) => {
      if (type === "readable-choice") return `${count} ${localize?.(READABLE_DEF_BY_ID[resourceId], "title") || resourceId}`;
      if (type === "potion-choice") {
        const def = potionDefById(resourceId) ?? RESOURCE_DEFS[resourceId];
        return `${count} ${localize?.(def, "name") || resourceId}`;
      }
      return `${count} ${localize?.(RESOURCE_DEFS[resourceId], "name") || resourceId}`;
    })
    .join(" + ");
}

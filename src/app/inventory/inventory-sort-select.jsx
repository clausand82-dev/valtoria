import React from "react";
import { useLocalization } from "../../i18n/index.js";
import { INVENTORY_SORT_OPTIONS } from "../../game/inventory-sort.js";

export function InventorySortSelect({ onSort, className = "" }) {
  const { t } = useLocalization();
  return (
    <label className={`inventory-sort-select ${className}`}>
      <span>{t("ui.sort")}</span>
      <select
        aria-label={t("ui.sort")}
        defaultValue=""
        onChange={(event) => {
          if (!event.target.value) return;
          onSort?.(event.target.value);
          event.target.value = "";
        }}
      >
        <option value="" disabled>{t("inventory.choose")}</option>
        {INVENTORY_SORT_OPTIONS.map((option) => (
          <option value={option.id} key={option.id}>{t(`inventory.sort.${option.id}`)}</option>
        ))}
      </select>
    </label>
  );
}

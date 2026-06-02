import React from "react";
import { INVENTORY_SORT_OPTIONS } from "../../game/inventory-sort.js";

export function InventorySortSelect({ onSort, className = "" }) {
  return (
    <label className={`inventory-sort-select ${className}`}>
      <span>Sorter</span>
      <select
        aria-label="Sorter inventory"
        defaultValue=""
        onChange={(event) => {
          if (!event.target.value) return;
          onSort?.(event.target.value);
          event.target.value = "";
        }}
      >
        <option value="" disabled>Vaelg...</option>
        {INVENTORY_SORT_OPTIONS.map((option) => (
          <option value={option.id} key={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

import type { Batch, Block, BlockData, JsonValue } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Pending timestamp";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function shortHash(hash?: string | null, size = 10) {
  if (!hash) {
    return "Unavailable";
  }

  if (hash.length <= size * 2) {
    return hash;
  }

  return `${hash.slice(0, size)}...${hash.slice(-size)}`;
}

export function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStringValue(data: BlockData, keys: string[]) {
  for (const key of keys) {
    const candidate = data[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function getBatchFallback(batchId: string, timestamp?: string | null): Batch {
  return {
    batch_id: batchId,
    crop_name: "Recorded agricultural batch",
    farmer_name: "Origin recorded",
    farm_location: "Location recorded",
    created_at: timestamp ?? null
  };
}

function getRenderableValue(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return value.map(getRenderableValue).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function getBlockActor(block: Block, batch: Batch) {
  return (
    getStringValue(block.data, ["actor", "handled_by", "owner", "operator", "farmer_name"]) ??
    (block.index === 0 ? batch.farmer_name : "Supply chain operator")
  );
}

export function getBlockLocation(block: Block, batch: Batch) {
  return (
    getStringValue(block.data, ["location", "warehouse", "destination", "farm_location", "market"]) ??
    (block.index === 0 ? batch.farm_location : "Location logged")
  );
}

export function getBlockHeadline(block: Block) {
  return toTitleCase(block.event_type);
}

export function getBlockNarrative(block: Block) {
  const preferred =
    getStringValue(block.data, ["note", "description", "summary", "status"]) ??
    getStringValue(block.data, ["temperature", "condition", "vehicle_id", "shipment_id"]);

  if (preferred) {
    return preferred;
  }

  const entries = Object.entries(block.data)
    .slice(0, 2)
    .map(([key, value]) => `${toTitleCase(key)}: ${getRenderableValue(value)}`);

  return entries.join(" • ") || "Event recorded on-chain.";
}

export function groupBlocksByBatch(blocks: Block[]) {
  return blocks.reduce<Record<string, Block[]>>((accumulator, block) => {
    const collection = accumulator[block.batch_id] ?? [];
    collection.push(block);
    accumulator[block.batch_id] = collection;
    return accumulator;
  }, {});
}

export function deriveBatchFromBlocks(batchId: string, blocks: Block[]): Batch | null {
  if (blocks.length === 0) {
    return null;
  }

  const genesisBlock =
    blocks.find((block) => block.index === 0) ??
    [...blocks].sort((left, right) => left.index - right.index)[0];

  if (!genesisBlock) {
    return getBatchFallback(batchId, blocks[0]?.timestamp ?? null);
  }

  return {
    batch_id: getStringValue(genesisBlock.data, ["batch_id"]) ?? batchId,
    crop_name: getStringValue(genesisBlock.data, ["crop_name", "crop", "product_name", "product"]) ?? "Recorded agricultural batch",
    farmer_name: getStringValue(genesisBlock.data, ["farmer_name", "farmer", "producer", "actor"]) ?? "Origin recorded",
    farm_location:
      getStringValue(genesisBlock.data, ["farm_location", "location", "origin", "source_location"]) ?? "Location recorded",
    created_at: genesisBlock.timestamp ?? null
  };
}

export function mergeBatchSources(batchRows: Batch[], blockRows: Block[]) {
  const merged = new Map(batchRows.map((batch) => [batch.batch_id, batch]));
  const blocksByBatch = groupBlocksByBatch(blockRows);

  for (const [batchId, blocks] of Object.entries(blocksByBatch)) {
    if (!merged.has(batchId)) {
      const derivedBatch = deriveBatchFromBlocks(batchId, blocks);

      if (derivedBatch) {
        merged.set(batchId, derivedBatch);
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) => left.crop_name.localeCompare(right.crop_name));
}

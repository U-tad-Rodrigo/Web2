import type { Schema, HydratedDocument } from 'mongoose';

export interface SoftDeleteFields {
  deleted: boolean;
}

export interface SoftDeleteMethods {
  softDelete(): Promise<HydratedDocument<unknown>>;
  restore():    Promise<HydratedDocument<unknown>>;
}

/**
 * Plugin Mongoose: añade flag `deleted` (con índice) + métodos
 * `softDelete()` y `restore()`. Los controllers siguen siendo los
 * responsables de filtrar `{ deleted: false }` en sus queries — el
 * plugin no toca los hooks pre-find para no sorprender a quien lee.
 */
export const softDeletePlugin = (schema: Schema): void => {
  schema.add({
    deleted: { type: Boolean, default: false, index: true },
  });

  schema.method('softDelete', async function (this: HydratedDocument<SoftDeleteFields>) {
    this.deleted = true;
    return this.save();
  });

  schema.method('restore', async function (this: HydratedDocument<SoftDeleteFields>) {
    this.deleted = false;
    return this.save();
  });
};

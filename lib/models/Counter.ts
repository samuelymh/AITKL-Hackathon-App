import mongoose, { Schema, Model } from "mongoose";

/**
 * Counter interface for atomic sequence generation
 * Ensures unique encounter numbers without race conditions
 */
interface ICounter {
  _id: string;
  seq: number;
}

interface CounterModel extends Model<ICounter> {
  increment(id: string): Promise<number>;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

/**
 * Atomic increment operation for sequence generation
 * Uses findOneAndUpdate with upsert to avoid race conditions
 */
counterSchema.statics.increment = async function (id: string): Promise<number> {
  const result = await this.findOneAndUpdate({ _id: id }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return result?.seq ?? 1;
};

const Counter =
  (mongoose.models.Counter as unknown as CounterModel) ||
  mongoose.model<ICounter, CounterModel>("Counter", counterSchema);

export default Counter;

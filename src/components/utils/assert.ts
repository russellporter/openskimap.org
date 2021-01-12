export default function assert(condition: any, msg: string): asserts condition {
  if (!condition) {
    throw msg;
  }
}

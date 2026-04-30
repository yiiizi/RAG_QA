let _counter = 0;
export function v4(): string {
  _counter += 1;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${_counter}`;
}

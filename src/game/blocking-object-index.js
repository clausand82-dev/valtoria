// Runtime-only metadata: never serialized into saves or subregion snapshots.
const indexes = new WeakMap();
const blockingObservers = new WeakMap();

function observeBlocking(object, state) {
  if (!object || typeof object !== "object") return;
  let observers = blockingObservers.get(object);
  if (!observers) {
    observers = new Set();
    let blocking = object.blocking;
    Object.defineProperty(object, "blocking", {
      enumerable: true,
      configurable: true,
      get: () => blocking,
      set(value) {
        if (value === blocking) return;
        blocking = value;
        for (const observer of observers) observer.dirty = true;
      },
    });
    blockingObservers.set(object, observers);
  }
  observers.add(state);
  state.observed.add(object);
}

export function getBlockingObjects(chunk) {
  let state = indexes.get(chunk);
  if (!state) {
    state = { dirty: true, blockers: [], observed: new Set(), rebuilds: 0 };
    indexes.set(chunk, state);
    let objects;
    const replace = (entries) => {
      for (const object of state.observed) blockingObservers.get(object)?.delete(state);
      state.observed.clear();
      for (const object of entries) observeBlocking(object, state);
      // Keep the public array API, including splice, indexed replacement and length.
      objects = new Proxy(entries, {
        set(target, key, value) {
          if (key !== "length") observeBlocking(value, state);
          state.dirty = true;
          return Reflect.set(target, key, value);
        },
        deleteProperty(target, key) {
          state.dirty = true;
          return Reflect.deleteProperty(target, key);
        },
      });
      state.dirty = true;
    };
    const initial = chunk.objects ?? [];
    Object.defineProperty(chunk, "objects", {
      enumerable: true,
      configurable: true,
      get: () => objects,
      set: replace,
    });
    replace(initial);
  }
  if (state.dirty) {
    // Drop subscriptions for removed objects; positions/radii remain live references.
    const current = new Set(chunk.objects);
    for (const object of state.observed) {
      if (current.has(object)) continue;
      blockingObservers.get(object)?.delete(state);
      state.observed.delete(object);
    }
    state.blockers = chunk.objects.filter((object) => object?.blocking);
    state.dirty = false;
    state.rebuilds += 1;
  }
  return state.blockers;
}

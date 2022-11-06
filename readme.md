# comlink-electron-main

An port of the popular library [comlink](https://github.com/GoogleChromeLabs/comlink) by Surma for electron render process.
A compatible implementation for the main process is available at [comlink-electron-main](https://github.com/IIIMADDINIII/comlink-electron-main).

```
$ npm install --save comlink-electron-main
```

## Differences to comlink
Because of some limitations and differences in api, comlink is not compatible with electron.
Electron only supports MessagePorts to be transfererd between main and renderer Process.
So because at the moment it is not checked, if the MessagePort is connected with the main Process, only MessagePort is allowed in transferables.

## API

### `comlink.wrap(Message)` and `Comlink.expose(value, endpoint?)`

Comlink’s goal is to make _exposed_ values from one thread available in the other. `expose` exposes `value` on `endpoint`, where `endpoint` is a [`postMessage`-like interface][endpoint].

`wrap` wraps the _other_ end of the message channel and returns a proxy. The proxy will have all properties and functions of the exposed value, but access and invocations are inherently asynchronous. This means that a function that returns a number will now return _a promise_ for a number. **As a rule of thumb: If you are using the proxy, put `await` in front of it.** Exceptions will be caught and re-thrown on the other side.

### `Comlink.transfer(value, transferables)` and `Comlink.proxy(value)`

By default, every function parameter, return value and object property value is copied, in the sense of [structured cloning]. Structured cloning can be thought of as deep copying, but has some limitations. See [this table][structured clone table] for details.

If you want a value to be transferred rather than copied — provided the value is or contains a [`Transferable`][transferable] — you can wrap the value in a `transfer()` call and provide a list of transferable values:

```js
const data = new Uint8Array([1, 2, 3, 4, 5]);
await myProxy.someFunction(Comlink.transfer(data, [data.buffer]));
```

Lastly, you can use `Comlink.proxy(value)`. When using this Comlink will neither copy nor transfer the value, but instead send a proxy. Both threads now work on the same value. This is useful for callbacks, for example, as functions are neither structured cloneable nor transferable.

```js
myProxy.onready = Comlink.proxy((data) => {
  /* ... */
});
```

### Transfer handlers and event listeners

It is common that you want to use Comlink to add an event listener, where the event source is on another thread:

```js
button.addEventListener("click", myProxy.onClick.bind(myProxy));
```

While this won’t throw immediately, `onClick` will never actually be called. This is because [`Event`][event] is neither structured cloneable nor transferable. As a workaround, Comlink offers transfer handlers.

Each function parameter and return value is given to _all_ registered transfer handlers. If one of the event handler signals that it can process the value by returning `true` from `canHandle()`, it is now responsible for serializing the value to structured cloneable data and for deserializing the value. A transfer handler has be set up on _both sides_ of the message channel. Here’s an example transfer handler for events:

```js
Comlink.transferHandlers.set("EVENT", {
  canHandle: (obj) => obj instanceof Event,
  serialize: (ev) => {
    return [
      {
        target: {
          id: ev.target.id,
          classList: [...ev.target.classList],
        },
      },
      [],
    ];
  },
  deserialize: (obj) => obj,
});
```

Note that this particular transfer handler won’t create an actual `Event`, but just an object that has the `event.target.id` and `event.target.classList` property. Often, this is enough. If not, the transfer handler can be easily augmented to provide all necessary data.

### `Comlink.releaseProxy`

Every proxy created by Comlink has the `[releaseProxy]` method.
Calling it will detach the proxy and the exposed object from the message channel, allowing both ends to be garbage collected.

```js
const proxy = Comlink.wrap(port);
// ... use the proxy ...
proxy[Comlink.releaseProxy]();
```

### `Comlink.createEndpoint`

Every proxy created by Comlink has the `[createEndpoint]` method.
Calling it will return a new `MessagePort`, that has been hooked up to the same object as the proxy that `[createEndpoint]` has been called on.

```js
const port = myProxy[Comlink.createEndpoint]();
const newProxy = Comlink.wrap(port);
```

### `Comlink.windowEndpoint(window, context = self, targetOrigin = "*")`

Windows and Web Workers have a slightly different variants of `postMessage`. If you want to use Comlink to communicate with an iframe or another window, you need to wrap it with `windowEndpoint()`.

`window` is the window that should be communicate with. `context` is the `EventTarget` on which messages _from_ the `window` can be received (often `self`). `targetOrigin` is passed through to `postMessage` and allows to filter messages by origin. For details, see the documentation for [`Window.postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

For a usage example, take a look at the non-worker examples in the `docs` folder.

## TypeScript

Comlink does provide TypeScript types. When you `expose()` something of type `T`, the corresponding `wrap()` call will return something of type `Comlink.Remote<T>`. While this type has been battle-tested over some time now, it is implemented on a best-effort basis. There are some nuances that are incredibly hard if not impossible to encode correctly in TypeScript’s type system. It _may_ sometimes be necessary to force a certain type using `as unknown as <type>`.

## Node

Comlink works with Node’s [`worker_threads`][worker_threads] module. Take a look at the example in the `docs` folder.

[webworker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[umd]: https://github.com/umdjs/umd
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[messageport]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[examples]: https://github.com/GoogleChromeLabs/comlink/tree/master/docs/examples
[dist]: https://github.com/GoogleChromeLabs/comlink/tree/master/dist
[delivrjs]: https://cdn.jsdelivr.net/
[es6 proxy]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
[proxy-polyfill]: https://github.com/GoogleChrome/proxy-polyfill
[endpoint]: src/protocol.ts
[structured cloning]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[structured clone table]: structured-clone-table.md
[event]: https://developer.mozilla.org/en-US/docs/Web/API/Event
[worker_threads]: https://nodejs.org/api/worker_threads.html

## Additional Resources

- [Simplify Web Worker code with Comlink](https://davidea.st/articles/comlink-simple-web-worker)

---

License Apache-2.0
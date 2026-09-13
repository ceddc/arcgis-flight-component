# Contributing

## Run locally

Use the Node.js version required by [package.json](package.json), then:

```sh
npm ci
npm run dev
```

Open the [local demos](http://127.0.0.1:3116/). They need WebGL and access to ArcGIS services.

## Make a change

Keep changes focused on flight, its examples, or documentation. The caller owns the ArcGIS scene; the component must remove only its own resources and restore borrowed camera and navigation state.

The [development guide](docs/development.md) explains where code belongs, which checks to run, and how to debug it. Update usage examples or API documentation when public behavior changes.

For code changes, run `npm run verify`. Also run `npm run test:browser` and inspect the affected demo when rendering, lifecycle, input, or UI changes. For documentation-only changes, check links and run `npm run docs:build`.

## Submit

Explain the problem, the change, and the checks you ran. For bugs, include the SDK version, a minimal reproduction, and the error message. Remove credentials and private scene URLs.

Contributions use the [MIT license](LICENSE).
